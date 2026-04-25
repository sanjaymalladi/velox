import { createVideo, type RawVideoInput, type VeloxVideo } from './core/Video'
import { scene, type SceneBuilder } from './core/Scene'
import { text } from './elements/Text'
import { shape } from './elements/Shape'
import { resolveTheme } from './themes'
import type { VeloxSize, VeloxTheme } from './types'
import type { Element } from './core/Element'

type AnyElement = Element<any>

export type AspectRatioPreset = '16:9' | '9:16' | '1:1' | '4:5' | '21:9'

export type LlmThemeName =
  | 'darkNeon'
  | 'corporate'
  | 'warmCinema'
  | 'brutalist'
  | 'pastel'
  | 'presentation'
  | 'explainer'
  | 'finance'
  | 'tech'
  | 'social'
  | 'education'

export type NarrativeSectionType =
  | 'hook'
  | 'problem'
  | 'solution'
  | 'process'
  | 'stats'
  | 'quote'
  | 'timeline'
  | 'comparison'
  | 'cta'

export interface VideoSection {
  type: NarrativeSectionType
  heading?: string
  subheading?: string
  points?: string[]
  steps?: string[]
  quote?: string
  speaker?: string
  stats?: Array<{ label: string; value: string; accent?: string }>
  comparison?: {
    leftTitle: string
    rightTitle: string
    leftPoints: string[]
    rightPoints: string[]
  }
  duration?: number
}

export interface LlmVideoSpec {
  title: string
  subtitle?: string
  duration?: number
  aspectRatio?: AspectRatioPreset
  size?: VeloxSize
  theme?: LlmThemeName | VeloxTheme
  pace?: 'slow' | 'normal' | 'fast'
  sections: VideoSection[]
}

export interface HeroTitleProps {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}

export interface BulletListProps {
  heading?: string
  points: string[]
  maxWidth?: number
}

export interface StatCardProps {
  title: string
  value: string
  accent?: string
}

export interface FlowchartProps {
  title?: string
  steps: string[]
  direction?: 'horizontal' | 'vertical'
}

const THEME_ALIASES: Record<string, VeloxTheme | string> = {
  presentation: 'darkNeon',
  explainer: 'darkNeon',
  finance: 'corporate',
  tech: 'darkNeon',
  social: 'pastel',
  education: 'corporate',
}

function aliasTheme(theme: LlmThemeName | VeloxTheme | undefined): VeloxTheme | undefined {
  if (!theme) return resolveTheme('darkNeon')
  if (typeof theme === 'string') {
    return resolveTheme(THEME_ALIASES[theme] ?? theme)
  }
  return resolveTheme(theme)
}

function resolveCanvasSize(size?: VeloxSize, aspectRatio?: AspectRatioPreset): [number, number] {
  if (Array.isArray(size)) return size
  const preset = size ?? aspectRatio ?? '16:9'
  const map: Record<string, [number, number]> = {
    '1080p': [1920, 1080],
    '720p': [1280, 720],
    '4k': [3840, 2160],
    'square': [1080, 1080],
    'portrait': [1080, 1920],
    '16:9': [1920, 1080],
    '9:16': [1080, 1920],
    '1:1': [1080, 1080],
    '4:5': [1080, 1350],
    '21:9': [2520, 1080],
  }

  return map[preset] ?? [1920, 1080]
}

function isPortrait(size: [number, number]): boolean {
  return size[1] > size[0]
}

function safeX(size: [number, number], ratio = 0.08): number {
  return Math.round(size[0] * ratio)
}

function safeY(size: [number, number], ratio = 0.08): number {
  return Math.round(size[1] * ratio)
}

function titleSize(size: [number, number]): number {
  return isPortrait(size) ? Math.round(size[0] * 0.1) : Math.round(size[0] * 0.048)
}

function subtitleSize(size: [number, number]): number {
  return isPortrait(size) ? Math.round(size[0] * 0.04) : Math.round(size[0] * 0.022)
}

