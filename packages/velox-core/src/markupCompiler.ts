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
import {
  reelAnnouncement,
  reelLaunchCard,
  reelBreakingNews,
  reelFeatureReveal,
  reelProblemSolution,
  reelBeforeAfter,
  reelQuoteCard as reelSemanticQuoteCard,
  reelRanking,
  reelCountdown,
  reelFinalCTA,
} from './reelComponents'
import { resolveReelAsset, resolveSimpleGlyph } from './assets'
import {
  buildCaptionWordSpans,
  pickCaptionEntrance,
  type CaptionStyle,
} from './captions'
import { encodeVeloxCardRef, encodeVeloxStockRef, encodeVeloxWebCapture } from './mediaProviders'

import { applyReelSlot, isReelTemplate, type ReelTemplateId } from './reelTemplates'
import { resolveTheme } from './themes'
import type { Element } from './core/Element'
import type { ElementConfig, VeloxColor, VeloxGradient, VeloxSize, VeloxFps, VeloxTheme, MotionQuality, SceneCamera, SceneMood, TransitionType, SfxCue, VeloxAudioPlan } from './types'
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
const stockProviders = new Set([
  'generated',
  'local',
  'wikipedia',
  'flickr',
  'unsplashSource',
  'openbrand',
  'pexels',
  'unsplash',
  'pixabay',
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

function finish<T extends AnyElement>(el: T, node: MarkupNode, reelTemplate?: ReelTemplateId): T {
  validateCommon(node)
  const tpl = reelTemplate && reelTemplate !== 'none' ? reelTemplate : undefined
  const slot = attr(node, 'slot')
  const positioned =
    tpl && slot ? applyReelSlot(el, tpl, slot) : place(el, attr(node, 'placement'))
  return animate(positioned, node)
}

function finishInFlow<T extends AnyElement>(el: T, node: MarkupNode, reelTemplate?: ReelTemplateId): T {
  validateCommon(node)
  const tpl = reelTemplate && reelTemplate !== 'none' ? reelTemplate : undefined
  const slot = attr(node, 'slot')
  const positioned =
    tpl && slot ? applyReelSlot(el, tpl, slot) : el
  return animate(positioned, node)
}

function compileCaptionsMarkup(
  node: MarkupNode,
  ctx: CompileContext,
  sceneDuration: number,
  reelTemplate?: ReelTemplateId,
): AnyElement {
  const styleRaw = attr(node, 'style') ?? 'pill'
  const styles: CaptionStyle[] = ['plain', 'pill', 'karaoke', 'wordPop', 'highlightKeywords']
  if (!styles.includes(styleRaw as CaptionStyle))
    fail('<captions> style must be plain, pill, karaoke, wordPop, highlightKeywords.')

  const style = styleRaw as CaptionStyle

  if (attr(node, 'src')) {
    fail(
      '[velox markup] <captions src="..."/> is expanded by preprocessors — embed <caption> children or CLI-inlined cues.',
    )
  }

  const captionChildren = node.children.filter((c) => c.tag === 'caption')
  const cues: { start: number; end: number; text: string }[] =
    captionChildren.length > 0
      ? captionChildren.map((c) => ({
          start: num(attr(c, 'at'), 0, 'caption.at'),
          end:
            attr(c, 'dur') !== undefined
              ? num(attr(c, 'at'), 0, 'caption.at') + num(attr(c, 'dur'), 1.5, 'caption.dur')
              : sceneDuration,
          text: textContent(c) || requiredAttr(c, 'text'),
        }))
      : [
          {
            start: num(attr(node, 'start'), 0, 'captions.start'),
            end: sceneDuration,
            text: attr(node, 'text') ?? fail('<captions> requires text="..." or <caption> children.'),
          },
        ]

  const cueRows: AnyElement[] = []
  for (const cue of cues) {
    const dur = Math.max(0.25, cue.end - cue.start)
    const spans = buildCaptionWordSpans(cue.text, dur, style)
    const anim = pickCaptionEntrance(style)
    const words = spans.map((span) => {
      const fontSize = span.emphasize && style === 'highlightKeywords' ? 50 : style === 'wordPop' ? 44 : 38
      return text(span.word)
        .size(fontSize)
        .weight(800)
        .color(color(undefined, ctx, ctx.theme.text))
        .in(anim, 0.45, { delay: cue.start + span.delay, ease: style === 'plain' ? 'ease' : 'tactile' })
    })
    cueRows.push(layout.row(words, { gap: 14, align: 'middle' }))
  }

  const col = layout
    .column(cueRows, { gap: 20, align: 'center' })
    .pos('bottomCenter', undefined, { offsetY: -130 })
  return finish(col, node, reelTemplate)
}

function compileList(node: MarkupNode, ctx: CompileContext, reelTemplate?: ReelTemplateId): AnyElement {
  const items = node.children.filter((child) => child.tag === 'item').map((child) => textContent(child) || attr(child, 'text') || '')
  if (items.length === 0) fail('<list> requires <item> children.')
  const el = text.list(items)
    .size(num(attr(node, 'size'), 30, 'list.size'))
    .color(color(attr(node, 'color'), ctx, ctx.theme.text))
    .bullet(attr(node, 'bullet') ?? '•')
    .gap(num(attr(node, 'gap'), 18, 'list.gap'))
    .wrap(num(attr(node, 'wrap'), 760, 'list.wrap'))
  if (attr(node, 'stagger') !== 'false') el.stagger('slideUp', 0.12)
  return finish(el, node, reelTemplate)
}

function compileRect(node: MarkupNode, ctx: CompileContext, reelTemplate?: ReelTemplateId): AnyElement {
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
    const content = layout.column(node.children.flatMap((child) => compileFlowNode(child, ctx, reelTemplate)), {
      gap: num(attr(node, 'gap'), 16, 'rect.gap'),
    })
    return finish(group([rect, content]).stack(), node, reelTemplate)
  }
  return finish(rect, node, reelTemplate)
}

function compileFlowNode(node: MarkupNode, ctx: CompileContext, reelTemplate?: ReelTemplateId): AnyElement[] {
  switch (node.tag) {
    case 'center':
    case 'stack':
      return [
        layout.column(node.children.flatMap((child) => compileFlowNode(child, ctx, reelTemplate)), {
          gap: num(attr(node, 'gap'), 18, `${node.tag}.gap`),
        }),
      ]
    case 'row':
      return [
        layout.row(node.children.flatMap((child) => compileFlowNode(child, ctx, reelTemplate)), {
          gap: num(attr(node, 'gap'), 24, 'row.gap'),
        }),
      ]
    case 'column':
      return [
        layout.column(node.children.flatMap((child) => compileFlowNode(child, ctx, reelTemplate)), {
          gap: num(attr(node, 'gap'), 28, 'column.gap'),
        }),
      ]
    default:
      return [compileNode(node, ctx, reelTemplate)]
  }
}

function compileNode(node: MarkupNode, ctx: CompileContext, reelTemplate?: ReelTemplateId): AnyElement {
  validateCommon(node)
  switch (node.tag) {
    case 'center': {
      const children = compileChildren(node, ctx, reelTemplate)
      const child = children.length <= 1
        ? (children[0] ?? text(''))
        : layout.column(children, { gap: num(attr(node, 'gap'), 28, 'center.gap') })
      return animate(layout.center(child), node)
    }
    case 'row': {
      if (attr(node, 'width') || attr(node, 'height')) fail('<row> does not support width/height. Size children instead.')
      return finish(layout.row(compileChildren(node, ctx, reelTemplate), { gap: num(attr(node, 'gap'), 24, 'row.gap') }), node, reelTemplate)
    }
    case 'column': {
      if (attr(node, 'width') || attr(node, 'height')) fail('<column> does not support width/height. Size children instead.')
      return finish(layout.column(compileChildren(node, ctx, reelTemplate), { gap: num(attr(node, 'gap'), 28, 'column.gap') }), node, reelTemplate)
    }
    case 'stack': {
      const children = compileChildren(node, ctx, reelTemplate)
      const stacked = hasAttr(node, 'gap') && children.length > 1
        ? layout.column(children, { gap: num(attr(node, 'gap'), 18, 'stack.gap') })
        : layout.stack(children)
      return finish(stacked, node, reelTemplate)
    }
    case 'hero':
      return finish(typography.hero(requiredAttr(node, 'title'), {
        kicker: attr(node, 'kicker'),
        subtitle: attr(node, 'subtitle'),
        color: attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.text) : undefined,
        accent: attr(node, 'accent') ? color(attr(node, 'accent'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined,
      }), node, reelTemplate)
    case 'kicker':
      return finish(typography.kicker(textContent(node) || requiredAttr(node, 'text'), attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined), node, reelTemplate)
    case 'text':
      return finish(text(textContent(node) || requiredAttr(node, 'value'))
        .size(num(attr(node, 'size'), scale(attr(node, 'scale'), 56), 'text.size'))
        .weight(num(attr(node, 'weight'), 700, 'text.weight'))
        .color(color(attr(node, 'color'), ctx, ctx.theme.text))
        .wrap(num(attr(node, 'wrap'), 820, 'text.wrap')), node, reelTemplate)
    case 'list':
      return compileList(node, ctx, reelTemplate)
    case 'logo':
      return finish(logo(requiredAttr(node, 'name'), (attr(node, 'theme') as 'light' | 'dark' | undefined) ?? 'light')
        .size(num(attr(node, 'size'), scale(attr(node, 'scale'), 96), 'logo.size')), node, reelTemplate)
    case 'logoLockup': {
      const el = group([...logo.lockup(requiredAttr(node, 'name'), requiredAttr(node, 'label'), (attr(node, 'theme') as 'light' | 'dark' | undefined) ?? 'light', {
        logoSize: num(attr(node, 'logoSize'), scale(attr(node, 'scale'), 72), 'logoLockup.logoSize'),
        textSize: num(attr(node, 'textSize'), scale(attr(node, 'scale'), 92), 'logoLockup.textSize'),
        gap: num(attr(node, 'gap'), 24, 'logoLockup.gap'),
        color: attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.text) : undefined,
      })]).stack()
      return finish(el, node, reelTemplate)
    }
    case 'image':
      return finish(image(requiredAttr(node, 'src'))
        .size(num(attr(node, 'width'), scale(attr(node, 'scale'), 520), 'image.width'), num(attr(node, 'height'), scale(attr(node, 'scale'), 320), 'image.height'))
        .radius(num(attr(node, 'radius'), 24, 'image.radius'))
        .fit(), node, reelTemplate)
    case 'stock': {
      const provider = (attr(node, 'provider') ?? 'generated').toLowerCase()
      const q = requiredAttr(node, 'query')
      if (!stockProviders.has(provider)) fail(`<stock> provider="${provider}" is invalid.`)
      const base =
        provider === 'generated'
          ? image.stock(q)
          : image(
              encodeVeloxStockRef(
                provider,
                provider === 'local' ? q.replace(/\\/g, '/') : q,
              ),
            )
      let sized = base
        .size(
          num(attr(node, 'width'), scale(attr(node, 'scale'), 520), 'stock.width'),
          num(attr(node, 'height'), scale(attr(node, 'scale'), 320), 'stock.height'),
        )
        .radius(num(attr(node, 'radius'), 24, 'stock.radius'))
      if (provider !== 'generated' && attr(node, 'fit') === 'cover') sized = sized.fill()
      return finish(sized, node, reelTemplate)
    }
    case 'stockVideo': {
      const provider = (attr(node, 'provider') ?? 'generated').toLowerCase()
      const q = requiredAttr(node, 'query')
      if (!stockProviders.has(provider)) fail(`<stockVideo> provider="${provider}" is invalid.`)
      const base =
        provider === 'generated'
          ? image.stock(q)
          : image(encodeVeloxStockRef(provider, provider === 'local' ? q.replace(/\\/g, '/') : q))
      const sized = base.fill().radius(num(attr(node, 'radius'), 0, 'stockVideo.radius'))
      return finish(sized, node, reelTemplate)
    }
    case 'rect':
      return compileRect(node, ctx, reelTemplate)
    case 'circle':
      return finish(shape.circle(num(attr(node, 'diameter'), scale(attr(node, 'scale'), 220), 'circle.diameter')).color(color(attr(node, 'color'), ctx, ctx.theme.accent ?? '#a78bfa')), node, reelTemplate)
    case 'line':
      return finish(shape.line(num(attr(node, 'length'), scale(attr(node, 'scale'), 420), 'line.length')).color(color(attr(node, 'color'), ctx, ctx.theme.accent ?? '#a78bfa')).thickness(num(attr(node, 'thickness'), 4, 'line.thickness')), node, reelTemplate)
    case 'progress':
      return finish(shape.progressBar(num(attr(node, 'value'), 0, 'progress.value'), {
        color: attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined,
        trackColor: attr(node, 'trackColor') ? color(attr(node, 'trackColor'), ctx, ctx.theme.muted) : undefined,
      })
        .size(num(attr(node, 'width'), 620, 'progress.width'), num(attr(node, 'height'), 18, 'progress.height')), node, reelTemplate)
    case 'metric':
      return finish(creativeCards.metric(requiredAttr(node, 'value'), requiredAttr(node, 'label'), { accent: attr(node, 'accent') ? color(attr(node, 'accent'), ctx, ctx.theme.accent ?? ctx.theme.primary) : undefined }), node, reelTemplate)
    case 'metricRow':
      return finish(layout.row(node.children.filter((child) => child.tag === 'metric').map((child) => compileNode(child, ctx, reelTemplate)), { gap: num(attr(node, 'gap'), 24, 'metricRow.gap') }), node, reelTemplate)
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
      }).size(num(attr(node, 'width'), 700, 'barChart.width'), num(attr(node, 'height'), 320, 'barChart.height')), node, reelTemplate)
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
      }).size(num(attr(node, 'width'), 700, 'lineChart.width'), num(attr(node, 'height'), 320, 'lineChart.height')), node, reelTemplate)
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
      }).size(num(attr(node, 'size'), scale(attr(node, 'scale'), 340), 'donutChart.size')), node, reelTemplate)
    }
    case 'morphBlob': {
      const variant = (attr(node, 'variant') ?? 'soft') as keyof typeof blobPathPresets
      if (!(variant in blobPathPresets)) fail('<morphBlob> variant must be soft or sharp.')
      return finish(shape.morphBlob([...blobPathPresets[variant]], {
        color: color(attr(node, 'color'), ctx, ctx.theme.accent ?? ctx.theme.primary),
      }).size(num(attr(node, 'width'), scale(attr(node, 'scale'), 340), 'morphBlob.width'), num(attr(node, 'height'), scale(attr(node, 'scale'), 340), 'morphBlob.height')), node, reelTemplate)
    }
    case 'glassList': {
      const items = node.children.filter((child) => child.tag === 'item').map((child) => textContent(child) || attr(child, 'text') || '')
      return finish(creativeCards.glassList(items, { width: num(attr(node, 'width'), 620, 'glassList.width'), color: attr(node, 'color') ? color(attr(node, 'color'), ctx, ctx.theme.text) : undefined }), node, reelTemplate)
    }
    case 'card':
      return finish(creativeCards.glass(compileChildren(node, ctx, reelTemplate), {
        width: num(attr(node, 'width'), 620, 'card.width'),
        height: num(attr(node, 'height'), 300, 'card.height'),
        radius: num(attr(node, 'radius'), 32, 'card.radius'),
      }), node, reelTemplate)
    case 'announcement':
      return finish(
        reelAnnouncement({
          title: requiredAttr(node, 'title'),
          subtitle: attr(node, 'subtitle'),
          badge: attr(node, 'badge'),
          tone: attr(node, 'tone'),
        }),
        node,
        reelTemplate,
      )
    case 'launchCard':
      return finish(
        reelLaunchCard({
          title: requiredAttr(node, 'title'),
          subtitle: attr(node, 'subtitle'),
          cta: attr(node, 'cta'),
          proof: attr(node, 'proof'),
          tone: attr(node, 'tone'),
        }),
        node,
        reelTemplate,
      )
    case 'breakingNews':
      return finish(
        reelBreakingNews({
          headline: requiredAttr(node, 'headline'),
          ticker: attr(node, 'ticker'),
          tone: attr(node, 'tone'),
        }),
        node,
        reelTemplate,
      )
    case 'featureReveal':
      return finish(
        reelFeatureReveal({
          title: requiredAttr(node, 'title'),
          bullets: node.children.filter((i) => i.tag === 'item').map((i) => textContent(i) || attr(i, 'text') || ''),
          caption: attr(node, 'caption'),
        }),
        node,
        reelTemplate,
      )
    case 'problemSolution':
      return finish(
        reelProblemSolution({
          problem: requiredAttr(node, 'problem'),
          solution: requiredAttr(node, 'solution'),
        }),
        node,
        reelTemplate,
      )
    case 'beforeAfter':
      return finish(reelBeforeAfter({ before: requiredAttr(node, 'before'), after: requiredAttr(node, 'after') }), node, reelTemplate)
    case 'quoteCard':
      return finish(reelSemanticQuoteCard({ quote: requiredAttr(node, 'quote'), author: attr(node, 'author'), role: attr(node, 'role') }), node, reelTemplate)
    case 'ranking': {
      const items = node.children.filter((ch) => ch.tag === 'item').map((ch) => textContent(ch) || attr(ch, 'text') || '')
      if (!items.length) fail('<ranking> requires <item> children.')
      return finish(reelRanking({ title: attr(node, 'title'), items }), node, reelTemplate)
    }
    case 'countdown':
      return finish(reelCountdown({ value: requiredAttr(node, 'value'), label: attr(node, 'label') }), node, reelTemplate)
    case 'finalCTA':
      return finish(
        reelFinalCTA({
          title: requiredAttr(node, 'title'),
          subtitle: attr(node, 'subtitle'),
          cta: requiredAttr(node, 'cta'),
        }),
        node,
        reelTemplate,
      )
    case 'asset': {
      const nm = requiredAttr(node, 'name')
      const srcPack = resolveReelAsset(nm)
      if (!srcPack) fail(`Unknown built-in asset "${nm}". Try new-badge, phone-frame, arrow-right…`)
      return finish(
        image(srcPack).size(num(attr(node, 'width'), 280, 'asset.width'), num(attr(node, 'height'), 420, 'asset.height')),
        node,
        reelTemplate,
      )
    }
    case 'icon': {
      const nm = requiredAttr(node, 'name')
      const pack = attr(node, 'pack') ?? 'simple-icons'
      const srcIcon = resolveSimpleGlyph(pack, nm)
      if (!srcIcon) fail(`Unsupported icon "${nm}" pack="${pack}".`)
      return finish(
        image(srcIcon).size(num(attr(node, 'size'), 96, 'icon.size'), num(attr(node, 'size'), 96, 'icon.size')),
        node,
        reelTemplate,
      )
    }
    case 'website':
      return finish(image(encodeVeloxWebCapture(requiredAttr(node, 'url'), attr(node, 'device'))), node, reelTemplate)
    case 'githubRepo':
      return finish(image(encodeVeloxCardRef('github', `${requiredAttr(node, 'owner')}/${requiredAttr(node, 'repo')}`)), node, reelTemplate)
    case 'npmPackage':
      return finish(image(encodeVeloxCardRef('npm', requiredAttr(node, 'name'))), node, reelTemplate)
    case 'brandCard':
      return finish(
        image(encodeVeloxCardRef('brand', `${(attr(node, 'provider') ?? 'openbrand').toLowerCase()}:${requiredAttr(node, 'name')}`)),
        node,
        reelTemplate,
      )
    default:
      fail(`Unsupported element tag <${node.tag}>.`)
  }
}

