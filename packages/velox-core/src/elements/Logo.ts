import { Element } from '../core/Element'
import type { ElementConfig, LogoElementConfig } from '../types'
import { text } from './Text'

export class LogoBuilder extends Element<LogoElementConfig> {
  constructor(logoName: string, theme: 'light' | 'dark' = 'light') {
    super('logo')
    this.config = {
      ...this.config,
      logo: logoName,
      theme,
      opacity: 1,
    } as LogoElementConfig
  }

  size(width: number, height?: number): this {
    this.config.width = width
    this.config.height = height ?? width
    return this
  }
}

export function logo(name: string, theme: 'light' | 'dark' = 'light'): LogoBuilder {
  return new LogoBuilder(name, theme)
}

logo.lockup = (
  name: string,
  label: string,
  theme: 'light' | 'dark' = 'light',
  options: {
    logoSize?: number
    textSize?: number
    gap?: number
    x?: number
    y?: number
    color?: string
    weight?: number
    letterSpacing?: number
  } = {}
): Array<Element<ElementConfig>> => {
  const logoSize = options.logoSize ?? 96
  const textSize = options.textSize ?? Math.round(logoSize * 0.86)
  const gap = options.gap ?? Math.round(logoSize * 0.32)
  const letterSpacing = options.letterSpacing ?? 0
  const estimatedTextWidth = label.length * textSize * 0.56 + Math.max(0, label.length - 1) * letterSpacing
  const totalWidth = logoSize + gap + estimatedTextWidth
  const centerX = options.x ?? 0
  const centerY = options.y ?? 0

  return [
    logo(name, theme)
      .center({ offsetX: centerX - totalWidth / 2 + logoSize / 2, offsetY: centerY })
      .size(logoSize)
      .in('drawIn', 1.8, { ease: 'linear' })
      .loop('breathing', { speed: 0.5 }),
    text(label)
      .center({ offsetX: centerX - totalWidth / 2 + logoSize + gap + estimatedTextWidth / 2, offsetY: centerY })
      .size(textSize)
      .weight(options.weight ?? 600)
      .color(options.color ?? (theme === 'light' ? '#ffffff' : '#111111'))
      .letterSpacing(letterSpacing)
      .in('slideLeft', 0.8, { delay: 0.35, ease: 'tactile' }),
  ]
}