function sectionDuration(section: VideoSection, pace: LlmVideoSpec['pace']): number {
  if (section.duration) return section.duration
  const paceMap = { slow: 1.25, normal: 1, fast: 0.82 }
  const multiplier = paceMap[pace ?? 'normal']
  switch (section.type) {
    case 'hook':
    case 'cta':
      return 4 * multiplier
    case 'stats':
    case 'quote':
      return 5 * multiplier
    case 'process':
    case 'timeline':
    case 'comparison':
      return 6 * multiplier
    default:
      return 5 * multiplier
  }
}

function splitDuration(totalDuration: number | undefined, sections: VideoSection[], pace: LlmVideoSpec['pace']): number[] {
  const explicit = sections.map((section) => section.duration ?? 0)
  const missing = sections
    .map((section, index) => ({ index, section }))
    .filter((item) => !item.section.duration)

  const used = explicit.reduce((sum, value) => sum + value, 0)
  const fallbackTotal = missing.reduce((sum, item) => sum + sectionDuration(item.section, pace), 0)
  const target = totalDuration && totalDuration > used ? totalDuration - used : fallbackTotal

  return sections.map((section, index) => {
    if (section.duration) return section.duration
    const base = sectionDuration(section, pace)
    return fallbackTotal > 0 ? Number(((base / fallbackTotal) * target).toFixed(2)) : Number(base.toFixed(2))
  })
}

function sceneBackground(theme: VeloxTheme, type: NarrativeSectionType) {
  switch (type) {
    case 'problem':
      return shape.gradient('160deg', theme.background, '#24131c', '#43111c')
    case 'solution':
    case 'process':
      return shape.gradient('160deg', theme.background, '#10192a', '#15283f')
    case 'stats':
      return shape.gradient('160deg', theme.background, '#101328', '#20153c')
    case 'cta':
      return shape.gradient('145deg', theme.primary, theme.secondary)
    default:
      return shape.gradient('160deg', theme.background, '#10131f', theme.background)
  }
}

function cardBackground(theme: VeloxTheme): string {
  return theme.background === '#ffffff' ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.08)'
}

function cardText(theme: VeloxTheme): string {
  return theme.text
}

function cardAccent(theme: VeloxTheme, accent?: string): string {
  return accent ?? theme.accent ?? theme.secondary
}

export function heroTitle(props: HeroTitleProps, options?: { size?: [number, number]; theme?: LlmThemeName | VeloxTheme }): AnyElement[] {
  const size = options?.size ?? [1920, 1080]
  const theme = aliasTheme(options?.theme)
  const portrait = isPortrait(size)
  const align = props.align ?? (portrait ? 'left' : 'center')
  const anchorX = safeX(size)
  const yBase = portrait ? safeY(size) + 180 : Math.round(size[1] * 0.38)

  const elements: AnyElement[] = []

  if (props.eyebrow) {
    const eyebrow = text(props.eyebrow)
      .size(portrait ? 24 : 20)
      .weight(700)
      .letterSpacing(4)
      .uppercase()
      .color(theme?.accent ?? theme?.secondary ?? '#a78bfa')
      .align(align)
      .in('fadeIn', 0.35)

    if (align === 'center') eyebrow.center({ offsetY: -160 })
    else eyebrow.pos(anchorX, yBase - 120)
    elements.push(eyebrow)
  }

  const titleEl = text(props.title)
    .size(titleSize(size))
    .weight(850)
    .gradient('#ffffff', theme?.primary ?? '#a78bfa')
    .lineHeight(1.05)
    .align(align)
    .in('slideUp', 0.6)

  if (align === 'center') titleEl.center({ offsetY: -60 })
  else titleEl.pos(anchorX, yBase)
  elements.push(titleEl)

  if (props.subtitle) {
    const subtitle = text(props.subtitle)
      .size(subtitleSize(size))
      .lineHeight(1.35)
      .color(theme?.muted ?? 'rgba(255,255,255,0.72)')
      .align(align)
      .in('fadeIn', 0.45, { delay: 0.25 })

    if (align === 'center') subtitle.center({ offsetY: 72 })
    else subtitle.pos(anchorX, yBase + Math.round(size[1] * 0.14))
    elements.push(subtitle)
  }

  return elements
}