function compileChildren(node: MarkupNode, ctx: CompileContext, reelTemplate?: ReelTemplateId): AnyElement[] {
  return node.children.map((child) => compileNode(child, ctx, reelTemplate))
}

function delayOf(node: MarkupNode): number {
  return num(attr(node, 'delay'), 0, `${node.tag}.delay`)
}

function sceneStartsForMarkup(sceneNodes: MarkupNode[], fps: VeloxFps): number[] {
  const starts: number[] = []
  let cursorFrames = 0
  for (const sn of sceneNodes) {
    starts.push(cursorFrames / fps)
    const frames = Math.round(num(attr(sn, 'duration'), 5, 'scene.duration') * fps)
    const transFrames =
      attr(sn, 'transition') !== undefined
        ? Math.round(num(attr(sn, 'transitionDuration'), 0.55, 'scene.transitionDuration') * fps)
        : 0
    cursorFrames += frames - transFrames
  }
  return starts
}

function compileSceneChildren(
  node: MarkupNode,
  sceneDuration: number,
  ctx: CompileContext,
  reelTemplate?: ReelTemplateId,
): AnyElement[] {
  const meta = new Set(['sfx', 'beat', 'audio', 'assetPack'])
  const drawable = node.children.filter((c) => !meta.has(c.tag))
  const staggerStep = num(attr(node, 'staggerStep'), 0, 'scene.staggerStep')
  const out: AnyElement[] = []

  drawable.forEach((child, drawableIndex) => {
    let el: AnyElement
    if (child.tag === 'captions')
      el = compileCaptionsMarkup(child, ctx, sceneDuration, reelTemplate)
    else el = compileNode(child, ctx, reelTemplate)

    if (staggerStep > 0) el.bumpEntranceDelay(staggerStep * drawableIndex)

    const next = drawable
      .slice(drawableIndex + 1)
      .find((candidate) => delayOf(candidate) > delayOf(child))
    const nextDelay = next ? delayOf(next) : sceneDuration
    const currentDelay = delayOf(child)
    if (nextDelay - currentDelay > 0.8 && nextDelay < sceneDuration) {
      el.out('fadeOut', 0.35, { at: Math.max(currentDelay + 0.45, nextDelay - 0.35) })
    }

    out.push(el)
  })
  return out
}

