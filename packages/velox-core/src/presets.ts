import { group } from './elements/Group'
import { shape } from './elements/Shape'
import { text } from './elements/Text'
import { layout } from './layout'
import type { Element } from './core/Element'
import type { ElementConfig } from './types'

type AnyElement = Element<ElementConfig>

export const typography = {
  hero(title: string, options: { kicker?: string; subtitle?: string; color?: string; accent?: string } = {}) {
    const children: AnyElement[] = []
    if (options.kicker) {
      children.push(text(options.kicker).size(22).weight(800).letterSpacing(5).uppercase().color(options.accent ?? '#a78bfa'))
    }
    children.push(text(title).size(72).weight(900).lineHeight(1.02).color(options.color ?? '#ffffff').wrap(760).maxHeight(220))
    if (options.subtitle) {
      children.push(text(options.subtitle).size(28).lineHeight(1.35).color('rgba(255,255,255,0.72)').wrap(720).maxHeight(140))
    }
    return layout.column(children, { gap: 26, align: 'center' })
  },

  kicker(label: string, color = '#a78bfa') {
    return text(label).size(22).weight(800).letterSpacing(5).uppercase().color(color)
  },
}

export const cards = {
  glass(children: AnyElement[], options: { width?: number; height?: number; radius?: number } = {}) {
    const width = options.width ?? 620
    const height = options.height ?? 300
    return group([
      shape.rect(width, height).color('rgba(255,255,255,0.10)').radius(options.radius ?? 32),
      layout.column(children, { gap: 20, align: 'center' }),
    ]).stack()
  },

  glassList(items: string[], options: { width?: number; color?: string } = {}) {
    const width = options.width ?? 620
    return cards.glass([
      text.list(items).size(32).weight(600).color(options.color ?? '#ffffff').bullet('•').gap(22).wrap(width - 120),
    ], { width, height: Math.max(240, items.length * 62 + 120) })
  },

  metric(value: string, label: string, options: { accent?: string } = {}) {
    const width = 430
    return cards.glass([
      text(value).size(64).weight(900).color('#ffffff'),
      shape.line(width - 120).color(options.accent ?? '#a78bfa').thickness(5),
      text(label).size(24).color('rgba(255,255,255,0.72)').wrap(width - 100),
    ], { width, height: 240 })
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
    return items.map((item, index) => item.in('slideUp', 0.55, { delay: baseDelay + index * step, ease: 'tactile' }))
  },

  /** Tall hero mask reveal — editorial / premium titles */
  heroCinematic<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('maskRevealUp', 1.05, { delay, ease: 'cinematic' })
  },

  /** Gentle slide + blur settle */
  softReveal<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('slideUpBlur', 0.88, { delay, ease: 'premium' })
  },

  /** Longer entrance with subtle float loop */
  driftIn<T extends AnyElement>(el: T, delay = 0): T {
    const withIn = el.in('slideUpBlur', 1.05, { delay, ease: 'tactile' })
    return motion.float(withIn)
  },

  /** Slide with strong tactile ease */
  premiumSlide<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('slideUpBlur', 0.95, { delay, ease: 'premium' })
  },

  /** High-energy pop */
  magneticPop<T extends AnyElement>(el: T, delay = 0): T {
    return el.in('tactileIn', 0.8, { delay, ease: 'magnetic' })
  },
}
