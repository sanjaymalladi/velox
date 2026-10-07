import type {
  VeloxVideoConfig,
  SceneConfig,
  ElementConfig,
  VeloxPosition,
  VeloxColor,
  VeloxGradient,
} from './types'

/**
 * Serialize a compiled `VeloxVideoConfig` back to Velox Markup (VML).
 *
 * Group children are stored (after layout) as absolute offsets relative to
 * their parent group's center, while the group carries its own canvas
 * position. To round-trip pixel-exact, we compose group transforms and emit
 * every leaf at its resolved canvas-absolute position via `x`/`y`. This is the
 * inverse of `createVideoFromMarkup` for the fields the Studio editor mutates
 * (positions, durations, content, scene order).
 *
 * Known limitations: the original theme name and semantic component identity
 * (e.g. `<announcement>`) are not recovered — elements are emitted as their
 * generic primitives (`<text>`, `<image>`, `<rect>`…). Element-level colors
 * are baked, so the visual result is preserved. Non-basic shapes (charts,
 * progress, morphBlob, particles…) are emitted as comments to keep the VML
 * valid.
 */

const SIZE_ALIASES: Record<string, string> = {
  '1080,1920': 'portrait',
  '1920,1080': 'landscape',
  '1080,1080': 'square',
  '720,1280': 'portrait',
  '1280,720': 'landscape',
}

// VML `motion` attribute accepts only this subset.
const MOTION_ATTRS = new Set([
  'none', 'fade', 'cinematic', 'typewriter', 'pop', 'float', 'drawIn', 'growUp',
  'slideIn', 'heroCinematic', 'softReveal', 'driftIn', 'premiumSlide', 'magneticPop',
  'fadeIn', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'zoomIn', 'zoomInBlur', 'flipIn',
  'expandX', 'spring', 'bounceIn', 'glitchIn', 'revealLeft', 'slideUpBlur', 'maskRevealUp', 'tactileIn',
])

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sizeStr(size: [number, number]): string {
  return SIZE_ALIASES[size.join(',')] ?? `${size[0]}x${size[1]}`
}

function bgStr(bg: VeloxColor | VeloxGradient | undefined): string | undefined {
  if (typeof bg === 'string') return bg
  if (bg?.type === 'linear') return `linear(${bg.angle}|${bg.stops.join('|')})`
  return undefined
}

function attr(name: string, value: string | number): string {
  return `${name}="${esc(String(value))}"`
}

type Pt = [number, number]

function namedBase(name: string, w: number, h: number): Pt {
  switch (name) {
    case 'topCenter':
    case 'safeTop':
      return [w / 2, 0]
    case 'bottomCenter':
    case 'safeBottom':
      return [w / 2, h]
    case 'leftCenter':
      return [0, h / 2]
    case 'rightCenter':
      return [w, h / 2]
    default:
      return [w / 2, h / 2]
  }
}

/**
 * Top-level absolute positions are canvas pixels (origin = top-left).
 * Group-child absolute positions are offsets from the parent group's CENTER.
 * We keep the two interpretations separate so flattening composes correctly.
 */
function topLevelCanvas(p: VeloxPosition | undefined, w: number, h: number): Pt {
  if (!p) return [w / 2, h / 2]
  if (p.type === 'absolute') return [p.x, p.y]
  if (p.type === 'center') return [w / 2 + (p.offsetX ?? 0), h / 2 + (p.offsetY ?? 0)]
  const base = namedBase(p.name, w, h)
  return [base[0] + (p.offsetX ?? 0), base[1] + (p.offsetY ?? 0)]
}

/** Offset of an element from its parent group's center (group origin = group center). */
function childOffset(p: VeloxPosition | undefined, w: number, h: number): Pt {
  if (!p) return [0, 0]
  if (p.type === 'absolute') return [p.x, p.y]
  if (p.type === 'center') return [p.offsetX ?? 0, p.offsetY ?? 0]
  const base = namedBase(p.name, w, h)
  return [base[0] + (p.offsetX ?? 0) - w / 2, base[1] + (p.offsetY ?? 0) - h / 2]
}

