/**
 * VML / config lint — fast checks before a long native render.
 */
import { createVideoFromMarkup, isVeloxMarkup } from './markupCompiler'
import { parseVeloxMarkup, type MarkupLocation, type MarkupNode } from './markup'
import { validateVeloxVideoConfig } from './validation'
import { aestheticsArePreloaded } from './aesthetics/registry'
import { aestheticIds } from './aesthetics/registry'
import { findUnresolvedVariables } from './variables'
import type { VeloxVideoConfig } from './types'
import { getTotalFrames } from './engine/drawFrame'

export interface LintIssue {
  level: 'error' | 'warn'
  code: string
  message: string
  scene?: string
  location?: MarkupLocation
}

export interface LintResult {
  ok: boolean
  issues: LintIssue[]
  config?: VeloxVideoConfig
  sceneCount?: number
  durationSec?: number
}

function push(issues: LintIssue[], issue: LintIssue): void {
  issues.push(issue)
}

export function lintVeloxMarkup(markup: string): LintResult {
  const issues: LintIssue[] = []

  if (!isVeloxMarkup(markup)) {
    push(issues, { level: 'error', code: 'not-vml', message: 'Input is not valid Velox markup (<video> root required).' })
    return { ok: false, issues }
  }

  let root: MarkupNode
  try {
    root = parseVeloxMarkup(markup)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const locMatch = msg.match(/\(line (\d+), column (\d+)\)$/)
    const location = locMatch
      ? { offset: 0, line: Number(locMatch[1]), column: Number(locMatch[2]) }
      : undefined
    push(issues, { level: 'error', code: 'syntax', message: msg, location })
    return { ok: false, issues }
  }

  checkMarkupTypes(root, issues)

  for (const key of findUnresolvedVariables(markup)) {
    push(issues, {
      level: 'warn',
      code: 'unresolved-var',
      message: `Unresolved variable {{${key}}} — set VELox_${key.replace(/[.-]/g, '_').toUpperCase()} or pass at compile time.`,
    })
  }

  const themeId = root.attrs.theme
  if (themeId && aestheticsArePreloaded() && !aestheticIds.includes(themeId)) {
    push(issues, {
      level: 'warn',
      code: 'unknown-theme',
      message: `Theme "${themeId}" is not a registered aesthetic — falling back to legacy palette.`,
    })
  }

  let config: VeloxVideoConfig
  try {
    config = createVideoFromMarkup(markup).config
    validateVeloxVideoConfig(config)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const tagMatch = msg.match(/<([A-Za-z][\w]*)>/)
    const sourceNode = (tagMatch ? findNode(root, tagMatch[1]) : undefined) ?? root
    push(issues, { level: 'error', code: 'compile', message: msg, location: sourceNode.location })
    return { ok: false, issues }
  }

  checkScenes(config, issues)
  checkLayout(config, issues, root.children.filter((child) => child.tag === 'scene').map((scene) => scene.location))

  return finalize(config, issues)
}

/**
 * Lint an already-compiled `VeloxVideoConfig` (e.g. from a `.ts`/`.js` authoring
 * file). Mirrors `lintVeloxMarkup` but skips the markup parse step.
 */
export function lintVeloxConfig(
  config: VeloxVideoConfig,
  options: { themeId?: string } = {},
): LintResult {
  const issues: LintIssue[] = []

  try {
    validateVeloxVideoConfig(config)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    push(issues, { level: 'error', code: 'invalid-config', message: msg })
    return { ok: false, issues }
  }

  const themeId = options.themeId
  if (themeId && !aestheticIds.includes(themeId)) {
    push(issues, {
      level: 'warn',
      code: 'unknown-theme',
      message: `Theme "${themeId}" is not a registered aesthetic — falling back to legacy palette.`,
    })
  }

  checkScenes(config, issues)
  checkLayout(config, issues)

  return finalize(config, issues)
}

function checkScenes(config: VeloxVideoConfig, issues: LintIssue[]): void {
  for (const scene of config.scenes) {
    if (scene.elements.length === 0) {
      push(issues, {
        level: 'warn',
        code: 'empty-scene',
        message: 'Scene has no elements.',
        scene: scene.id,
      })
    }

    const captionStarts: number[] = []
    for (const el of scene.elements) {
      const collectCaption = (e: typeof el): void => {
        if (e.type === 'text' && e.caption?.cueStartSec !== undefined) {
          captionStarts.push(e.caption.cueStartSec)
        }
        if (e.type === 'group') e.children.forEach(collectCaption)
      }
      collectCaption(el)
    }
    if (captionStarts.some((t) => t >= scene.duration)) {
      push(issues, {
        level: 'warn',
        code: 'caption-timing',
        message: 'Caption start is at or after scene end — words may never appear.',
        scene: scene.id,
      })
    }
  }
}

