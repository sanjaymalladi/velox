import type {
  SceneConfig, ElementConfig, TransitionType, TransitionOptions,
  VeloxColor, VeloxGradient,
} from '../types'
import { Element } from './Element'

let _sceneCounter = 0

export class SceneBuilder {
  private _config: SceneConfig

  constructor(duration: number) {
    this._config = { id: `scene-${++_sceneCounter}`, duration, elements: [] }
  }

  /** Set scene background — CSS color string or gradient */
  background(colorOrGradient: VeloxColor | VeloxGradient): this {
    this._config.background = colorOrGradient
    return this
  }

  /**
   * Transition INTO this scene from the previous one.
   * @param type     - 'crossDissolve' | 'wipe' | 'slide' | 'zoom' | 'glitch' | 'flash'
   * @param duration - seconds
   */
  transition(type: TransitionType, duration: number, options?: TransitionOptions): this {
    this._config.transition = { type, duration, options }
    return this
  }

  /** Add one or more elements to this scene */
  add(...elements: Array<Element<ElementConfig>>): this {
    for (const el of elements) {
      this._config.elements.push(el.toConfig())
    }
    return this
  }

  /** Attach audio to this scene */
  audio(src: string, options?: { volume?: number; startFrom?: number }): this {
    this._config.audio = { src, volume: options?.volume ?? 1, startFrom: options?.startFrom ?? 0 }
    return this
  }

  toConfig(): SceneConfig {
    return { ...this._config, elements: [...this._config.elements] }
  }
}

/**
 * Create a scene with a duration in seconds.
 *
 * @example
 * scene(5)
 *   .background('#08080f')
 *   .add(text('Hello').center().size(80).in('slideUp', 0.5))
 */
export function scene(durationInSeconds: number): SceneBuilder {
  return new SceneBuilder(durationInSeconds)
}