function motionAttr(el: ElementConfig): string {
  const anim = el.entrance?.animation
  if (anim && MOTION_ATTRS.has(anim)) {
    let out = ` ${attr('motion', anim)}`
    out += ` ${attr('motionDuration', el.entrance!.duration)}`
    const delay = el.entrance?.options?.delay
    if (delay && delay > 0) out += ` ${attr('delay', delay.toFixed(2))}`
    return out
  }
  return ''
}

function baseAnimationAttrs(el: ElementConfig): string[] {
  const attrs: string[] = []
  if (el.opacity !== undefined) attrs.push(attr('opacity', el.opacity))
  if (el.exit) {
    attrs.push(attr('exit', el.exit.animation), attr('exitDuration', el.exit.duration))
    if (el.exit.options?.at !== undefined) attrs.push(attr('exitAt', el.exit.options.at))
  }
  if (el.loop) {
    attrs.push(attr('loop', el.loop.animation))
    if (el.loop.options?.duration !== undefined) attrs.push(attr('loopDuration', el.loop.options.duration))
    if (el.loop.options?.scale !== undefined) attrs.push(attr('loopScale', el.loop.options.scale))
    if (el.loop.options?.distance !== undefined) attrs.push(attr('loopDistance', el.loop.options.distance))
    if (el.loop.options?.speed !== undefined) attrs.push(attr('loopSpeed', el.loop.options.speed))
  }
  return attrs
}

function flatten(
  elements: ElementConfig[],
  parentCenter: Pt | null,
  w: number,
  h: number,
  out: { el: ElementConfig; center: Pt }[],
): void {
  for (const el of elements) {
    const center: Pt =
      parentCenter === null
        ? topLevelCanvas(el.position, w, h)
        : [
            parentCenter[0] + childOffset(el.position, w, h)[0],
            parentCenter[1] + childOffset(el.position, w, h)[1],
          ]
    if (el.type === 'group') flatten(el.children, center, w, h, out)
    else out.push({ el, center })
  }
}