function finalize(config: VeloxVideoConfig, issues: LintIssue[]): LintResult {
  const durationSec = getTotalFrames(config) / config.fps

  return {
    ok: !issues.some((i) => i.level === 'error'),
    issues,
    config,
    sceneCount: config.scenes.length,
    durationSec,
  }
}

const commonAttrs = [
  'x', 'y', 'placement', 'slot', 'motion', 'motionDuration', 'delay', 'depth', 'opacity',
  'exit', 'exitDuration', 'exitAt', 'loop', 'loopDuration', 'loopScale', 'loopDistance', 'loopSpeed',
]
const attrSchemas: Record<string, Set<string>> = {
  video: new Set(['size', 'fps', 'theme', 'background', 'motionQuality', 'music', 'musicVolume']),
  scene: new Set(['duration', 'template', 'camera', 'mood', 'transition', 'transitionDuration', 'direction', 'folds', 'background', 'vignette', 'grain', 'staggerStep', 'layout', 'gap', 'align']),
  center: new Set(['gap', ...commonAttrs]),
  row: new Set(['gap', ...commonAttrs]),
  column: new Set(['gap', ...commonAttrs]),
  stack: new Set(['gap', ...commonAttrs]),
  text: new Set(['value', 'size', 'scale', 'weight', 'color', 'align', 'font', 'letterSpacing', 'lineHeight', 'wrap', 'maxHeight', 'italic', 'transform', 'gradient', 'captionStyle', 'wordIndex', 'cueStart', 'wordStep', 'totalWords', 'captionAccent', ...commonAttrs]),
  image: new Set(['src', 'width', 'height', 'scale', 'radius', 'blur', 'brightness', 'saturate', ...commonAttrs]),
  kicker: new Set(['text', 'color', ...commonAttrs]),
  hero: new Set(['title', 'kicker', 'subtitle', 'color', 'accent', ...commonAttrs]),
  list: new Set(['size', 'color', 'bullet', 'gap', 'wrap', 'stagger', ...commonAttrs]),
  item: new Set(['text']),
  logo: new Set(['name', 'theme', 'size', 'scale', ...commonAttrs]),
  logoLockup: new Set(['name', 'label', 'theme', 'logoSize', 'textSize', 'scale', 'gap', 'color', ...commonAttrs]),
  rect: new Set(['width', 'height', 'radius', 'scale', 'color', 'fill', 'stroke', 'gap', ...commonAttrs]),
  stock: new Set(['provider', 'query', 'width', 'height', 'scale', 'radius', 'fit', ...commonAttrs]),
  stockVideo: new Set(['provider', 'query', 'radius', ...commonAttrs]),
  circle: new Set(['diameter', 'scale', 'color', ...commonAttrs]),
  line: new Set(['length', 'scale', 'color', 'thickness', ...commonAttrs]),
  progress: new Set(['value', 'color', 'trackColor', 'width', 'height', ...commonAttrs]),
  metric: new Set(['value', 'label', 'accent', ...commonAttrs]),
  metricRow: new Set(['gap', ...commonAttrs]),
  barChart: new Set(['width', 'height', 'showLabels', 'showValues', ...commonAttrs]),
  bar: new Set(['label', 'value', 'color']),
  lineChart: new Set(['width', 'height', 'curve', 'showLabels', 'showValues', ...commonAttrs]),
  series: new Set(['label', 'values', 'color']),
  donutChart: new Set(['innerRadius', 'showLabels', 'showValues', 'size', 'scale', ...commonAttrs]),
  slice: new Set(['label', 'value', 'color']),
  morphBlob: new Set(['variant', 'color', 'width', 'height', 'scale', ...commonAttrs]),
  glassList: new Set(['width', 'color', ...commonAttrs]),
  card: new Set(['width', 'height', 'radius', ...commonAttrs]),
  announcement: new Set(['title', 'subtitle', 'badge', 'tone', ...commonAttrs]),
  launchCard: new Set(['title', 'subtitle', 'cta', 'proof', 'tone', ...commonAttrs]),
  breakingNews: new Set(['headline', 'ticker', 'tone', ...commonAttrs]),
  featureReveal: new Set(['title', 'caption', ...commonAttrs]),
  problemSolution: new Set(['problem', 'solution', ...commonAttrs]),
  beforeAfter: new Set(['before', 'after', ...commonAttrs]),
  quoteCard: new Set(['quote', 'author', 'role', ...commonAttrs]),
  ranking: new Set(['title', ...commonAttrs]),
  countdown: new Set(['value', 'label', ...commonAttrs]),
  finalCTA: new Set(['title', 'subtitle', 'cta', ...commonAttrs]),
  asset: new Set(['name', 'width', 'height', ...commonAttrs]),
  icon: new Set(['name', 'pack', 'theme', 'size', ...commonAttrs]),
  website: new Set(['url', 'device', ...commonAttrs]),
  githubRepo: new Set(['owner', 'repo', ...commonAttrs]),
  npmPackage: new Set(['name', ...commonAttrs]),
  brandCard: new Set(['name', 'provider', ...commonAttrs]),
  captions: new Set(['text', 'style', 'start', 'dur', 'src', 'track', 'maxWidth', 'bottomOffset', 'accent', ...commonAttrs]),
  caption: new Set(['at', 'dur', 'text']),
  audio: new Set(['src', 'volume', 'startFrom']),
  sfx: new Set(['name', 'src', 'at', 'volume']),
  beat: new Set(['at']),
  fx: new Set(['bloom', 'chromatic', 'vignette', 'grain', 'paper', 'exposure']),
}
const numericAttrs = new Set([
  'fps', 'duration', 'transitionDuration', 'folds', 'vignette', 'grain', 'staggerStep', 'gap',
  'x', 'y', 'size', 'scale', 'weight', 'letterSpacing', 'lineHeight', 'wrap', 'maxHeight',
  'motionDuration', 'delay', 'depth', 'opacity', 'exitDuration', 'exitAt', 'loopDuration',
  'loopScale', 'loopDistance', 'loopSpeed', 'width', 'height', 'radius', 'blur', 'brightness',
  'saturate', 'start', 'dur', 'maxWidth', 'bottomOffset', 'volume', 'startFrom', 'at', 'bloom',
  'chromatic', 'paper', 'exposure', 'wordIndex', 'cueStart', 'wordStep', 'totalWords', 'musicVolume',
])
const booleanAttrs = new Set(['italic', 'stagger', 'showLabels', 'showValues', 'track'])

