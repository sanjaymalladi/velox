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
  checkDesignPrinciples(config, root, issues)

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
  checkDesignPrinciples(config, undefined, issues)

  return finalize(config, issues)
}

function checkScenes(config: VeloxVideoConfig, issues: LintIssue[]): void {
  const sourcedScenes = config.scenes.filter((scene) => scene.source)
  if (sourcedScenes.length > 0 && sourcedScenes.length < config.scenes.length) {
    for (const scene of config.scenes.filter((candidate) => !candidate.source)) {
      push(issues, { level: 'warn', code: 'scene-source-missing', message: 'This scene makes historical or factual claims, but has no source. Add source="..." and sourceDate="...".', scene: scene.id })
    }
  }
  for (const scene of config.scenes) {
    if (scene.source && !scene.sourceDate) {
      push(issues, { level: 'warn', code: 'scene-source-date-missing', message: 'Add sourceDate="..." to show when this source was published or accessed.', scene: scene.id })
    }
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

function flattenElements(elements: VeloxVideoConfig['scenes'][number]['elements']): VeloxVideoConfig['scenes'][number]['elements'] {
  return elements.flatMap((element) => element.type === 'group' ? [element, ...flattenElements(element.children)] : [element])
}

function normalizedText(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function contrastRatio(foreground: string, background: string): number | undefined {
  const parse = (value: string): [number, number, number] | undefined => {
    const match = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)
    if (!match) return undefined
    const hex = match[1]!.length === 3 ? [...match[1]!].map((ch) => ch + ch).join('') : match[1]!
    return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as [number, number, number]
  }
  const luminance = (color: [number, number, number]): number => {
    const linear = color.map((component) => component <= 0.04045 ? component / 12.92 : ((component + 0.055) / 1.055) ** 2.4)
    return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
  }
  const fg = parse(foreground)
  const bg = parse(background)
  if (!fg || !bg) return undefined
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (light! + 0.05) / (dark! + 0.05)
}

function checkDesignPrinciples(config: VeloxVideoConfig, root: MarkupNode | undefined, issues: LintIssue[]): void {
  const sceneNodes = root?.children.filter((child) => child.tag === 'scene') ?? []
  if (config.scenes.length >= 3 && !config.visualWorld) {
    push(issues, { level: 'warn', code: 'visual-world-missing', message: 'Define <visualWorld> so palette, material, lighting, and motif can carry across scenes.' })
  }

  const signatures = sceneNodes.map((scene) => scene.children
    .filter((child) => !['audio', 'sfx', 'beat', 'assetPack'].includes(child.tag) && !(child.tag === 'captions' && child.attrs.track === 'true'))
    .map((child) => `${child.tag}:${child.attrs.slot ?? child.attrs.placement ?? ''}`)
    .join('|'))
  if (signatures.length >= 3 && new Set(signatures).size < 3) {
    const counts = new Map<string, number>()
    signatures.forEach((signature) => counts.set(signature, (counts.get(signature) ?? 0) + 1))
    if ([...counts.values()].some((count) => count >= 3)) {
      push(issues, { level: 'warn', code: 'repeated-composition', message: 'Three or more scenes repeat the same element structure. Carry a visual subject forward and vary composition when the story changes.' })
    }
  }

  const transitionCounts = new Map<string, number>()
  config.scenes.forEach((scene) => {
    if (scene.transition) transitionCounts.set(scene.transition.type, (transitionCounts.get(scene.transition.type) ?? 0) + 1)
  })
  if (config.scenes.length >= 4 && [...transitionCounts.values()].some((count) => count >= config.scenes.length - 1)) {
    push(issues, { level: 'warn', code: 'transition-repetition', message: 'The same transition repeats across nearly every scene. Use transitions that match the relationship between beats; cut when scenes are unrelated.' })
  }

  for (let i = 0; i < config.scenes.length; i++) {
    const scene = config.scenes[i]!
    const markupScene = sceneNodes[i]
    const location = markupScene?.location
    const elements = flattenElements(scene.elements)
    const words = elements.flatMap((element) => element.type === 'text' ? element.content.split(/\s+/) : element.type === 'textList' ? element.items.flatMap((item) => item.split(/\s+/)) : []).filter(Boolean)
    if (words.length > 35) {
      push(issues, { level: 'warn', code: 'text-density', message: `Scene contains about ${words.length} visible words. Move detail to narration and keep only key phrases on screen.`, scene: scene.id, location })
    }
    if (scene.audio && !scene.captions) {
      push(issues, { level: 'warn', code: 'voice-captions-missing', message: 'This scene has audio but no caption track. Add timed captions when the audio contains speech.', scene: scene.id, location })
    }
    if (scene.focus === undefined && config.visualWorld && sceneNodes.length >= 3) {
      push(issues, { level: 'warn', code: 'scene-focus-missing', message: 'Add focus="..." to name the main object, place, or idea for this scene.', scene: scene.id, location })
    }
    if (!markupScene && scene.focus === undefined && config.visualWorld && config.scenes.length >= 3) {
      push(issues, { level: 'warn', code: 'scene-focus-missing', message: 'Add focus to name the main object, place, or idea for this scene.', scene: scene.id })
    }
    const chartElements = elements.filter((element) => element.type === 'shape' && ['barChart', 'lineChart', 'donutChart'].includes(element.shape.shapeType))
    for (const element of chartElements) {
      if (element.type !== 'shape') continue
      const provenance = element.shape.provenance
      if (!root && provenance?.kind !== 'conceptual' && !provenance?.source) {
        push(issues, { level: 'warn', code: 'chart-source-missing', message: `Chart "${element.id}" needs a data source and date, or dataType="conceptual" with a visible diagram label.`, scene: scene.id, location })
      }
      if (!root && provenance?.kind !== 'conceptual' && provenance?.source && !provenance?.units) {
        push(issues, { level: 'warn', code: 'chart-units-missing', message: `Chart "${element.id}" has no units. Add units so viewers can interpret the values.`, scene: scene.id, location })
      }
      if (!root && provenance?.kind === 'conceptual' && !provenance.label) {
        push(issues, { level: 'warn', code: 'conceptual-chart-label', message: `Chart "${element.id}" must have a visible diagram label when it is conceptual.`, scene: scene.id, location })
      }
    }
    const untrackedImages = root ? [] : elements.filter((element) => element.type === 'image' && !element.src.startsWith('stock://') && !element.provenance?.source)
    for (const element of untrackedImages) {
      push(issues, { level: 'warn', code: 'asset-provenance-missing', message: `Image "${element.id}" has no source or prompt record. Add source, rights, and creator metadata.`, scene: scene.id, location })
    }

    if (markupScene) {
      const captionTexts = markupScene.children.filter((child) => child.tag === 'captions' && child.attrs.track !== 'true')
        .map((child) => child.attrs.text ?? child.children.map((cue) => cue.attrs.text ?? cue.text).join(' '))
      const visibleText = elements.filter((element) => element.type === 'text').map((element) => normalizedText(element.content))
      if (captionTexts.some((caption) => visibleText.includes(normalizedText(caption)))) {
        push(issues, { level: 'warn', code: 'caption-duplicates-copy', message: 'A caption repeats visible headline text. Keep design copy separate from speech captions.', scene: scene.id, location })
      }
    }
  }

  if (root) {
    const worldNode = root.children.find((child) => child.tag === 'visualWorld')
    if (worldNode) {
      for (const scene of sceneNodes) {
        if (scene.attrs.background && !scene.attrs.backgroundReason) {
          push(issues, { level: 'warn', code: 'background-change-unexplained', message: 'This scene changes the visual world background without backgroundReason="...". Explain the story change or keep the world consistent.', scene: scene.attrs.chapter ?? scene.location.line.toString(), location: scene.location })
        }
      }
      const bg = worldNode.attrs.bgColor
      if (bg) {
        const visit = (node: MarkupNode): void => {
          if (node.tag === 'text' && node.attrs.color) {
            const ratio = contrastRatio(node.attrs.color, bg)
            if (ratio !== undefined && ratio < 4.5) {
              push(issues, { level: 'warn', code: 'text-contrast-low', message: `Text contrast is ${ratio.toFixed(1)}:1 against the visual-world background. Use at least 4.5:1 for normal text.`, location: node.attributeLocations.color ?? node.location })
            }
          }
          node.children.forEach(visit)
        }
        sceneNodes.forEach(visit)
      }
    }
    const unintentionalMotion = root.children.filter((child) => child.tag === 'scene').flatMap((scene) => scene.children)
      .filter((element) => Boolean(element.attrs.motion) && element.attrs.motion !== 'none' && !element.attrs.intent)
    if (unintentionalMotion.length >= 5) {
      push(issues, { level: 'warn', code: 'motion-intent-missing', message: 'Several elements move without an intent. Add intent="reveal|trace|compare|transform|emphasize|settle|exit|atmosphere" or remove decorative motion.' })
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
  'x', 'y', 'placement', 'slot', 'motion', 'intent', 'motionDuration', 'delay', 'depth', 'opacity',
  'exit', 'exitDuration', 'exitAt', 'loop', 'loopDuration', 'loopScale', 'loopDistance', 'loopSpeed',
]
const attrSchemas: Record<string, Set<string>> = {
  video: new Set(['size', 'fps', 'theme', 'background', 'motionQuality', 'music', 'musicVolume', 'reducedMotion']),
  visualWorld: new Set(['name', 'background', 'material', 'lighting', 'texture', 'motif', 'depth', 'bgColor', 'foreground', 'accent', 'muted']),
  scene: new Set(['duration', 'template', 'camera', 'mood', 'transition', 'transitionDuration', 'direction', 'folds', 'background', 'vignette', 'grain', 'staggerStep', 'layout', 'gap', 'align', 'chapter', 'focus', 'backgroundReason', 'accent', 'source', 'sourceLabel', 'sourceDate']),
  center: new Set(['gap', ...commonAttrs]),
  row: new Set(['gap', ...commonAttrs]),
  column: new Set(['gap', ...commonAttrs]),
  stack: new Set(['gap', ...commonAttrs]),
  text: new Set(['value', 'size', 'scale', 'weight', 'color', 'align', 'font', 'letterSpacing', 'lineHeight', 'wrap', 'maxHeight', 'italic', 'transform', 'gradient', 'captionStyle', 'wordIndex', 'cueStart', 'wordStep', 'totalWords', 'captionAccent', ...commonAttrs]),
  image: new Set(['src', 'width', 'height', 'scale', 'radius', 'blur', 'brightness', 'saturate', 'tilt', 'source', 'creator', 'rights', 'sourceDate', 'illustration', ...commonAttrs]),
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
  barChart: new Set(['width', 'height', 'showLabels', 'showValues', 'surface', 'source', 'sourceDate', 'units', 'dataType', 'label', ...commonAttrs]),
  bar: new Set(['label', 'value', 'color']),
  lineChart: new Set(['width', 'height', 'curve', 'showLabels', 'showValues', 'surface', 'source', 'sourceDate', 'units', 'dataType', 'label', ...commonAttrs]),
  series: new Set(['label', 'values', 'color']),
  donutChart: new Set(['innerRadius', 'showLabels', 'showValues', 'size', 'scale', 'source', 'sourceDate', 'units', 'dataType', 'label', ...commonAttrs]),
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
const booleanAttrs = new Set(['italic', 'stagger', 'showLabels', 'showValues', 'track', 'illustration', 'reducedMotion'])

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
        } else if (!(node.tag === 'video' && name === 'size') && !(node.tag === 'visualWorld' && name === 'depth') && numericAttrs.has(name) && !Number.isFinite(Number(value))) {
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
    if (node.tag === 'visualWorld' && node.attrs.depth && !['flat', 'layered'].includes(node.attrs.depth)) {
      push(issues, { level: 'error', code: 'invalid-world-depth', message: '<visualWorld> depth must be flat or layered.', location: node.attributeLocations.depth ?? node.location })
    }
    if (node.tag === 'image' && node.attrs.tilt && !/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(node.attrs.tilt)) {
      push(issues, { level: 'error', code: 'invalid-image-tilt', message: '<image> tilt must contain two angles, for example tilt="8,-12".', location: node.attributeLocations.tilt ?? node.location })
    }
    if ((node.tag === 'barChart' || node.tag === 'lineChart' || node.tag === 'donutChart') && node.attrs.dataType && !['quantitative', 'conceptual'].includes(node.attrs.dataType)) {
      push(issues, { level: 'error', code: 'invalid-chart-type', message: `${node.tag} dataType must be quantitative or conceptual.`, location: node.attributeLocations.dataType ?? node.location })
    }
    if ((node.tag === 'barChart' || node.tag === 'lineChart' || node.tag === 'donutChart') && node.attrs.dataType !== 'conceptual' && !node.attrs.source) {
      push(issues, { level: 'warn', code: 'chart-source-missing', message: `Quantitative <${node.tag}> should include source="..." and sourceDate="...".`, location: node.location })
    }
    if ((node.tag === 'barChart' || node.tag === 'lineChart' || node.tag === 'donutChart') && node.attrs.dataType === 'conceptual' && !node.attrs.label) {
      push(issues, { level: 'warn', code: 'conceptual-chart-label', message: `Label this <${node.tag}> as an illustrative diagram; do not present it as measured data.`, location: node.location })
    }
    if (node.tag === 'image' && node.attrs.illustration === 'true' && !node.attrs.source) {
      push(issues, { level: 'warn', code: 'illustration-source-missing', message: 'Generated or reconstructed illustrations should still record their prompt or source.', location: node.location })
    }
    if (node.tag === 'scene' && node.attrs.source && !node.attrs.sourceDate) {
      push(issues, { level: 'warn', code: 'scene-source-date-missing', message: 'Add sourceDate="..." to show when this source was published or accessed.', location: node.location })
    }
    if (['barChart', 'lineChart', 'donutChart'].includes(node.tag) && node.attrs.dataType !== 'conceptual' && node.attrs.source && !node.attrs.sourceDate) {
      push(issues, { level: 'warn', code: 'chart-source-date-missing', message: `Add sourceDate="..." to <${node.tag}>.`, location: node.location })
    }
    if (['barChart', 'lineChart', 'donutChart'].includes(node.tag) && node.attrs.dataType !== 'conceptual' && node.attrs.source && !node.attrs.units) {
      push(issues, { level: 'warn', code: 'chart-units-missing', message: `Add units="..." to quantitative <${node.tag}>.`, location: node.location })
    }
    if (node.attrs.intent && !['reveal', 'trace', 'compare', 'transform', 'emphasize', 'settle', 'exit', 'atmosphere'].includes(node.attrs.intent)) {
      push(issues, { level: 'error', code: 'invalid-motion-intent', message: `Unknown intent "${node.attrs.intent}".`, location: node.attributeLocations.intent ?? node.location })
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
    if ((node.tag === 'barChart' || node.tag === 'lineChart') && node.attrs.surface && !['light', 'dark'].includes(node.attrs.surface)) {
      push(issues, { level: 'error', code: 'invalid-chart-surface', message: `${node.tag} surface must be light or dark.`, location: node.attributeLocations.surface ?? node.location })
    }
    if (node.tag === 'scene' && node.attrs.transition && !['crossDissolve', 'blurDissolve', 'zoomSmooth', 'slide', 'wipe', 'zoom', 'glitch', 'flash', 'paperFold'].includes(node.attrs.transition)) {
      push(issues, { level: 'error', code: 'invalid-transition', message: `Unknown transition "${node.attrs.transition}".`, location: node.attributeLocations.transition ?? node.location })
    }
    if (node.tag === 'scene' && node.attrs.camera && !['none', 'slowPush', 'parallaxDrift', 'orbit', 'handheld', 'kenBurns'].includes(node.attrs.camera)) {
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
  if (el.type === 'shape') {
    if (el.shape.shapeType === 'line') return { x: el.shape.width ?? 200, y: el.shape.thickness ?? 4 }
    return { x: el.shape.width ?? 200, y: el.shape.height ?? el.shape.width ?? 200 }
  }
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