function serializeLeaf(el: ElementConfig, center: Pt): string {
  const pos = ` x="${Math.round(center[0])}" y="${Math.round(center[1])}"`
  const motion = motionAttr(el)
  const depthAttr = el.depth !== undefined ? `depth="${el.depth}"` : ''
  switch (el.type) {
    case 'text': {
      const attrs: string[] = [attr('value', el.content)]
      if (el.fontSize) attrs.push(attr('size', Math.round(el.fontSize)))
      if (el.fontWeight) attrs.push(attr('weight', el.fontWeight))
      if (typeof el.color === 'string') attrs.push(attr('color', el.color))
      if (el.fontFamily) attrs.push(attr('font', el.fontFamily))
      if (el.textAlign && el.textAlign !== 'center') attrs.push(attr('align', el.textAlign))
      if (el.maxWidth) attrs.push(attr('wrap', Math.round(el.maxWidth)))
      if (el.letterSpacing !== undefined) attrs.push(attr('letterSpacing', el.letterSpacing))
      if (el.lineHeight !== undefined) attrs.push(attr('lineHeight', el.lineHeight))
      if (el.maxHeight !== undefined) attrs.push(attr('maxHeight', el.maxHeight))
      if (el.fontStyle === 'italic') attrs.push(attr('italic', 'true'))
      if (el.textTransform === 'uppercase' || el.textTransform === 'lowercase') attrs.push(attr('transform', el.textTransform))
      if (el.gradient) attrs.push(attr('gradient', [el.gradient.angle, ...el.gradient.stops].join('|')))
      if (el.caption) {
        attrs.push(attr('captionStyle', el.caption.style), attr('wordIndex', el.caption.wordIndex))
        attrs.push(attr('cueStart', el.caption.cueStartSec), attr('wordStep', el.caption.wordStepSec))
        attrs.push(attr('totalWords', el.caption.totalWords))
        if (el.caption.accent) attrs.push(attr('captionAccent', el.caption.accent))
      }
      return `<text ${[...attrs, pos, motion, depthAttr, ...baseAnimationAttrs(el)].filter(Boolean).join(' ')} />`
    }
    case 'image':
    case 'logo': {
      const attrs: string[] = []
      if (el.type === 'image') attrs.push(attr('src', el.src))
      else attrs.push(attr('name', el.logo))
      if (el.width) attrs.push(attr('width', Math.round(el.width)))
      if (el.height) attrs.push(attr('height', Math.round(el.height)))
      if (el.type === 'image' && el.borderRadius) attrs.push(attr('radius', el.borderRadius))
      if (el.type === 'image' && el.blur !== undefined) attrs.push(attr('blur', el.blur))
      if (el.type === 'image' && el.brightness !== undefined) attrs.push(attr('brightness', el.brightness))
      if (el.type === 'image' && el.saturate !== undefined) attrs.push(attr('saturate', el.saturate))
      return `<${el.type} ${[...attrs, pos, motion, depthAttr, ...baseAnimationAttrs(el)].filter(Boolean).join(' ')} />`
    }
    case 'shape': {
      const s = el.shape
      if (s.shapeType === 'rect') {
        const attrs: string[] = []
        if (s.width) attrs.push(attr('width', Math.round(s.width)))
        if (s.height) attrs.push(attr('height', Math.round(s.height)))
        if (s.borderRadius) attrs.push(attr('radius', s.borderRadius))
        if (typeof s.color === 'string') attrs.push(attr('color', s.color))
        return `<rect ${[...attrs, pos, motion, depthAttr, ...baseAnimationAttrs(el)].filter(Boolean).join(' ')} />`
      }
      if (s.shapeType === 'circle') {
        const attrs: string[] = []
        if (s.width) attrs.push(attr('diameter', Math.round(s.width)))
        if (typeof s.color === 'string') attrs.push(attr('color', s.color))
        return `<circle ${[...attrs, pos, motion, depthAttr, ...baseAnimationAttrs(el)].filter(Boolean).join(' ')} />`
      }
      if (s.shapeType === 'line') {
        const attrs: string[] = []
        if (s.width) attrs.push(attr('length', Math.round(s.width)))
        if (typeof s.color === 'string') attrs.push(attr('color', s.color))
        if (s.thickness) attrs.push(attr('thickness', s.thickness))
        return `<line ${[...attrs, pos, motion, depthAttr, ...baseAnimationAttrs(el)].filter(Boolean).join(' ')} />`
      }
      return `<!-- skipped shape:${s.shapeType} -->`
    }
    default:
      return `<!-- skipped element:${el.type} -->`
  }
}