function checkMarkupTypes(root: MarkupNode, issues: LintIssue[]): void {
  const visit = (node: MarkupNode): void => {
    const schema = attrSchemas[node.tag]
    if (schema) {
      for (const [name, value] of Object.entries(node.attrs)) {
        const location = node.attributeLocations[name] ?? node.location
        if (!schema.has(name)) {
          push(issues, {
            level: 'error',
            code: 'unknown-attribute',
            message: `<${node.tag}> does not support the "${name}" attribute. Check its spelling.`,
            location,
          })
        } else if (!(node.tag === 'video' && name === 'size') && numericAttrs.has(name) && !Number.isFinite(Number(value))) {
          push(issues, {
            level: 'error',
            code: 'type-number',
            message: `<${node.tag}> ${name} must be a number.`,
            location,
          })
        } else if (booleanAttrs.has(name) && value !== 'true' && value !== 'false') {
          push(issues, {
            level: 'error',
            code: 'type-boolean',
            message: `<${node.tag}> ${name} must be true or false.`,
            location,
          })
        }
      }
    }

    if (node.tag === 'video') {
      const fps = node.attrs.fps
      if (fps && !['24', '30', '60'].includes(fps)) {
        push(issues, { level: 'error', code: 'invalid-fps', message: 'fps must be 24, 30, or 60.', location: node.attributeLocations.fps ?? node.location })
      }
      const size = node.attrs.size
      if (size && !/^(?:1080p|720p|4k|square|portrait|16:9|9:16|1:1|4:5|21:9|\d+(?:\.\d+)?x\d+(?:\.\d+)?)$/.test(size)) {
        push(issues, { level: 'error', code: 'invalid-size', message: 'size must be a supported preset or WIDTHxHEIGHT.', location: node.attributeLocations.size ?? node.location })
      }
    }
    if (node.tag === 'scene' && node.attrs.layout && !['free', 'center', 'row', 'column', 'stack'].includes(node.attrs.layout)) {
      push(issues, { level: 'error', code: 'invalid-layout', message: 'scene layout must be free, center, row, column, or stack.', location: node.attributeLocations.layout ?? node.location })
    }
    if (node.tag === 'scene' && node.attrs.layout && node.attrs.layout !== 'free') {
      for (const child of node.children) {
        if (child.attrs.x !== undefined || child.attrs.y !== undefined) {
          push(issues, { level: 'warn', code: 'layout-coordinate-ignored', message: `Scene layout positions its children. Remove x/y from <${child.tag}> or set layout="free".`, location: child.location })
        }
      }
    }
    if (node.tag === 'scene' && node.attrs.align && !['start', 'center', 'end'].includes(node.attrs.align)) {
      push(issues, { level: 'error', code: 'invalid-align', message: 'scene align must be start, center, or end.', location: node.attributeLocations.align ?? node.location })
    }
    if (node.tag === 'text' && node.attrs.align && !['left', 'center', 'right'].includes(node.attrs.align)) {
      push(issues, { level: 'error', code: 'invalid-align', message: 'text align must be left, center, or right.', location: node.attributeLocations.align ?? node.location })
    }
    if (node.tag === 'scene' && node.attrs.transition && !['crossDissolve', 'blurDissolve', 'zoomSmooth', 'slide', 'wipe', 'zoom', 'glitch', 'flash', 'paperFold'].includes(node.attrs.transition)) {
      push(issues, { level: 'error', code: 'invalid-transition', message: `Unknown transition "${node.attrs.transition}".`, location: node.attributeLocations.transition ?? node.location })
    }
    if (node.tag === 'scene' && node.attrs.camera && !['none', 'slowPush', 'parallaxDrift', 'handheld', 'kenBurns'].includes(node.attrs.camera)) {
      push(issues, { level: 'error', code: 'invalid-camera', message: `Unknown camera "${node.attrs.camera}".`, location: node.attributeLocations.camera ?? node.location })
    }
    if (node.tag === 'scene' && node.attrs.mood && !['neutral', 'editorial', 'cinematic'].includes(node.attrs.mood)) {
      push(issues, { level: 'error', code: 'invalid-mood', message: `Unknown mood "${node.attrs.mood}".`, location: node.attributeLocations.mood ?? node.location })
    }

    for (const child of node.children) visit(child)
  }
  visit(root)
}