function collectAudioFromVideoRoot(root: MarkupNode, fps: VeloxFps): VeloxAudioPlan {
  const sfx: SfxCue[] = []
  const beats: number[] = []
  let musicPlan: VeloxAudioPlan['music']

  const musicAttr = attr(root, 'music')
  if (musicAttr) {
    musicPlan = {
      src: musicAttr,
      volume: attr(root, 'musicVolume') !== undefined ? num(attr(root, 'musicVolume'), 0.45, 'video.musicVolume') : undefined,
    }
  }

  for (const ch of root.children) {
    if (ch.tag === 'audio') {
      musicPlan = {
        src: requiredAttr(ch, 'src'),
        volume: attr(ch, 'volume') !== undefined ? num(attr(ch, 'volume'), 0.5, 'audio.volume') : undefined,
      }
    }
  }

  const sceneNodes = root.children.filter((c) => c.tag === 'scene')
  const starts = sceneStartsForMarkup(sceneNodes, fps)

  sceneNodes.forEach((sn, sceneIndex) => {
    const offset = starts[sceneIndex] ?? 0
    for (const ch of sn.children) {
      if (ch.tag === 'sfx') {
        sfx.push({
          name: requiredAttr(ch, 'name'),
          at: offset + num(attr(ch, 'at'), 0, 'sfx.at'),
          volume: attr(ch, 'volume') !== undefined ? num(attr(ch, 'volume'), 1, 'sfx.volume') : undefined,
        })
      }
      if (ch.tag === 'beat') {
        beats.push(offset + num(attr(ch, 'at'), 0, 'beat.at'))
      }
    }
  })

  return { music: musicPlan, sfx, beats: beats.sort((a, b) => a - b) }
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
  const tplRaw = attr(node, 'template')
  if (tplRaw && !isReelTemplate(tplRaw))
    fail(
      `<scene> template="${tplRaw}" is invalid. Use none, topTextBottomVisual, splitLeftRight, centerCard, headlineThenProof…`,
    )
  const reelTemplate = tplRaw && isReelTemplate(tplRaw) ? (tplRaw as ReelTemplateId) : undefined

  const sceneAudio = node.children.find((c) => c.tag === 'audio')
  if (sceneAudio) {
    s.audio(requiredAttr(sceneAudio, 'src'), {
      volume: attr(sceneAudio, 'volume') !== undefined ? num(attr(sceneAudio, 'volume'), 1, 'audio.volume') : undefined,
      startFrom: attr(sceneAudio, 'startFrom') !== undefined ? num(attr(sceneAudio, 'startFrom'), 0, 'audio.startFrom') : undefined,
    })
  }

  const bg = background(attr(node, 'background'))
  if (bg) s.background(bg)
  s.add(...compileSceneChildren(node, duration, ctx, reelTemplate === 'none' ? undefined : reelTemplate))
  return s
}

