import { createVideo, type VeloxVideo } from './core/Video'
import { scene, type SceneBuilder } from './core/Scene'
import { text } from './elements/Text'
import { image } from './elements/Image'
import { shape } from './elements/Shape'
import { logo } from './elements/Logo'
import { group } from './elements/Group'
import { layout } from './layout'
import { backdrops } from './backdrops'
import { typography, cards as creativeCards, motion } from './presets'
import { resolveTheme } from './themes'
import type { Element } from './core/Element'
import type { ElementConfig, VeloxColor, VeloxGradient, VeloxSize, VeloxFps, VeloxTheme, MotionQuality, SceneCamera, SceneMood, TransitionType } from './types'
import { isVeloxMarkup, parseVeloxMarkup, type MarkupNode } from './markup'

type AnyElement = Element<ElementConfig>
type Background = VeloxColor | VeloxGradient
interface CompileContext {
  theme: VeloxTheme
}

const placements = ['center', 'top', 'bottom', 'left', 'right', 'hero', 'safeTop', 'safeBottom']
const motions = [
  'none', 'fade', 'cinematic', 'typewriter', 'pop', 'float', 'drawIn', 'growUp', 'slideIn',
  'heroCinematic', 'softReveal', 'driftIn', 'premiumSlide', 'magneticPop',
]
const sceneCameras: SceneCamera[] = ['none', 'slowPush', 'parallaxDrift', 'handheld', 'kenBurns']
const sceneMoods: SceneMood[] = ['neutral', 'editorial', 'cinematic']
const transitionTypes = new Set<TransitionType>([
  'crossDissolve', 'blurDissolve', 'zoomSmooth', 'slide', 'wipe', 'zoom', 'glitch', 'flash',
])
const scaleMap = { xs: 0.55, sm: 0.75, md: 1, lg: 1.25, xl: 1.55 }
const paletteAliases = {
  neon: 'violet',
  purple: 'violet',
  blue: 'ocean',
  red: 'danger',
  orange: 'ember',
} as const
const palettes = ['midnight', 'violet', 'danger', 'ocean', 'ember']

function fail(message: string): never {
  throw new Error(`[velox markup] ${message}`)
}

function num(value: string | undefined, fallback: number, path: string): number {
  if (value === undefined) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) fail(`${path} must be a number.`)
  return n
}

function scale(value: string | undefined, base: number): number {
  if (!value) return base
  if (value in scaleMap) return base * scaleMap[value as keyof typeof scaleMap]
  const n = Number(value)
  if (!Number.isFinite(n)) fail(`scale="${value}" is invalid. Use xs, sm, md, lg, xl, or a number.`)
  return Math.max(0.25, Math.min(3, n)) * base
}

function attr(node: MarkupNode, key: string): string | undefined {
  return node.attrs[key]
}

function color(value: string | undefined, ctx: CompileContext, fallback: string): string {
  if (!value) return fallback
  switch (value) {
    case 'theme.background':
      return ctx.theme.background
    case 'theme.primary':
      return ctx.theme.primary
    case 'theme.secondary':
      return ctx.theme.secondary
    case 'theme.text':
      return ctx.theme.text
    case 'theme.muted':
      return ctx.theme.muted
    case 'theme.accent':
      return ctx.theme.accent ?? ctx.theme.primary
    default:
      return value
  }
}

function numberList(value: string | undefined, path: string): number[] {
  if (!value) fail(`${path} requires comma-separated numbers.`)
  const values = value.split(',').map((part) => Number(part.trim()))
  if (values.some((n) => !Number.isFinite(n))) fail(`${path} must contain only numbers.`)
  return values
}

const blobPathPresets = {
  soft: [
    'M50,4 C78,4 98,24 96,52 C94,82 72,96 46,94 C20,92 4,72 6,46 C8,20 24,4 50,4 Z',
    'M52,6 C80,10 94,34 88,60 C82,86 56,98 30,88 C6,78 4,48 16,26 C28,4 42,2 52,6 Z',
    'M42,8 C68,0 94,18 96,46 C98,74 76,96 48,92 C20,88 0,62 10,34 C18,12 26,12 42,8 Z',
  ],
  sharp: [
    'M50,2 L90,24 L82,78 L30,96 L4,48 Z',
    'M42,4 L96,40 L66,96 L8,72 L18,18 Z',
    'M62,4 L94,58 L48,96 L4,54 L28,10 Z',
  ],
} as const