function findNode(root: MarkupNode, tag: string): MarkupNode | undefined {
  if (root.tag === tag) return root
  for (const child of root.children) {
    const found = findNode(child, tag)
    if (found) return found
  }
  return undefined
}

interface Bounds { left: number; top: number; right: number; bottom: number }
interface Point { x: number; y: number }

function elementSize(el: VeloxVideoConfig['scenes'][number]['elements'][number]): Point {
  if (el.type === 'text') {
    const fs = el.fontSize ?? 48
    const charWidth = fs * (el.fontWeight && el.fontWeight >= 700 ? 0.6 : 0.54)
    const maxWidth = el.maxWidth ?? 820
    const lines = el.content.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil((line.length * charWidth) / maxWidth)), 0)
    return { x: Math.min(maxWidth, Math.max(charWidth, lineMaxLength(el.content) * charWidth)), y: lines * fs * (el.lineHeight ?? 1.4) }
  }
  if (el.type === 'textList') return { x: el.maxWidth ?? 420, y: el.items.length * (el.fontSize ?? 24) * 1.4 }
  if (el.type === 'shape') return { x: el.shape.width ?? 200, y: el.shape.height ?? el.shape.width ?? 200 }
  if (el.type === 'image' || el.type === 'logo') return { x: el.width ?? 256, y: el.height ?? el.width ?? 256 }
  if (el.type === 'group') {
    const bounds = groupBounds(el.children)
    return { x: bounds.right - bounds.left, y: bounds.bottom - bounds.top }
  }
  return { x: 160, y: 80 }
}

function lineMaxLength(text: string): number {
  return Math.max(0, ...text.split('\n').map((line) => line.length))
}

