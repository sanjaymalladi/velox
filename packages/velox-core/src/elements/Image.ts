import { Element } from '../core/Element'
import type { ImageElementConfig } from '../types'

export class ImageElement extends Element<ImageElementConfig> {
  constructor(src: string) {
    super('image')
    this.config.src = src
    this.config.objectFit = 'contain'
  }

  /** Set explicit width and height in pixels */
  size(width: number, height?: number): this {
    this.config.width = width
    this.config.height = height ?? width
    return this
  }

  /** Stretch to fill entire canvas (object-fit: cover) */
  fill(): this {
    this.config.objectFit = 'cover'
    this.config.width = undefined
    this.config.height = undefined
    return this
  }

  /** Fit within bounds maintaining aspect ratio */
  fit(): this { this.config.objectFit = 'contain'; return this }

  /** Gaussian blur in pixels */
  blur(px: number): this { this.config.blur = px; return this }

  /** Brightness multiplier (0=black, 1=normal, 2=double) */
  brightness(value: number): this { this.config.brightness = value; return this }

  /** Saturation multiplier (0=grayscale, 1=normal) */
  saturate(value: number): this { this.config.saturate = value; return this }

  /** Border radius in pixels */
  radius(px: number): this { this.config.borderRadius = px; return this }

  /**
   * Ken Burns effect — slow cinematic pan & zoom.
   * Great for still photos in news videos.
   */
  kenBurns(options?: { direction?: 'in' | 'out'; intensity?: number }): this {
    this.config.kenBurns = options ?? true
    return this
  }
}

/**
 * Create an image element.
 * @example image('bg.jpg').fill().blur(20).opacity(0.4)
 */
export function image(src: string): ImageElement {
  return new ImageElement(src)
}
