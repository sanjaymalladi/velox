import { group } from './elements/Group'
import { shape } from './elements/Shape'
import { text } from './elements/Text'
import { layout } from './layout'
import type { Element } from './core/Element'
import type { ElementConfig } from './types'
import type { VeloxAesthetic } from './aesthetics/types'

type AnyElement = Element<ElementConfig>

function applyTypeStyle(
  el: ReturnType<typeof text>,
  style: VeloxAesthetic['typography'][keyof VeloxAesthetic['typography']],
) {
  return el
    .size(style.fontSize)
    .weight(style.fontWeight)
    .letterSpacing(style.letterSpacing)
    .lineHeight(style.lineHeight)
    .font(style.fontFamily)
}

export function themedTypography(aesthetic: VeloxAesthetic) {
  const { typography: t, theme } = aesthetic
  return {
    hero(
      title: string,
      options: { kicker?: string; subtitle?: string; color?: string; accent?: string } = {},
    ) {
      const children: AnyElement[] = []
      if (options.kicker) {
        children.push(
          applyTypeStyle(text(options.kicker).uppercase(), t.kicker).color(
            options.accent ?? theme.accent ?? theme.primary,
          ),
        )
      }
      children.push(
        applyTypeStyle(text(title), t.display)
          .color(options.color ?? theme.text)
          .wrap(760)
          .maxHeight(220),
      )
      if (options.subtitle) {
        children.push(
          applyTypeStyle(text(options.subtitle), t.subtitle)
            .color(theme.muted)
            .wrap(720)
            .maxHeight(140),
        )
      }
      return layout.column(children, { gap: 22, align: 'center' })
    },

    kicker(label: string, color?: string) {
      return applyTypeStyle(text(label).uppercase(), t.kicker).color(color ?? theme.accent ?? theme.primary)
    },
  }
}

export function themedCards(aesthetic: VeloxAesthetic) {
  const { surfaces, theme, typography: typo } = aesthetic
  const card = surfaces.card

  function surfaceGroup(
    children: AnyElement[],
    options: { width?: number; height?: number; radius?: number } = {},
  ): AnyElement {
    const width = options.width ?? 620
    const height = options.height ?? 300
    const radius = options.radius ?? card.radius

    if (card.style === 'none') {
      return layout.column(children, { gap: 20, align: 'center' })
    }

    const layers: AnyElement[] = []

    if (card.shadow && card.style !== 'ribbon') {
      layers.push(
        shape
          .rect(width, height)
          .radius(radius)
          .shadow({ color: card.shadow.color, blur: card.shadow.blur, offsetY: card.shadow.offsetY }),
      )
    }

    if (card.style === 'ribbon') {
      layers.push(shape.rect(width, height).radius(radius).color(card.fill))
      layers.push(layout.column(children, { gap: 16, align: 'center' }))
    } else if (card.style === 'solid') {
      layers.push(shape.rect(width, height).radius(radius).color(card.fill))
      if (card.border !== 'transparent') {
        layers.push(shape.rect(width - 2, height - 2).radius(Math.max(0, radius - 1)).color(card.border))
      }
      layers.push(layout.column(children, { gap: 20, align: 'center' }))
    } else {
      layers.push(
        shape
          .rect(width, height)
          .radius(radius)
          .gradient('165deg', card.fill, card.border),
      )
      layers.push(layout.column(children, { gap: 20, align: 'center' }))
    }

    return group(layers).stack()
  }

  return {
    surface: surfaceGroup,
    glass: surfaceGroup,
    glassList(items: string[], options: { width?: number; color?: string } = {}) {
      const width = options.width ?? 620
      return surfaceGroup(
        [
          text
            .list(items)
            .size(typo.body.fontSize)
            .weight(typo.body.fontWeight)
            .font(typo.body.fontFamily)
            .color(options.color ?? theme.text)
            .bullet('•')
            .gap(22)
            .wrap(width - 120),
        ],
        { width, height: Math.max(240, items.length * 62 + 120) },
      )
    },
    metric(value: string, label: string, options: { accent?: string } = {}) {
      const width = 400
      const accent = options.accent ?? theme.accent ?? theme.primary
      const inner = layout.column(
        [
          applyTypeStyle(text(value), typo.title).color(theme.text).align('center'),
          shape.rect(width - 120, 6).radius(card.style === 'ribbon' ? 0 : 3).color(accent),
          applyTypeStyle(text(label), typo.body).color(theme.muted).wrap(width - 80).align('center'),
        ],
        { gap: 12, align: 'center' },
      )
      return surfaceGroup([inner], { width, height: 220 })
    },
  }
}

