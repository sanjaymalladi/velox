import { createVideo, type RawVideoInput, type VeloxVideo } from './core/Video'
import { scene, type SceneBuilder } from './core/Scene'
import { text } from './elements/Text'
import { shape } from './elements/Shape'
import { image } from './elements/Image'
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
  | 'image'
  | 'feature'

/**
 * Per-section (or global) style overrides.
 * All fields are optional — unset fields fall back to the active theme.
 */
export interface SectionStyle {
  /** Override font family for this section */
  font?: string
  /** Solid background color override */
  background?: string
  /** Gradient background: [from, to] or [from, to, angle] */
  backgroundGradient?: [string, string] | [string, string, string]
  /** Override heading/body text color */
  textColor?: string
  /** Override accent / highlight color */
  accentColor?: string
  /** Explicit title font size in px */
  titleSize?: number
  /** Explicit body font size in px */
  bodySize?: number
}

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
  /** URL or file path for a full-bleed background image on this section */
  backgroundImage?: string
  /** URL or file path for an overlay/inset image */
  overlayImage?: string
  /** Explicit [width, height] for the overlay image in pixels */
  overlayImageSize?: [number, number]
  /** Where to anchor the overlay image */
  overlayImagePosition?: 'center' | 'left' | 'right' | 'topRight' | 'bottomRight'
  /** Per-section style overrides (font, colors, background) */
  style?: SectionStyle
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
  /** Style overrides applied to every section (section-level style takes priority) */
  globalStyle?: SectionStyle
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

/** Merge globalStyle + section-level style (section wins on conflicts) */
function mergeStyle(global?: SectionStyle, local?: SectionStyle): SectionStyle {
  return { ...global, ...local }
}