export function bulletList(props: BulletListProps, options?: { size?: [number, number]; theme?: LlmThemeName | VeloxTheme }): AnyElement[] {
  const size = options?.size ?? [1920, 1080]
  const theme = aliasTheme(options?.theme)
  const left = safeX(size)
  const top = safeY(size) + 120

  const elements: AnyElement[] = []
  if (props.heading) {
    elements.push(
      text(props.heading)
        .pos(left, top)
        .size(isPortrait(size) ? 52 : 44)
        .weight(780)
        .color(cardText(theme!))
        .in('slideDown', 0.45)
    )
  }

  elements.push(
    text.list(props.points.slice(0, 6))
      .pos(left, top + (props.heading ? 100 : 0))
      .size(isPortrait(size) ? 30 : 26)
      .weight(500)
      .color(cardText(theme!))
      .gap(isPortrait(size) ? 20 : 16)
      .stagger('slideUp', 0.14)
  )

  return elements
}

export function statCard(props: StatCardProps, options?: {
  size?: [number, number]
  theme?: LlmThemeName | VeloxTheme
  position?: { x: number; y: number }
  width?: number
  height?: number
}): AnyElement[] {
  const size = options?.size ?? [1920, 1080]
  const theme = aliasTheme(options?.theme)
  const width = options?.width ?? Math.round(size[0] * (isPortrait(size) ? 0.78 : 0.28))
  const height = options?.height ?? Math.round(size[1] * 0.22)
  const x = options?.position?.x ?? Math.round(size[0] / 2)
  const y = options?.position?.y ?? Math.round(size[1] / 2)
  const accent = cardAccent(theme!, props.accent)

  return [
    shape.rect(width, height)
      .pos(x, y)
      .color(cardBackground(theme!))
      .radius(24)
      .in('zoomIn', 0.35),
    shape.line(width - 60)
      .pos(x, y - Math.round(height / 2) + 26)
      .color(accent)
      .thickness(6)
      .in('expandX', 0.45, { delay: 0.1 }),
    text(props.value)
      .pos(x - Math.round(width / 2) + 32, y - 12)
      .size(isPortrait(size) ? 52 : 48)
      .weight(860)
      .color(cardText(theme!))
      .in('slideUp', 0.45, { delay: 0.12 }),
    text(props.title)
      .pos(x - Math.round(width / 2) + 32, y + 42)
      .size(isPortrait(size) ? 22 : 20)
      .color(theme?.muted ?? 'rgba(255,255,255,0.7)')
      .in('fadeIn', 0.35, { delay: 0.22 }),
  ]
}

export function quoteCard(quote: string, speaker: string | undefined, options?: { size?: [number, number]; theme?: LlmThemeName | VeloxTheme }): AnyElement[] {
  const size = options?.size ?? [1920, 1080]
  const theme = aliasTheme(options?.theme)
  const width = Math.round(size[0] * (isPortrait(size) ? 0.84 : 0.74))
  const height = Math.round(size[1] * 0.42)
  const centerY = Math.round(size[1] * 0.5)

  return [
    shape.rect(width, height)
      .center({ offsetY: 10 })
      .color(cardBackground(theme!))
      .radius(28)
      .in('zoomIn', 0.4),
    text(`“${quote}”`)
      .center({ offsetY: -10 })
      .size(isPortrait(size) ? 40 : 42)
      .weight(700)
      .lineHeight(1.25)
      .color(cardText(theme!))
      .align('center')
      .in('fadeIn', 0.5, { delay: 0.16 }),
    ...(speaker ? [
      text(speaker)
        .center({ offsetY: centerY > 0 ? 128 : 128 })
        .size(isPortrait(size) ? 22 : 20)
        .color(theme?.accent ?? theme?.secondary ?? '#a78bfa')
        .align('center')
        .in('fadeIn', 0.35, { delay: 0.28 }),
    ] : []),
  ]
}