/** @deprecated Use themedTypography(aesthetic) */
export const typography = {
  hero(title: string, options: { kicker?: string; subtitle?: string; color?: string; accent?: string } = {}) {
    const children: AnyElement[] = []
    if (options.kicker) {
      children.push(text(options.kicker).size(18).weight(700).letterSpacing(6).uppercase().color(options.accent ?? '#a78bfa'))
    }
    children.push(text(title).size(68).weight(700).letterSpacing(-1).lineHeight(1.04).color(options.color ?? '#ffffff').wrap(760).maxHeight(220))
    if (options.subtitle) {
      children.push(text(options.subtitle).size(26).weight(400).lineHeight(1.4).color('rgba(255,255,255,0.62)').wrap(720).maxHeight(140))
    }
    return layout.column(children, { gap: 22, align: 'center' })
  },
  kicker(label: string, color = '#a78bfa') {
    return text(label).size(18).weight(700).letterSpacing(6).uppercase().color(color)
  },
}

/** @deprecated Use themedCards(aesthetic) */
export const cards = {
  glass(children: AnyElement[], options: { width?: number; height?: number; radius?: number } = {}) {
    const width = options.width ?? 620
    const height = options.height ?? 300
    const radius = options.radius ?? 32
    return group([
      shape.rect(width, height).radius(radius).shadow({ color: 'rgba(0,0,0,0.45)', blur: 48, offsetY: 16 }),
      shape.rect(width, height).radius(radius).gradient('165deg', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)'),
      shape.rect(width - 2, height - 2).radius(radius - 1).color('rgba(255,255,255,0.06)'),
      layout.column(children, { gap: 20, align: 'center' }),
    ]).stack()
  },
  glassList(items: string[], options: { width?: number; color?: string } = {}) {
    const width = options.width ?? 620
    return cards.glass([
      text.list(items).size(30).weight(500).color(options.color ?? '#ffffff').bullet('•').gap(22).wrap(width - 120),
    ], { width, height: Math.max(240, items.length * 62 + 120) })
  },
  metric(value: string, label: string, options: { accent?: string } = {}) {
    const width = 400
    const accent = options.accent ?? '#2997ff'
    return cards.glass([
      text(value).size(56).weight(700).letterSpacing(-1).color('#ffffff'),
      shape.rect(width - 100, 6).radius(3).gradient('90deg', accent, 'rgba(255,255,255,0.35)'),
      text(label).size(22).weight(400).color('rgba(255,255,255,0.65)').wrap(width - 80),
    ], { width, height: 220 })
  },
}

export const motion = {
  cinematicIn<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('slideUpBlur', 0.9, { delay, ease: 'premium' })
  },
  pop<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('tactileIn', 0.8, { delay, ease: 'magnetic' })
  },
  float<T extends AnyElement>(el: T): T {
    return el.loop('float', { distance: 14, speed: 0.8 })
  },
  stagger<T extends AnyElement>(items: T[], baseDelay = 0, step = 0.1): T[] {
    return items.map((item, index) => item.in('slideUpBlur', 0.55, { delay: baseDelay + index * step, ease: 'premium' }))
  },
  heroCinematic<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('maskRevealUp', 1.05, { delay, ease: 'cinematic' })
  },
  softReveal<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('slideUpBlur', 0.88, { delay, ease: 'premium' })
  },
  driftIn<T extends AnyElement>(el: T, delay = 0): T {
    const withIn = el.in('slideUpBlur', 1.05, { delay, ease: 'tactile' })
    return motion.float(withIn)
  },
  premiumSlide<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('slideUpBlur', 0.95, { delay, ease: 'premium' })
  },
  magneticPop<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('tactileIn', 0.8, { delay, ease: 'magnetic' })
  },
}