function hasAttr(node: MarkupNode, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(node.attrs, key)
}

function requiredAttr(node: MarkupNode, key: string): string {
  const value = attr(node, key)
  if (!value) fail(`<${node.tag}> requires ${key}="...".`)
  return value
}

function textContent(node: MarkupNode): string {
  return node.text.trim()
}

function palette(value: string, path: string): 'midnight' | 'violet' | 'danger' | 'ocean' | 'ember' {
  const normalized = (paletteAliases[value as keyof typeof paletteAliases] ?? value) as 'midnight' | 'violet' | 'danger' | 'ocean' | 'ember'
  if (!palettes.includes(normalized)) fail(`${path} "${value}" is invalid. Use midnight, violet, danger, ocean, ember, or alias neon.`)
  return normalized
}

function validateCommon(node: MarkupNode): void {
  const placement = attr(node, 'placement')
  if (placement && !placements.includes(placement)) fail(`<${node.tag}> placement="${placement}" is invalid.`)
  const m = attr(node, 'motion')
  if (m && !motions.includes(m)) fail(`<${node.tag}> motion="${m}" is invalid.`)
}

function background(value: string | undefined): Background | undefined {
  if (!value) return undefined
  if (value === 'creamGrid') return backdrops.creamGrid()
  if (value.startsWith('creamGrid(')) return backdrops.creamGrid(num(value.slice('creamGrid('.length, -1), 42, 'creamGrid.size'))
  if (value === 'warmPaper') return backdrops.warmPaper()
  if (value.startsWith('aurora:')) return backdrops.aurora({ mood: palette(value.slice('aurora:'.length), 'aurora background') })
  if (value.startsWith('mesh:')) return backdrops.meshGradient({ palette: palette(value.slice('mesh:'.length), 'mesh background') })
  if (value.startsWith('grid(')) return value
  return value
}

function rootBackground(value: string | undefined): Background | undefined {
  return background(value)
}

function place<T extends AnyElement>(el: T, placement: string | undefined): T {
  switch (placement ?? 'center') {
    case 'top':
    case 'safeTop':
      return el.pos('topCenter', undefined, { offsetY: 120 })
    case 'bottom':
    case 'safeBottom':
      return el.pos('bottomCenter', undefined, { offsetY: -120 })
    case 'left':
      return el.pos('leftCenter', undefined, { offsetX: 120 })
    case 'right':
      return el.pos('rightCenter', undefined, { offsetX: -120 })
    case 'hero':
      return el.center({ offsetY: -120 })
    case 'center':
    default:
      return el.center()
  }
}

function animate<T extends AnyElement>(el: T, node: MarkupNode): T {
  const m = attr(node, 'motion') ?? 'cinematic'
  const delay = num(attr(node, 'delay'), 0, `${node.tag}.delay`)
  switch (m) {
    case 'none':
      return el
    case 'fade':
      return el.in('fadeIn', 0.6, { delay })
    case 'typewriter':
      return el.in('typewriter', 0.8, { delay })
    case 'pop':
      return motion.pop(el, delay)
    case 'magneticPop':
      return motion.magneticPop(el, delay)
    case 'float':
      return motion.float(motion.cinematicIn(el, delay))
    case 'drawIn':
      return el.in('drawIn', 1.3, { delay, ease: 'linear' })
    case 'slideIn':
      return el.in('slideUpBlur', 0.75, { delay, ease: 'tactile' })
    case 'growUp':
      return el.in('growUp', 0.8, { delay, ease: 'tactile' })
    case 'heroCinematic':
      return motion.heroCinematic(el, delay)
    case 'softReveal':
      return motion.softReveal(el, delay)
    case 'driftIn':
      return motion.driftIn(el, delay)
    case 'premiumSlide':
      return motion.premiumSlide(el, delay)
    case 'cinematic':
    default:
      return motion.cinematicIn(el, delay)
  }
}