export function flowchart(props: FlowchartProps, options?: { size?: [number, number]; theme?: LlmThemeName | VeloxTheme }): AnyElement[] {
  const size = options?.size ?? [1920, 1080]
  const theme = aliasTheme(options?.theme)
  const portrait = isPortrait(size)
  const direction = props.direction ?? (portrait ? 'vertical' : 'horizontal')
  const steps = props.steps.slice(0, 6)
  const count = Math.max(steps.length, 1)
  const elements: AnyElement[] = []
  const cardW = direction === 'horizontal' ? Math.round(size[0] * 0.18) : Math.round(size[0] * 0.62)
  const cardH = Math.round(size[1] * (portrait ? 0.11 : 0.14))
  const gap = direction === 'horizontal' ? Math.round(size[0] * 0.045) : Math.round(size[1] * 0.04)
  const startX = direction === 'horizontal'
    ? Math.round((size[0] - (count * cardW + (count - 1) * gap)) / 2) + Math.round(cardW / 2)
    : Math.round(size[0] / 2)
  const startY = direction === 'vertical'
    ? Math.round(size[1] * 0.26)
    : Math.round(size[1] * 0.52)

  if (props.title) {
    elements.push(
      text(props.title)
        .center({ offsetY: direction === 'horizontal' ? -220 : -Math.round(size[1] * 0.34) })
        .size(isPortrait(size) ? 44 : 40)
        .weight(800)
        .color(cardText(theme!))
        .align('center')
        .in('slideDown', 0.4)
    )
  }

  steps.forEach((step, index) => {
    const x = direction === 'horizontal' ? startX + index * (cardW + gap) : startX
    const y = direction === 'vertical' ? startY + index * (cardH + gap) : startY

    elements.push(
      shape.rect(cardW, cardH).pos(x, y).color(cardBackground(theme!)).radius(20).in('zoomIn', 0.35, { delay: index * 0.08 }),
      text(step).pos(x - Math.round(cardW / 2) + 22, y + 6).size(isPortrait(size) ? 26 : 24).weight(700).color(cardText(theme!)).in('fadeIn', 0.3, { delay: 0.12 + index * 0.08 })
    )

    if (index < steps.length - 1) {
      const nextX = direction === 'horizontal' ? x + Math.round(cardW / 2) + Math.round(gap / 2) : x
      const nextY = direction === 'vertical' ? y + Math.round(cardH / 2) + Math.round(gap / 2) : y
      const lineLength = direction === 'horizontal' ? gap : gap
      const connector = shape.line(lineLength).color(theme?.accent ?? theme?.secondary ?? '#a78bfa').thickness(5).in('expandX', 0.3, { delay: 0.2 + index * 0.08 })
      if (direction === 'horizontal') connector.pos(nextX, y)
      else connector.pos(nextX, nextY)
      elements.push(connector)
    }
  })

  return elements
}

export const cards = {
  metric: statCard,
  quote: quoteCard,
}

export const diagrams = {
  flowchart,
}

