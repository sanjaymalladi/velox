import { Element } from '../core/Element'
import type {
  TextElementConfig, TextListElementConfig,
  VeloxColor, VeloxGradient, EntranceAnimation,
} from '../types'

// ─── Text ────────────────────────────────────────────────────────────────────

export class TextElement extends Element<TextElementConfig> {
  constructor(content: string) {
    super('text')
    this.config.content = content
    this.config.fontSize = 32
    this.config.fontWeight = 400
    this.config.color = '#ffffff'
    this.config.textAlign = 'left'
  }

  /** Font size in pixels */
  size(px: number): this { this.config.fontSize = px; return this }

  /** Font weight (100–900) */
  weight(w: number): this { this.config.fontWeight = w; return this }

  /** Solid text color */
  color(css: VeloxColor): this { this.config.color = css; return this }

  /**
   * Gradient text fill.
   * @example text('Hello').gradient('#6C63FF', '#FF6584')
   */
  gradient(from: string, to: string, angle = '135deg'): this {
    this.config.gradient = { type: 'linear', angle, stops: [from, to] } as VeloxGradient
    return this
  }

  /** Override global font for this element */
  font(family: string): this { this.config.fontFamily = family; return this }

  /** Letter spacing in pixels */
  letterSpacing(px: number): this { this.config.letterSpacing = px; return this }

  /** Line height multiplier (e.g. 1.5) */
  lineHeight(multiplier: number): this { this.config.lineHeight = multiplier; return this }

  /** Transform text to uppercase */
  uppercase(): this { this.config.textTransform = 'uppercase'; return this }

  /** Italic text style */
  italic(): this { this.config.fontStyle = 'italic'; return this }

  /** Text alignment */
  align(a: 'left' | 'center' | 'right'): this { this.config.textAlign = a; return this }
}

// ─── Text List ────────────────────────────────────────────────────────────────

export class TextListElement extends Element<TextListElementConfig> {
  constructor(items: string[]) {
    super('textList')
    this.config.items = items
    this.config.fontSize = 24
    this.config.color = '#ffffff'
    this.config.gap = 14
    this.config.bullet = '▸'
  }

  size(px: number): this { this.config.fontSize = px; return this }
  weight(w: number): this { this.config.fontWeight = w; return this }
  color(css: VeloxColor): this { this.config.color = css; return this }
  font(family: string): this { this.config.fontFamily = family; return this }
  gap(px: number): this { this.config.gap = px; return this }
  bullet(b: string | false): this { this.config.bullet = b; return this }

  /**
   * Animate each item with a staggered delay.
   * @param animation - entrance animation name
   * @param interval  - delay between items in SECONDS
   */
  stagger(animation: EntranceAnimation, interval: number): this {
    this.config.staggerAnimation = animation
    this.config.staggerInterval = interval
    return this
  }
}

// ─── Factories ───────────────────────────────────────────────────────────────

/**
 * Create a text element.
 * @example text('Hello World').center().size(80).weight(700).in('slideUp', 0.5)
 */
export function text(content: string): TextElement {
  return new TextElement(content)
}

/**
 * Create a staggered text list.
 * @example text.list(['Point 1', 'Point 2']).pos(80, 200).stagger('slideUp', 0.2)
 */
text.list = (items: string[]): TextListElement => new TextListElement(items)