function finish<T extends AnyElement>(el: T, node: MarkupNode): T {
  validateCommon(node)
  return animate(place(el, attr(node, 'placement')), node)
}

function finishInFlow<T extends AnyElement>(el: T, node: MarkupNode): T {
  validateCommon(node)
  return animate(el, node)
}

function compileList(node: MarkupNode, ctx: CompileContext): AnyElement {
  const items = node.children.filter((child) => child.tag === 'item').map((child) => textContent(child) || attr(child, 'text') || '')
  if (items.length === 0) fail('<list> requires <item> children.')
  const el = text.list(items)
    .size(num(attr(node, 'size'), 30, 'list.size'))
    .color(color(attr(node, 'color'), ctx, ctx.theme.text))
    .bullet(attr(node, 'bullet') ?? '•')
    .gap(num(attr(node, 'gap'), 18, 'list.gap'))
    .wrap(num(attr(node, 'wrap'), 760, 'list.wrap'))
  if (attr(node, 'stagger') !== 'false') el.stagger('slideUp', 0.12)
  return finish(el, node)
}

function compileRect(node: MarkupNode, ctx: CompileContext): AnyElement {
  const w = num(attr(node, 'width'), scale(attr(node, 'scale'), 420), 'rect.width')
  const h = num(attr(node, 'height'), Math.round(w * 0.58), 'rect.height')
  const radius = num(attr(node, 'radius'), 24, 'rect.radius')
  const fill = color(attr(node, 'color') ?? attr(node, 'fill'), ctx, 'rgba(255,255,255,0.10)')
  const stroke = attr(node, 'stroke') ? color(attr(node, 'stroke'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined
  const rect = stroke
    ? group([
      shape.rect(w + 8, h + 8).color(stroke).radius(radius + 4),
      shape.rect(w, h).color(fill).radius(radius),
    ]).stack()
    : shape.rect(w, h).color(fill).radius(radius)
  if (node.children.length > 0) {
    const content = layout.column(node.children.flatMap((child) => compileFlowNode(child, ctx)), { gap: num(attr(node, 'gap'), 16, 'rect.gap') })
    return finish(group([rect, content]).stack(), node)
  }
  return finish(rect, node)
}

function compileFlowNode(node: MarkupNode, ctx: CompileContext): AnyElement[] {
  switch (node.tag) {
    case 'center':
    case 'stack':
      return [layout.column(node.children.flatMap((child) => compileFlowNode(child, ctx)), { gap: num(attr(node, 'gap'), 18, `${node.tag}.gap`) })]
    case 'row':
      return [layout.row(node.children.flatMap((child) => compileFlowNode(child, ctx)), { gap: num(attr(node, 'gap'), 24, 'row.gap') })]
    case 'column':
      return [layout.column(node.children.flatMap((child) => compileFlowNode(child, ctx)), { gap: num(attr(node, 'gap'), 28, 'column.gap') })]
    default:
      return [compileNode(node, ctx)]
  }
}

function compileNode(node: MarkupNode, ctx: CompileContext): AnyElement {
  validateCommon(node)
  switch (node.tag) {
    case 'center': {
      const children = compileChildren(node, ctx)
      const child = children.length <= 1
        ? (children[0] ?? text(''))
        : layout.column(children, { gap: num(attr(node, 'gap'), 28, 'center.gap') })
      return animate(layout.center(child), node)
    }
    case 'row': {
      if (attr(node, 'width') || attr(node, 'height')) fail('<row> does not support width/height. Size children instead.')
      return finish(layout.row(compileChildren(node, ctx), { gap: num(attr(node, 'gap'), 24, 'row.gap') }), node)
    }
    case 'column': {
      if (attr(node, 'width') || attr(node, 'height')) fail('<column> does not support width/height. Size children instead.')
      return finish(layout.column(compileChildren(node, ctx), { gap: num(attr(node, 'gap'), 28, 'column.gap') }), node)
    }
    case 'stack': {
      const children = compileChildren(node, ctx)
      const stacked = hasAttr(node, 'gap') && children.length > 1
        ? layout.column(children, { gap: num(attr(node, 'gap'), 18, 'stack.gap') })
        : layout.stack(children)
      return finish(stacked, node)
    }
    case 'hero':
      return finish(typography.hero(requiredAttr(node, 'title'), {
        kicker: attr(node, 'kicker'),
        subtitle: attr(node, 'subtitle'),
        color: attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.text) : undefined,
        accent: attr(node, 'accent') ? color(attr(node, 'accent'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined,
      }), node)
    case 'kicker':
      return finish(typography.kicker(textContent(node) || requiredAttr(node, 'text'), attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined), node)
    case 'text':
      return finish(text(textContent(node) || requiredAttr(node, 'value'))
        .size(num(attr(node, 'size'), scale(attr(node, 'scale'), 56), 'text.size'))
        .weight(num(attr(node, 'weight'), 700, 'text.weight'))
        .color(color(attr(node, 'color'), ctx, ctx.theme.text))
        .wrap(num(attr(node, 'wrap'), 820, 'text.wrap')), node)
    case 'list':
      return compileList(node, ctx)
    case 'logo':
      return finish(logo(requiredAttr(node, 'name'), (attr(node, 'theme') as 'light' | 'dark' | undefined) ?? 'light')
        .size(num(attr(node, 'size'), scale(attr(node, 'scale'), 96), 'logo.size')), node)
    case 'logoLockup': {
      const el = group([...logo.lockup(requiredAttr(node, 'name'), requiredAttr(node, 'label'), (attr(node, 'theme') as 'light' | 'dark' | undefined) ?? 'light', {
        logoSize: num(attr(node, 'logoSize'), scale(attr(node, 'scale'), 72), 'logoLockup.logoSize'),
        textSize: num(attr(node, 'textSize'), scale(attr(node, 'scale'), 92), 'logoLockup.textSize'),
        gap: num(attr(node, 'gap'), 24, 'logoLockup.gap'),
        color: attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.text) : undefined,
      })]).stack()
      return finish(el, node)
    }
    case 'image':
      return finish(image(requiredAttr(node, 'src'))
        .size(num(attr(node, 'width'), scale(attr(node, 'scale'), 520), 'image.width'), num(attr(node, 'height'), scale(attr(node, 'scale'), 320), 'image.height'))
        .radius(num(attr(node, 'radius'), 24, 'image.radius'))
        .fit(), node)
    case 'stock':
      return finish(image.stock(requiredAttr(node, 'query'))
        .size(num(attr(node, 'width'), scale(attr(node, 'scale'), 520), 'stock.width'), num(attr(node, 'height'), scale(attr(node, 'scale'), 320), 'stock.height'))
        .radius(num(attr(node, 'radius'), 24, 'stock.radius')), node)
    case 'rect':
      return compileRect(node, ctx)
    case 'circle':
      return finish(shape.circle(num(attr(node, 'diameter'), scale(attr(node, 'scale'), 220), 'circle.diameter')).color(color(attr(node, 'color'), ctx, ctx.theme.accent ?? '#a78bfa')), node)
    case 'line':
      return finish(shape.line(num(attr(node, 'length'), scale(attr(node, 'scale'), 420), 'line.length')).color(color(attr(node, 'color'), ctx, ctx.theme.accent ?? '#a78bfa')).thickness(num(attr(node, 'thickness'), 4, 'line.thickness')), node)
    case 'progress':
      return finish(shape.progressBar(num(attr(node, 'value'), 0, 'progress.value'), {
        color: attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined,
        trackColor: attr(node, 'trackColor') ? color(attr(node, 'trackColor'), ctx, ctx.theme.muted) : undefined,
      })
        .size(num(attr(node, 'width'), 620, 'progress.width'), num(attr(node, 'height'), 18, 'progress.height')), node)
    case 'metric':
      return finish(creativeCards.metric(requiredAttr(node, 'value'), requiredAttr(node, 'label'), { accent: attr(node, 'accent') ? color(attr(node, 'accent'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined }), node)
    case 'metricRow':
      return finish(layout.row(node.children.filter((child) => child.tag === 'metric').map((child) => compileNode(child, ctx)), { gap: num(attr(node, 'gap'), 24, 'metricRow.gap') }), node)
    case 'barChart': {
      const bars = node.children.filter((child) => child.tag === 'bar')
      if (bars.length === 0) fail('<barChart> requires <bar label="..." value="..." /> children.')
      return finish(shape.barChart({
        data: bars.map((bar) => ({
          label: requiredAttr(bar, 'label'),
          value: num(requiredAttr(bar, 'value'), 0, 'bar.value'),
          color: attr(bar, 'color') ? color(attr(bar, 'color'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined,
        })),
        showLabels: attr(node, 'showLabels') !== 'false',
        showValues: attr(node, 'showValues') !== 'false',
      }).size(num(attr(node, 'width'), 700, 'barChart.width'), num(attr(node, 'height'), 320, 'barChart.height')), node)
    }
    case 'lineChart': {
      const series = node.children.filter((child) => child.tag === 'series')
      if (series.length === 0) fail('<lineChart> requires <series values="1,2,3" /> children.')
      return finish(shape.lineChart({
        series: series.map((s) => ({
          label: attr(s, 'label'),
          values: numberList(requiredAttr(s, 'values'), 'series.values'),
          color: attr(s, 'color') ? color(attr(s, 'color'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined,
        })),
        curve: (attr(node, 'curve') as 'linear' | 'smooth' | 'step' | undefined) ?? 'smooth',
        showLabels: attr(node, 'showLabels') !== 'false',
        showValues: attr(node, 'showValues') !== 'false',
      }).size(num(attr(node, 'width'), 700, 'lineChart.width'), num(attr(node, 'height'), 320, 'lineChart.height')), node)
    }
    case 'donutChart': {
      const slices = node.children.filter((child) => child.tag === 'slice')
      if (slices.length === 0) fail('<donutChart> requires <slice label="..." value="..." /> children.')
      return finish(shape.donutChart({
        data: slices.map((slice) => ({
          label: requiredAttr(slice, 'label'),
          value: num(requiredAttr(slice, 'value'), 0, 'slice.value'),
          color: attr(slice, 'color') ? color(attr(slice, 'color'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined,
        })),
        innerRadius: num(attr(node, 'innerRadius'), 0.58, 'donutChart.innerRadius'),
        showLabels: attr(node, 'showLabels') !== 'false',
        showValues: attr(node, 'showValues') !== 'false',
      }).size(num(attr(node, 'size'), scale(attr(node, 'scale'), 340), 'donutChart.size')), node)
    }
    case 'morphBlob': {
      const variant = (attr(node, 'variant') ?? 'soft') as keyof typeof blobPathPresets
      if (!(variant in blobPathPresets)) fail('<morphBlob> variant must be soft or sharp.')
      return finish(shape.morphBlob([...blobPathPresets[variant]], {
        color: color(attr(node, 'color'), ctx, ctx.theme.accent ?? ctx.theme.primary),
      }).size(num(attr(node, 'width'), scale(attr(node, 'scale'), 340), 'morphBlob.width'), num(attr(node, 'height'), scale(attr(node, 'scale'), 340), 'morphBlob.height')), node)
    }
    case 'glassList': {
      const items = node.children.filter((child) => child.tag === 'item').map((child) => textContent(child) || attr(child, 'text') || '')
      return finish(creativeCards.glassList(items, { width: num(attr(node, 'width'), 620, 'glassList.width'), color: attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.text) : undefined }), node)
    }
    case 'card':
      return finish(creativeCards.glass(compileChildren(node, ctx), {
        width: num(attr(node, 'width'), 620, 'card.width'),
        height: num(attr(node, 'height'), 300, 'card.height'),
        radius: num(attr(node, 'radius'), 32, 'card.radius'),
      }), node)
    default:
      fail(`Unsupported element tag <${node.tag}>.`)
  }
}

function compileChildren(node: MarkupNode, ctx: CompileContext): AnyElement[] {
  return node.children.map((child) => compileNode(child, ctx))
}

function delayOf(node: MarkupNode): number {
  return num(attr(node, 'delay'), 0, `${node.tag}.delay`)
}

function compileSceneChildren(node: MarkupNode, sceneDuration: number, ctx: CompileContext): AnyElement[] {
  const staggerStep = num(attr(node, 'staggerStep'), 0, 'scene.staggerStep')
  return node.children.map((child, index) => {
    const el = compileNode(child, ctx)
    if (staggerStep > 0)
      el.bumpEntranceDelay(staggerStep * index)

    const next = node.children.slice(index + 1).find((candidate) => delayOf(candidate) > delayOf(child))
    const nextDelay = next ? delayOf(next) : sceneDuration
    const currentDelay = delayOf(child)
    if (nextDelay - currentDelay > 0.8 && nextDelay < sceneDuration) {
      el.out('fadeOut', 0.35, { at: Math.max(currentDelay + 0.45, nextDelay - 0.35) })
    }
    return el
  })
}

function applySceneVmlAttributes(s: SceneBuilder, node: MarkupNode): void {
  const cam = attr(node, 'camera')
  if (cam) {
    if (!sceneCameras.includes(cam as SceneCamera))
      fail(`<scene> camera="${cam}" is invalid. Use none, slowPush, parallaxDrift, handheld, kenBurns.`)
    s.camera(cam as SceneCamera)
  }
  const mood = attr(node, 'mood')
  if (mood) {
    if (!sceneMoods.includes(mood as SceneMood))
      fail(`<scene> mood="${mood}" is invalid. Use neutral, editorial, cinematic.`)
    s.mood(mood as SceneMood)
  }
  const transition = attr(node, 'transition')
  if (transition) {
    if (!transitionTypes.has(transition as TransitionType))
      fail(`<scene> transition="${transition}" is invalid.`)
    const transDur = num(attr(node, 'transitionDuration'), 0.55, 'scene.transitionDuration')
    s.transition(transition as TransitionType, transDur)
  }
  const vig = attr(node, 'vignette')
  const grain = attr(node, 'grain')
  if (vig !== undefined || grain !== undefined) {
    s.overlay({
      vignetteOpacity: vig !== undefined ? num(vig, 0, 'scene.vignette') : undefined,
      grainOpacity: grain !== undefined ? num(grain, 0, 'scene.grain') : undefined,
    })
  }
}

function compileScene(node: MarkupNode, ctx: CompileContext): SceneBuilder {
  if (node.tag !== 'scene') fail('Only <scene> is allowed directly inside <video>.')
  const duration = num(attr(node, 'duration'), 5, 'scene.duration')
  const s = scene(duration)
  applySceneVmlAttributes(s, node)
  const bg = background(attr(node, 'background'))
  if (bg) s.background(bg)
  s.add(...compileSceneChildren(node, duration, ctx))
  return s
}

export function createVideoFromMarkup(markup: string): VeloxVideo {
  const root = parseVeloxMarkup(markup)
  const theme = resolveTheme(attr(root, 'theme') ?? 'obsidian') ?? resolveTheme('obsidian')!
  const scenes = root.children.map((child) => compileScene(child, { theme }))
  if (scenes.length === 0) fail('<video> requires at least one <scene>.')

  const mqAttr = attr(root, 'motionQuality')
  let motionQuality: MotionQuality | undefined
  if (mqAttr) {
    if (mqAttr !== 'standard' && mqAttr !== 'premium')
      fail(`video motionQuality="${mqAttr}" must be standard or premium.`)
    motionQuality = mqAttr as MotionQuality
  }

  return createVideo({
    size: (attr(root, 'size') as VeloxSize | undefined) ?? 'portrait',
    fps: (num(attr(root, 'fps'), 60, 'video.fps') as VeloxFps),
    theme,
    background: rootBackground(attr(root, 'background')),
    motionQuality,
    scenes,
  })
}

export { isVeloxMarkup }