function groupBounds(children: VeloxVideoConfig['scenes'][number]['elements']): Bounds {
  const bounds: Bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  for (const child of children) {
    const size = elementSize(child)
    const x = child.position?.type === 'absolute' ? child.position.x : 0
    const y = child.position?.type === 'absolute' ? child.position.y : 0
    bounds.left = Math.min(bounds.left, x - size.x / 2)
    bounds.top = Math.min(bounds.top, y - size.y / 2)
    bounds.right = Math.max(bounds.right, x + size.x / 2)
    bounds.bottom = Math.max(bounds.bottom, y + size.y / 2)
  }
  return bounds.left === Infinity ? { left: 0, top: 0, right: 0, bottom: 0 } : bounds
}

function elementCenter(position: VeloxVideoConfig['scenes'][number]['elements'][number]['position'], w: number, h: number, ox = 0, oy = 0): Point {
  if (!position || position.type === 'center') return { x: ox + w / 2 + (position?.offsetX ?? 0), y: oy + h / 2 + (position?.offsetY ?? 0) }
  if (position.type === 'absolute') return { x: ox + position.x, y: oy + position.y }
  const x = position.offsetX ?? 0
  const y = position.offsetY ?? 0
  switch (position.name) {
    case 'topLeft': return { x: ox + 54 + x, y: oy + 54 + y }
    case 'topRight': return { x: ox + w - 54 + x, y: oy + 54 + y }
    case 'bottomLeft': return { x: ox + 54 + x, y: oy + h - 54 + y }
    case 'bottomRight': return { x: ox + w - 54 + x, y: oy + h - 54 + y }
    case 'topCenter': return { x: ox + w / 2 + x, y: oy + 54 + y }
    case 'bottomCenter': return { x: ox + w / 2 + x, y: oy + h - 54 + y }
    case 'leftCenter': return { x: ox + 54 + x, y: oy + h / 2 + y }
    case 'rightCenter': return { x: ox + w - 54 + x, y: oy + h / 2 + y }
    default: return { x: ox + w / 2 + x, y: oy + h / 2 + y }
  }
}

function checkLayout(config: VeloxVideoConfig, issues: LintIssue[], sceneLocations: MarkupLocation[] = []): void {
  const [width, height] = config.size
  for (let sceneIndex = 0; sceneIndex < config.scenes.length; sceneIndex++) {
    const scene = config.scenes[sceneIndex]
    const location = sceneLocations[sceneIndex]
    const simpleTexts = scene.elements.filter((el) => el.type === 'text')
    for (let i = 0; i < simpleTexts.length; i++) {
      const a = simpleTexts[i]!
      const ac = elementCenter(a.position, width, height)
      const as = elementSize(a)
      for (let j = i + 1; j < simpleTexts.length; j++) {
        const b = simpleTexts[j]!
        const bc = elementCenter(b.position, width, height)
        const bs = elementSize(b)
        const overlaps = Math.abs(ac.x - bc.x) * 2 < as.x + bs.x && Math.abs(ac.y - bc.y) * 2 < as.y + bs.y
        if (overlaps) {
          push(issues, { level: 'warn', code: 'text-overlap', message: `Text "${a.id}" overlaps text "${b.id}". Add layout="column" to the scene or set placements.`, scene: scene.id, location })
        }
      }
    }
    for (const el of scene.elements) {
      const check = (item: typeof el, ox: number, oy: number): void => {
        const center = elementCenter(item.position, width, height, ox, oy)
        if (item.type === 'group') {
          for (const child of item.children) check(child, center.x, center.y)
          return
        }
        const size = elementSize(item)
        const bounds = { left: center.x - size.x / 2, right: center.x + size.x / 2, top: center.y - size.y / 2, bottom: center.y + size.y / 2 }
        if (bounds.left < 0 || bounds.top < 0 || bounds.right > width || bounds.bottom > height) {
          push(issues, { level: 'warn', code: 'layout-overflow', message: `Element "${item.id}" extends outside the ${width}x${height} canvas. Use scene layout or reduce its size.`, scene: scene.id, location })
        } else if (item.type === 'text' && (bounds.left < width * 0.05 || bounds.right > width * 0.95 || bounds.top < height * 0.05 || bounds.bottom > height * 0.95)) {
          push(issues, { level: 'warn', code: 'safe-area', message: `Text "${item.id}" is close to the canvas edge. Move it into the 5% safe area.`, scene: scene.id, location })
        }
      }
      check(el, 0, 0)
    }
  }
}