function sceneBackground(theme: VeloxTheme, type: NarrativeSectionType, style?: SectionStyle) {
  // Style overrides take top priority
  if (style?.backgroundGradient) {
    const [from, to, angle = '160deg'] = style.backgroundGradient
    return shape.gradient(angle, theme.background, from, to)
  }
  if (style?.background) return style.background

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

function foregroundText(theme: VeloxTheme, style?: SectionStyle): string {
  return style?.textColor ?? (theme.background === '#ffffff' ? '#f8fafc' : theme.text)
}

function foregroundMuted(theme: VeloxTheme, style?: SectionStyle): string {
  return style?.textColor
    ? style.textColor
    : theme.background === '#ffffff'
      ? 'rgba(248,250,252,0.76)'
      : theme.muted
}

export function heroTitle(props: HeroTitleProps, options?: { size?: [number, number]; theme?: LlmThemeName | VeloxTheme }): AnyElement[] {
  const size = options?.size ?? [1920, 1080]
  const theme = aliasTheme(options?.theme)
  const portrait = isPortrait(size)
  const align = props.align ?? (portrait ? 'left' : 'center')
  const anchorX = safeX(size)
  const yBase = portrait ? Math.round(size[1] * 0.22) : Math.round(size[1] * 0.38)
  const maxTitleWidth = portrait ? Math.round(size[0] * 0.78) : Math.round(size[0] * 0.74)

  const elements: AnyElement[] = []

  if (props.eyebrow) {
    const eyebrow = text(props.eyebrow)
      .size(portrait ? 24 : 20)
      .weight(700)
      .letterSpacing(4)
      .uppercase()
      .color(theme?.accent ?? theme?.secondary ?? '#a78bfa')
      .align(align)
      .wrap(maxTitleWidth)
      .in('fadeIn', 0.35)

    if (align === 'center') eyebrow.center({ offsetY: portrait ? -210 : -160 })
    else eyebrow.pos(anchorX, yBase - Math.round(size[1] * 0.07))
    elements.push(eyebrow)
  }

  const titleEl = text(props.title)
    .size(titleSize(size))
    .weight(850)
    .gradient('#ffffff', theme?.primary ?? '#a78bfa')
    .lineHeight(1.05)
    .align(align)
    .wrap(maxTitleWidth)
    .maxHeight(Math.round(size[1] * (portrait ? 0.2 : 0.28)))
    .in('slideUp', 0.6)

  if (align === 'center') titleEl.center({ offsetY: -60 })
  else titleEl.pos(anchorX, yBase)
  elements.push(titleEl)

  if (props.subtitle) {
    const subtitle = text(props.subtitle)
      .size(subtitleSize(size))
      .lineHeight(1.35)
      .color(theme?.background === '#ffffff' ? 'rgba(248,250,252,0.74)' : theme?.muted ?? 'rgba(255,255,255,0.72)')
      .align(align)
      .wrap(maxTitleWidth)
      .maxHeight(Math.round(size[1] * 0.16))
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
  const top = isPortrait(size) ? Math.round(size[1] * 0.38) : safeY(size) + 120
  const maxW = props.maxWidth ?? Math.round(size[0] * (isPortrait(size) ? 0.78 : 0.72))
  const textColor = theme?.background === '#ffffff' ? '#f8fafc' : cardText(theme!)

  const elements: AnyElement[] = []
  if (props.heading) {
    elements.push(
      text(props.heading)
        .pos(left, top)
        .size(isPortrait(size) ? 52 : 44)
        .weight(780)
        .color(textColor)
        .wrap(maxW)
        .maxHeight(Math.round(size[1] * 0.16))
        .in('slideDown', 0.45)
    )
  }

  elements.push(
    text.list(props.points.slice(0, 6))
      .pos(left, top + (props.heading ? 100 : 0))
      .size(isPortrait(size) ? 34 : 26)
      .weight(500)
      .color(textColor)
      .gap(isPortrait(size) ? 24 : 16)
      .bullet('•')
      .wrap(maxW)
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
      .pos(x - Math.round(width / 2) + 36, y - 18)
      .size(isPortrait(size) ? 46 : 48)
      .weight(860)
      .color(cardText(theme!))
      .align('left')
      .wrap(width - 72)
      .in('slideUp', 0.45, { delay: 0.12 }),
    text(props.title)
      .pos(x - Math.round(width / 2) + 36, y + 40)
      .size(isPortrait(size) ? 24 : 20)
      .color(theme?.muted ?? 'rgba(255,255,255,0.7)')
      .align('left')
      .wrap(width - 72)
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
  const cardW = direction === 'horizontal' ? Math.round(size[0] * 0.18) : Math.round(size[0] * 0.72)
  const cardH = Math.round(size[1] * (portrait ? 0.105 : 0.14))
  const gap = direction === 'horizontal' ? Math.round(size[0] * 0.045) : Math.round(size[1] * 0.035)
  const startX = direction === 'horizontal'
    ? Math.round((size[0] - (count * cardW + (count - 1) * gap)) / 2) + Math.round(cardW / 2)
    : Math.round(size[0] / 2)
  const startY = direction === 'vertical'
    ? Math.round(size[1] * 0.34)
    : Math.round(size[1] * 0.52)

  if (props.title) {
    elements.push(
      text(props.title)
        .center({ offsetY: direction === 'horizontal' ? -220 : -Math.round(size[1] * 0.36) })
        .size(isPortrait(size) ? 50 : 40)
        .weight(800)
        .color(theme?.background === '#ffffff' ? '#f8fafc' : cardText(theme!))
        .align('center')
        .wrap(Math.round(size[0] * 0.78))
        .in('slideDown', 0.4)
    )
  }

  steps.forEach((step, index) => {
    const x = direction === 'horizontal' ? startX + index * (cardW + gap) : startX
    const y = direction === 'vertical' ? startY + index * (cardH + gap) : startY

    elements.push(
      shape.rect(cardW, cardH).pos(x, y).color(cardBackground(theme!)).radius(20).in('zoomIn', 0.35, { delay: index * 0.08 }),
      text(step)
        .pos(x - Math.round(cardW / 2) + 34, y + 4)
        .size(isPortrait(size) ? 30 : 24)
        .weight(760)
        .color(cardText(theme!))
        .align('left')
        .wrap(cardW - 68)
        .in('fadeIn', 0.3, { delay: 0.12 + index * 0.08 })
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

// ─── Overlay image helper ─────────────────────────────────────────────────────

function buildOverlay(section: VideoSection, ctx: ShotContext): AnyElement[] {
  if (!section.overlayImage) return []
  const [imgW, imgH] = section.overlayImageSize ?? [
    Math.round(ctx.size[0] * 0.3),
    Math.round(ctx.size[1] * 0.3),
  ]
  const pos = section.overlayImagePosition ?? 'bottomRight'
  const pad = safeX(ctx.size)
  let x: number, y: number
  switch (pos) {
    case 'left':        x = pad + imgW / 2;                    y = Math.round(ctx.size[1] / 2); break
    case 'right':       x = ctx.size[0] - pad - imgW / 2;      y = Math.round(ctx.size[1] / 2); break
    case 'topRight':    x = ctx.size[0] - pad - imgW / 2;      y = pad + imgH / 2;              break
    case 'bottomRight': x = ctx.size[0] - pad - imgW / 2;      y = ctx.size[1] - pad - imgH / 2; break
    default:            x = Math.round(ctx.size[0] / 2);       y = Math.round(ctx.size[1] / 2); break
  }
  return [image(section.overlayImage).size(imgW, imgH).pos(x, y).radius(16).in('zoomIn', 0.4)]
}

export const shots = {
  titleReveal(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const style = ctx.style
    const textColor = style?.textColor ?? ctx.theme.text
    const sc = scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type, style))
    if (section.backgroundImage) sc.add(image(section.backgroundImage).fill().brightness(0.45).in('fadeIn', 0.6))
    sc.add(...heroTitle({ eyebrow: section.type.toUpperCase(), title: section.heading ?? ctx.title, subtitle: section.subheading ?? ctx.subtitle }, ctx))
    if (section.overlayImage) sc.add(...buildOverlay(section, ctx))
    return sc
  },

  bulletSection(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const style = ctx.style
    const sc = scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type, style))
    if (section.backgroundImage) sc.add(image(section.backgroundImage).fill().brightness(0.35).in('fadeIn', 0.6))
    sc.add(
      ...heroTitle({ title: section.heading ?? 'Key Points', subtitle: section.subheading, align: 'left' }, ctx),
      ...bulletList({ points: (section.points ?? []).slice(0, 6) }, ctx),
    )
    if (section.overlayImage) sc.add(...buildOverlay(section, ctx))
    return sc
  },

  statsSection(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const stats = (section.stats ?? []).slice(0, isPortrait(ctx.size) ? 2 : 3)
    const gap = Math.round(ctx.size[0] * 0.03)
    const width = Math.round(ctx.size[0] * (isPortrait(ctx.size) ? 0.76 : 0.26))
    const startX = isPortrait(ctx.size)
      ? Math.round(ctx.size[0] / 2)
      : Math.round((ctx.size[0] - (stats.length * width + Math.max(stats.length - 1, 0) * gap)) / 2 + width / 2)
    const topY = isPortrait(ctx.size) ? Math.round(ctx.size[1] * 0.44) : Math.round(ctx.size[1] * 0.56)
    const cardH = Math.round(ctx.size[1] * (isPortrait(ctx.size) ? 0.16 : 0.2))
    const sc = scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type, ctx.style))
    if (section.backgroundImage) sc.add(image(section.backgroundImage).fill().brightness(0.3).in('fadeIn', 0.6))
    sc.add(
      ...heroTitle({ title: section.heading ?? 'Metrics', subtitle: section.subheading }, ctx),
      ...stats.flatMap((item, index) => {
        const x = isPortrait(ctx.size) ? startX : startX + index * (width + gap)
        const y = isPortrait(ctx.size) ? topY + index * Math.round(ctx.size[1] * 0.18) : topY
        return statCard({ title: item.label, value: item.value, accent: item.accent }, { ...ctx, position: { x, y }, width, height: cardH })
      }),
    )
    return sc
  },

  processDiagram(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const sc = scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type, ctx.style))
    if (section.backgroundImage) sc.add(image(section.backgroundImage).fill().brightness(0.3).in('fadeIn', 0.6))
    sc.add(...flowchart({ title: section.heading ?? 'Process', steps: section.steps ?? [] }, ctx))
    return sc
  },

  quoteBreak(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const sc = scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type, ctx.style))
    if (section.backgroundImage) sc.add(image(section.backgroundImage).fill().brightness(0.35).blur(8).in('fadeIn', 0.6))
    sc.add(...quoteCard(section.quote ?? section.heading ?? '', section.speaker, ctx))
    return sc
  },

  comparison(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const comparison = section.comparison
    if (!comparison) return shots.bulletSection(section, ctx)
    const leftX = Math.round(ctx.size[0] * 0.26)
    const rightX = Math.round(ctx.size[0] * 0.74)
    const headingY = Math.round(ctx.size[1] * 0.3)
    const bodyY = Math.round(ctx.size[1] * 0.42)
    const textColor = ctx.style?.textColor ?? ctx.theme.text
    const accentColor = ctx.style?.accentColor ?? ctx.theme.accent ?? ctx.theme.secondary
    const halfW = Math.round(ctx.size[0] * 0.44)
    return scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type, ctx.style))
      .add(
        ...heroTitle({ title: section.heading ?? 'Comparison', subtitle: section.subheading }, ctx),
        shape.line(Math.round(ctx.size[1] * 0.42)).pos(Math.round(ctx.size[0] / 2), Math.round(ctx.size[1] * 0.56)).color(accentColor).thickness(4).in('growUp', 0.4),
        text(comparison.leftTitle).pos(leftX - 180, headingY).size(34).weight(800).color(textColor).wrap(halfW).in('slideDown', 0.4),
        text(comparison.rightTitle).pos(rightX - 180, headingY).size(34).weight(800).color(textColor).wrap(halfW).in('slideDown', 0.4, { delay: 0.12 }),
        text.list(comparison.leftPoints.slice(0, 5)).pos(leftX - 180, bodyY).size(24).color(textColor).wrap(halfW).stagger('slideUp', 0.1),
        text.list(comparison.rightPoints.slice(0, 5)).pos(rightX - 180, bodyY).size(24).color(textColor).wrap(halfW).stagger('slideUp', 0.1),
      )
  },

  /** Full-bleed image scene with optional title/caption overlay */
  imageScene(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const src = section.backgroundImage ?? section.overlayImage ?? ''
    const textColor = ctx.style?.textColor ?? ctx.theme.text
    const sc = scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type, ctx.style))
    if (src) sc.add(image(src).fill().in('fadeIn', 0.7))
    if (section.heading) {
      sc.add(
        shape.rect(ctx.size[0], Math.round(ctx.size[1] * 0.28))
          .pos(Math.round(ctx.size[0] / 2), Math.round(ctx.size[1] * 0.86))
          .color('rgba(0,0,0,0.55)')
          .in('fadeIn', 0.4),
        text(section.heading)
          .pos(safeX(ctx.size), Math.round(ctx.size[1] * 0.82))
          .size(ctx.style?.titleSize ?? titleSize(ctx.size))
          .weight(700)
          .color(textColor)
          .wrap(Math.round(ctx.size[0] * 0.85))
          .in('slideUp', 0.45, { delay: 0.2 }),
      )
    }
    if (section.subheading) {
      sc.add(
        text(section.subheading)
          .pos(safeX(ctx.size), Math.round(ctx.size[1] * 0.9))
          .size(ctx.style?.bodySize ?? subtitleSize(ctx.size))
          .color('rgba(255,255,255,0.8)')
          .wrap(Math.round(ctx.size[0] * 0.85))
          .in('fadeIn', 0.4, { delay: 0.3 }),
      )
    }
    return sc
  },

  /** Side-by-side: image on one half, bullet list on the other */
  featureSection(section: VideoSection, ctx: ShotContext): SceneBuilder {
    const portrait = isPortrait(ctx.size)
    const imgSrc = section.overlayImage ?? section.backgroundImage
    const textColor = ctx.style?.textColor ?? ctx.theme.text
    const accentColor = ctx.style?.accentColor ?? ctx.theme.accent ?? ctx.theme.secondary
    const imgW = portrait ? Math.round(ctx.size[0] * 0.85) : Math.round(ctx.size[0] * 0.44)
    const imgH = portrait ? Math.round(ctx.size[1] * 0.38) : Math.round(ctx.size[1] * 0.62)
    const imgX = portrait ? Math.round(ctx.size[0] / 2) : Math.round(ctx.size[0] * 0.27)
    const imgY = portrait ? Math.round(ctx.size[1] * 0.28) : Math.round(ctx.size[1] / 2)
    const textX = portrait ? safeX(ctx.size) : Math.round(ctx.size[0] * 0.55)
    const textY = portrait ? Math.round(ctx.size[1] * 0.56) : Math.round(ctx.size[1] * 0.34)
    const listMaxW = portrait ? Math.round(ctx.size[0] * 0.85) : Math.round(ctx.size[0] * 0.4)

    const sc = scene(ctx.duration)
      .background(sceneBackground(ctx.theme, section.type, ctx.style))
    if (imgSrc) {
      sc.add(image(imgSrc).size(imgW, imgH).pos(imgX, imgY).radius(20).in('zoomIn', 0.5))
    }
    if (section.heading) {
      sc.add(
        text(section.heading)
          .pos(textX, textY)
          .size(ctx.style?.titleSize ?? (portrait ? 40 : 44))
          .weight(800)
          .color(textColor)
          .wrap(listMaxW)
          .in('slideDown', 0.4),
      )
    }
    if (section.points?.length) {
      sc.add(
        text.list(section.points.slice(0, 5))
          .pos(textX, textY + (section.heading ? Math.round(ctx.size[1] * 0.1) : 0))
          .size(ctx.style?.bodySize ?? (portrait ? 26 : 28))
          .color(textColor)
          .wrap(listMaxW)
          .stagger('slideUp', 0.12),
      )
    }
    return sc
  },
}

interface ShotContext {
  size: [number, number]
  theme: VeloxTheme
  duration: number
  title: string
  subtitle?: string
  style?: SectionStyle
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
    case 'image':
      return shots.imageScene(section, ctx)
    case 'feature':
      return shots.featureSection(section, ctx)
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
    style: mergeStyle(spec.globalStyle, section.style),
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
