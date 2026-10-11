import type {
  MotionQuality,
  VeloxVideoConfig,
  VeloxSize,
  VeloxFps,
  VeloxTheme,
  VeloxColor,
  VeloxGradient,
  VeloxAudioPlan,
} from '../types'
import { SceneBuilder } from './Scene'
import { resolveTheme } from '../themes'
import { validateRawVideoInput, validateVeloxVideoConfig } from '../validation'
import { resolveSize } from '../engine/drawFrame'

export interface RawVideoInput {
  size?: VeloxSize
  fps?: VeloxFps
  background?: VeloxColor | VeloxGradient
  font?: string
  theme?: VeloxTheme | string
  motionQuality?: MotionQuality
  scenes: SceneBuilder[]
  audio?: { src: string; volume?: number }
  audioPlan?: VeloxAudioPlan
}

/** Compiled, serialisable video config — passed to the renderer */
export class VeloxVideo {
  readonly config: VeloxVideoConfig

  constructor(input: RawVideoInput) {
    validateRawVideoInput(input)
    const theme = resolveTheme(input.theme)
    this.config = {
      size: resolveSize(input.size ?? '1080p'),
      fps: input.fps ?? 30,
      background: input.background ?? theme?.background ?? '#000000',
      font: input.font ?? theme?.font,
      theme,
      themeId: typeof input.theme === 'string' ? input.theme : undefined,
      motionQuality: input.motionQuality,
      scenes: input.scenes.map((s) => s.toConfig()),
      audio: input.audio,
      audioPlan: input.audioPlan,
    }
    validateVeloxVideoConfig(this.config)
  }
}

/**
 * Define a Velox video.
 *
 * @example
 * export default createVideo({
 *   size: '1080p',
 *   fps: 30,
 *   background: '#08080f',
 *   scenes: [
 *     scene(5).add(text('Hello').center().size(80).in('slideUp', 0.5)),
 *   ],
 * })
 */
export function createVideo(input: RawVideoInput): VeloxVideo {
  return new VeloxVideo(input)
}
