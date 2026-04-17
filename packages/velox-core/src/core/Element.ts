import type {
  BaseElementConfig, VeloxPosition, NamedPosition,
  EntranceAnimation, ExitAnimation, LoopAnimation,
  AnimationOptions, LoopOptions,
} from '../types'

let _idCounter = 0

export abstract class Element<TConfig extends BaseElementConfig> {
  protected config: TConfig

  constructor(type: string) {
    this.config = { id: `el-${++_idCounter}`, type } as TConfig
  }

  /** Center on canvas, with optional pixel offset */
  center(offset?: { offsetX?: number; offsetY?: number }): this {
    this.config.position = { type: 'center', offsetX: offset?.offsetX, offsetY: offset?.offsetY }
    return this
  }

  /** Absolute position in pixels, or named anchor point */
  pos(xOrName: number | NamedPosition, y?: number, offset?: { offsetX?: number; offsetY?: number }): this {
    if (typeof xOrName === 'number') {
      this.config.position = { type: 'absolute', x: xOrName, y: y ?? 0 }
    } else {
      this.config.position = { type: 'named', name: xOrName, offsetX: offset?.offsetX, offsetY: offset?.offsetY }
    }
    return this
  }

  /** Element-level opacity (0-1) */
  opacity(value: number): this {
    this.config.opacity = value
    return this
  }

  /**
   * Entrance animation.
   * @param animation - animation name e.g. 'slideUp', 'fadeIn', 'typewriter'
   * @param duration  - duration in SECONDS
   * @param options   - delay (s), ease, etc
   */
  in(animation: EntranceAnimation, duration: number, options?: AnimationOptions): this {
    this.config.entrance = { animation, duration, options }
    return this
  }

  /**
   * Exit animation.
   * @param animation - animation name e.g. 'fadeOut', 'slideLeftOut'
   * @param duration  - duration in SECONDS
   * @param options   - at: scene-relative start time (s), ease, etc
   */
  out(animation: ExitAnimation, duration: number, options?: AnimationOptions): this {
    this.config.exit = { animation, duration, options }
    return this
  }

  /**
   * Continuous loop animation while element is visible.
   * @param animation - 'pulse', 'float', 'rotate', 'shimmer', 'glow', 'shake'
   * @param options   - duration (period s), scale, distance, speed
   */
  loop(animation: LoopAnimation, options?: LoopOptions): this {
    this.config.loop = { animation, options }
    return this
  }

  /** Serialize config — called by Scene.add() */
  toConfig(): TConfig {
    return { ...this.config }
  }
}