export const shots = {
  titleReveal(section: VideoSection, ctx: ShotContext): SceneBuilder {
    return scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type))
      .add(
        ...heroTitle({
          eyebrow: section.type.toUpperCase(),
          title: section.heading ?? ctx.title,
          subtitle: section.subheading ?? ctx.subtitle,
        }, ctx)
      )
  },

  bulletSection(section: VideoSection, ctx: ShotContext): SceneBuilder {
    return scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type))
      .add(
        ...heroTitle({ title: section.heading ?? 'Key Points', subtitle: section.subheading, align: 'left' }, ctx),
        ...bulletList({ points: (section.points ?? []).slice(0, 6) }, ctx),
      )
  },

  statsSection(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const stats = (section.stats ?? []).slice(0, isPortrait(ctx.size) ? 2 : 3)
    const gap = Math.round(ctx.size[0] * 0.03)
    const width = Math.round(ctx.size[0] * (isPortrait(ctx.size) ? 0.78 : 0.26))
    const startX = isPortrait(ctx.size)
      ? Math.round(ctx.size[0] / 2)
      : Math.round((ctx.size[0] - (stats.length * width + Math.max(stats.length - 1, 0) * gap)) / 2 + width / 2)
    const topY = isPortrait(ctx.size) ? Math.round(ctx.size[1] * 0.38) : Math.round(ctx.size[1] * 0.56)

    return scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type))
      .add(
        ...heroTitle({ title: section.heading ?? 'Metrics', subtitle: section.subheading }, ctx),
        ...stats.flatMap((item, index) => {
          const x = isPortrait(ctx.size) ? startX : startX + index * (width + gap)
          const y = isPortrait(ctx.size) ? topY + index * Math.round(ctx.size[1] * 0.2) : topY
          return statCard({
            title: item.label,
            value: item.value,
            accent: item.accent,
          }, {
            ...ctx,
            position: { x, y },
            width,
            height: Math.round(ctx.size[1] * 0.2),
          })
        }),
      )
  },

  processDiagram(section: VideoSection, ctx: ShotContext): SceneBuilder {
    return scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type))
      .add(
        ...flowchart({
          title: section.heading ?? 'Process',
          steps: section.steps ?? [],
        }, ctx)
      )
  },

  quoteBreak(section: VideoSection, ctx: ShotContext): SceneBuilder {
    return scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type))
      .add(
        ...quoteCard(section.quote ?? section.heading ?? '', section.speaker, ctx)
      )
  },

  comparison(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const comparison = section.comparison
    if (!comparison) {
      return shots.bulletSection(section, ctx)
    }

    const leftX = Math.round(ctx.size[0] * 0.26)
    const rightX = Math.round(ctx.size[0] * 0.74)
    const headingY = Math.round(ctx.size[1] * 0.3)
    const bodyY = Math.round(ctx.size[1] * 0.42)

    return scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type))
      .add(
        ...heroTitle({ title: section.heading ?? 'Comparison', subtitle: section.subheading }, ctx),
        shape.line(Math.round(ctx.size[1] * 0.42)).pos(Math.round(ctx.size[0] / 2), Math.round(ctx.size[1] * 0.56)).color(ctx.theme.accent ?? ctx.theme.secondary).thickness(4).in('growUp', 0.4),
        text(comparison.leftTitle).pos(leftX - 180, headingY).size(34).weight(800).color(ctx.theme.text).in('slideDown', 0.4),
        text(comparison.rightTitle).pos(rightX - 180, headingY).size(34).weight(800).color(ctx.theme.text).in('slideDown', 0.4, { delay: 0.12 }),
        text.list(comparison.leftPoints.slice(0, 5)).pos(leftX - 180, bodyY).size(24).color(ctx.theme.text).stagger('slideUp', 0.1),
        text.list(comparison.rightPoints.slice(0, 5)).pos(rightX - 180, bodyY).size(24).color(ctx.theme.text).stagger('slideUp', 0.1),
      )
  },
}

interface ShotContext {
  size: [number, number]
  theme: VeloxTheme
  duration: number
  title: string
  subtitle?: string
}

function sceneFromSection(section: VideoSection, ctx: ShotContext): SceneBuilder {
  switch (section.type) {
    case 'hook':
    case 'solution':
    case 'cta':
      return shots.titleReveal(section, ctx)
    case 'problem':
      return shots.bulletSection(section, ctx)
    case 'stats':
      return shots.statsSection(section, ctx)
    case 'process':
    case 'timeline':
      return shots.processDiagram(section, ctx)
    case 'quote':
      return shots.quoteBreak(section, ctx)
    case 'comparison':
      return shots.comparison(section, ctx)
    default:
      return shots.bulletSection(section, ctx)
  }
}

export function createExplainerVideo(spec: LlmVideoSpec): VeloxVideo {
  const theme = aliasTheme(spec.theme)
  const size = resolveCanvasSize(spec.size, spec.aspectRatio)
  const durations = splitDuration(spec.duration, spec.sections, spec.pace)
  const scenes = spec.sections.map((section, index) => sceneFromSection(section, {
    size,
    theme: theme!,
    duration: durations[index],
    title: spec.title,
    subtitle: spec.subtitle,
  }))

  const input: RawVideoInput = {
    size,
    fps: 30,
    theme: theme!,
    background: theme?.background,
    font: theme?.font,
    scenes,
  }

  return createVideo(input)
}

export function createStoryVideo(spec: LlmVideoSpec): VeloxVideo {
  return createExplainerVideo({
    ...spec,
    pace: spec.pace ?? 'normal',
    sections: spec.sections.length > 0 ? spec.sections : [
      { type: 'hook', heading: spec.title, subheading: spec.subtitle },
      { type: 'cta', heading: 'Next Step', points: ['Review the story and render the final cut'] },
    ],
  })
}

export function createVideoFromSchema(spec: LlmVideoSpec): VeloxVideo {
  return createExplainerVideo(spec)
}