export function createVideoFromMarkup(markup: string): VeloxVideo {
  const root = parseVeloxMarkup(markup)
  const theme = resolveTheme(attr(root, 'theme') ?? 'obsidian') ?? resolveTheme('obsidian')!
  const sceneNodes = root.children.filter((c) => c.tag === 'scene')
  const scenes = sceneNodes.map((child) => compileScene(child, { theme }))
  if (scenes.length === 0) fail('<video> requires at least one <scene>.')

  const mqAttr = attr(root, 'motionQuality')
  let motionQuality: MotionQuality | undefined
  if (mqAttr) {
    if (mqAttr !== 'standard' && mqAttr !== 'premium')
      fail(`video motionQuality="${mqAttr}" must be standard or premium.`)
    motionQuality = mqAttr as MotionQuality
  }

  const fps = num(attr(root, 'fps'), 60, 'video.fps') as VeloxFps
  const audioPlanRaw = collectAudioFromVideoRoot(root, fps)
  const hasAnyAudioCue =
    Boolean(audioPlanRaw.music) ||
    audioPlanRaw.sfx.length > 0 ||
    audioPlanRaw.beats.length > 0

  return createVideo({
    size: (attr(root, 'size') as VeloxSize | undefined) ?? 'portrait',
    fps,
    theme,
    background: rootBackground(attr(root, 'background')),
    motionQuality,
    scenes,
    ...(audioPlanRaw.music
      ? { audio: { src: audioPlanRaw.music.src, volume: audioPlanRaw.music.volume ?? 1 } }
      : {}),
    ...(hasAnyAudioCue ? { audioPlan: audioPlanRaw } : {}),
  })
}

export { isVeloxMarkup }