function serializeScene(scene: SceneConfig, w: number, h: number): string {
  const attrs: string[] = [`duration="${scene.duration}"`]
  if (scene.camera && scene.camera !== 'none') attrs.push(`camera="${scene.camera}"`)
  if (scene.mood && scene.mood !== 'neutral') attrs.push(`mood="${scene.mood}"`)
  if (scene.transition) {
    attrs.push(`transition="${scene.transition.type}"`)
    if (scene.transition.duration && scene.transition.duration !== 0.55) {
      attrs.push(attr('transitionDuration', scene.transition.duration))
    }
    if (scene.transition.options?.direction) attrs.push(attr('direction', scene.transition.options.direction))
    if (scene.transition.options?.folds) attrs.push(attr('folds', scene.transition.options.folds))
  }
  const bg = bgStr(scene.background)
  if (bg) attrs.push(attr('background', bg))
  if (scene.overlay?.vignetteOpacity !== undefined) attrs.push(attr('vignette', scene.overlay.vignetteOpacity))
  if (scene.overlay?.grainOpacity !== undefined) attrs.push(attr('grain', scene.overlay.grainOpacity))
  const leaves: { el: ElementConfig; center: Pt }[] = []
  flatten(scene.elements, null, w, h, leaves)
  const lines: string[] = [`  <scene ${attrs.join(' ')}>`]
  if (scene.audio) {
    const audioAttrs = [attr('src', scene.audio.src)]
    if (scene.audio.volume !== undefined) audioAttrs.push(attr('volume', scene.audio.volume))
    if (scene.audio.startFrom !== undefined) audioAttrs.push(attr('startFrom', scene.audio.startFrom))
    lines.push(`    <audio ${audioAttrs.join(' ')} />`)
  }
  if (scene.captions) {
    const track = scene.captions
    const captionAttrs = [attr('track', 'true'), attr('style', track.style ?? 'karaoke')]
    if (track.maxWidth !== undefined) captionAttrs.push(attr('maxWidth', track.maxWidth))
    if (track.bottomOffset !== undefined) captionAttrs.push(attr('bottomOffset', track.bottomOffset))
    if (track.accent) captionAttrs.push(attr('accent', track.accent))
    lines.push(`    <captions ${captionAttrs.join(' ')}>`)
    for (const cue of track.cues) {
      const cueAttrs = [attr('at', cue.start)]
      if (cue.end !== undefined) cueAttrs.push(attr('dur', Math.max(0, cue.end - cue.start)))
      cueAttrs.push(attr('text', cue.text))
      lines.push(`      <caption ${cueAttrs.join(' ')} />`)
    }
    lines.push('    </captions>')
  }
  for (const { el, center } of leaves) {
    lines.push('    ' + serializeLeaf(el, center))
  }
  lines.push('  </scene>')
  return lines.join('\n')
}

export function configToMarkup(config: VeloxVideoConfig): string {
  const [w, h] = config.size
  const rootAttrs: string[] = [`size="${sizeStr(config.size)}"`, `fps="${config.fps}"`]
  if (config.motionQuality) rootAttrs.push(`motionQuality="${config.motionQuality}"`)
  if (typeof config.background === 'string' || config.background?.type === 'linear') {
    const rootBg = bgStr(config.background)
    if (rootBg) rootAttrs.push(attr('background', rootBg))
  }
  const themeId = config.themeId ?? (typeof config.theme === 'string' ? config.theme : undefined)
  if (themeId) rootAttrs.push(attr('theme', themeId))
  const lines: string[] = [
    `<video ${rootAttrs.join(' ')}>`,
  ]
  const music = config.audioPlan?.music ?? config.audio
  if (music?.src) {
    const audioAttrs = [attr('src', music.src)]
    if (music.volume !== undefined) audioAttrs.push(attr('volume', music.volume))
    lines.push(`  <audio ${audioAttrs.join(' ')} />`)
  }
  for (const cue of config.audioPlan?.sfx ?? []) {
    const cueAttrs = [attr('name', cue.name), attr('at', cue.at)]
    if (cue.src) cueAttrs.push(attr('src', cue.src))
    if (cue.volume !== undefined) cueAttrs.push(attr('volume', cue.volume))
    lines.push(`  <sfx ${cueAttrs.join(' ')} />`)
  }
  for (const beat of config.audioPlan?.beats ?? []) lines.push(`  <beat ${attr('at', beat)} />`)
  if (config.fx) {
    const fxAttrs = Object.entries(config.fx).filter(([, value]) => value !== undefined).map(([key, value]) => attr(key, value as number))
    lines.push(`  <fx ${fxAttrs.join(' ')} />`)
  }
  lines.push(...config.scenes.map((sc) => serializeScene(sc, w, h)), '</video>')
  return lines.join('\n')
}
