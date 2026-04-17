import { Element } from '../core/Element'
import type { ShapeElementConfig, ShapeConfig, VeloxColor, VeloxGradient, ChartDataPoint } from '../types'

class ShapeElement extends Element<ShapeElementConfig> {
  constructor(shapeConfig: ShapeConfig) {
    super('shape')
    this.config.shape = shapeConfig
  }

  color(css: VeloxColor): this { this.config.shape.color = css; return this }
  size(width: number, height?: number): this {
    this.config.shape.width = width
    this.config.shape.height = height ?? width
    return this
  }
  width(px: number): this { this.config.shape.width = px; return this }
  height(px: number): this { this.config.shape.height = px; return this }
  thickness(px: number): this { this.config.shape.thickness = px; return this }
  radius(px: number): this { this.config.shape.borderRadius = px; return this }
  speed(s: number): this { this.config.shape.speed = s; return this }
}

/**
 * The shape namespace — geometry primitives + data viz + special effects.
 *
 * @example
 * shape.rect(400, 200).color('#6C63FF').radius(12).in('fadeIn', 0.4)
 * shape.particles(60).color('#fff').opacity(0.15)
 * shape.barChart({ data: [{ label: 'A', value: 80, color: '#6C63FF' }] })
 */
export const shape = {

  /** Rectangle */
  rect(width: number, height?: number): ShapeElement {
    return new ShapeElement({ shapeType: 'rect', width, height: height ?? width })
  },

  /** Circle */
  circle(diameter: number): ShapeElement {
    return new ShapeElement({ shapeType: 'circle', width: diameter, height: diameter })
  },

  /** Horizontal line */
  line(length?: number): ShapeElement {
    return new ShapeElement({ shapeType: 'line', width: length ?? 200, thickness: 2 })
  },

  /**
   * Build a VeloxGradient for use as a scene background.
   * @example scene(5).background(shape.gradient('135deg', '#6C63FF', '#FF6584'))
   */
  gradient(angle: string, ...stops: string[]): VeloxGradient {
    return { type: 'linear', angle, stops }
  },

  /**
   * Animated floating particle field — great for backgrounds.
   * @param count  - number of particles
   * @param options - color, opacity, speed
   */
  particles(count: number, options?: { color?: string; speed?: number }): ShapeElement {
    const el = new ShapeElement({ shapeType: 'particles', count, color: options?.color ?? '#ffffff', speed: options?.speed ?? 0.5 })
    return el
  },

  /** Subtle animated Perlin noise background */
  noise(options?: { opacity?: number }): ShapeElement {
    const el = new ShapeElement({ shapeType: 'noise' })
    if (options?.opacity !== undefined) el.opacity(options.opacity)
    return el
  },

  /**
   * Animated bar chart.
   * @example
   * shape.barChart({ data: [{ label: 'Speed', value: 95, color: '#6C63FF' }] })
   *   .pos(80, 200).size(700, 350).in('growUp', 0.8, { delay: 0.3, stagger: true })
   */
  barChart(config: {
    data: ChartDataPoint[]
    showLabels?: boolean
    showValues?: boolean
  }): ShapeElement {
    return new ShapeElement({
      shapeType: 'barChart',
      data: config.data,
      showLabels: config.showLabels ?? true,
      showValues: config.showValues ?? true,
    })
  },

  /**
   * Animated progress bar (0–100).
   * @example shape.progressBar(75).pos(80, 500).color('#6C63FF').size(600, 16)
   */
  progressBar(value: number, options?: { trackColor?: string; color?: string }): ShapeElement {
    const el = new ShapeElement({
      shapeType: 'progressBar',
      value,
      trackColor: options?.trackColor ?? 'rgba(255,255,255,0.15)',
      color: options?.color,
    })
    return el
  },
}
