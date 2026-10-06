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
  return undefined
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
    let out = ` motion="${anim}"`
    const delay = el.entrance?.options?.delay
    if (delay && delay > 0) out += ` delay="${delay.toFixed(2)}"`
    return out
  }
  return ''
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
      const attrs: string[] = [`value="${esc(el.content)}"`]
      if (el.fontSize) attrs.push(`size="${Math.round(el.fontSize)}"`)
      if (el.fontWeight) attrs.push(`weight="${el.fontWeight}"`)
      if (typeof el.color === 'string') attrs.push(`color="${el.color}"`)
      if (el.textAlign && el.textAlign !== 'center') attrs.push(`align="${el.textAlign}"`)
      return `<text ${[...attrs, pos, motion, depthAttr].filter(Boolean).join(' ')} />`
    }
    case 'image':
    case 'logo': {
      const attrs: string[] = []
      if (el.type === 'image') attrs.push(`src="${esc(el.src)}"`)
      else attrs.push(`name="${esc(el.logo)}"`)
      if (el.width) attrs.push(`width="${Math.round(el.width)}"`)
      if (el.height) attrs.push(`height="${Math.round(el.height)}"`)
      if (el.type === 'image' && el.borderRadius) attrs.push(`radius="${el.borderRadius}"`)
      return `<${el.type} ${[...attrs, pos, motion, depthAttr].filter(Boolean).join(' ')} />`
    }
    case 'shape': {
      const s = el.shape
      if (s.shapeType === 'rect') {
        const attrs: string[] = []
        if (s.width) attrs.push(`width="${Math.round(s.width)}"`)
        if (s.height) attrs.push(`height="${Math.round(s.height)}"`)
        if (s.borderRadius) attrs.push(`radius="${s.borderRadius}"`)
        if (typeof s.color === 'string') attrs.push(`color="${s.color}"`)
        return `<rect ${[...attrs, pos, motion, depthAttr].filter(Boolean).join(' ')} />`
      }
      if (s.shapeType === 'circle') {
        const attrs: string[] = []
        if (s.width) attrs.push(`diameter="${Math.round(s.width)}"`)
        if (typeof s.color === 'string') attrs.push(`color="${s.color}"`)
        return `<circle ${[...attrs, pos, motion, depthAttr].filter(Boolean).join(' ')} />`
      }
      if (s.shapeType === 'line') {
        const attrs: string[] = []
        if (s.width) attrs.push(`length="${Math.round(s.width)}"`)
        if (typeof s.color === 'string') attrs.push(`color="${s.color}"`)
        if (s.thickness) attrs.push(`thickness="${s.thickness}"`)
        return `<line ${[...attrs, pos, motion, depthAttr].filter(Boolean).join(' ')} />`
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
      attrs.push(`transitionDuration="${scene.transition.duration}"`)
    }
  }
  const bg = bgStr(scene.background)
  if (bg) attrs.push(`background="${bg}"`)
  const leaves: { el: ElementConfig; center: Pt }[] = []
  flatten(scene.elements, null, w, h, leaves)
  const lines: string[] = [`  <scene ${attrs.join(' ')}>`]
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
  const lines: string[] = [
    `<video ${rootAttrs.join(' ')}>`,
    ...config.scenes.map((sc) => serializeScene(sc, w, h)),
    '</video>',
  ]
  return lines.join('\n')
}
