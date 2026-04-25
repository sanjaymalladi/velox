import type { VeloxVideoConfig, VeloxSize, VeloxFps, VeloxTheme, VeloxColor } from '../types'
import { SceneBuilder } from './Scene'
import { resolveTheme } from '../themes'

function resolveSize(size: VeloxSize): [number, number] {
  if (Array.isArray(size)) return size
  const map: Record<string, [number, number]> = {
    '4k':       [3840, 2160],
    '1080p':    [1920, 1080],
    '720p':     [1280, 720],
    'square':   [1080, 1080],
    'portrait': [1080, 1920],
    '16:9':     [1920, 1080],
    '9:16':     [1080, 1920],
    '1:1':      [1080, 1080],
    '4:5':      [1080, 1350],
    '21:9':     [2520, 1080],
  }
  return map[size] ?? [1920, 1080]
}

export interface RawVideoInput {
  size?: VeloxSize
  fps?: VeloxFps
  background?: VeloxColor
  font?: string
  theme?: VeloxTheme | string
  scenes: SceneBuilder[]
  audio?: { src: string; volume?: number }
}

/** Compiled, serialisable video config — passed to the renderer */
export class VeloxVideo {
  readonly config: VeloxVideoConfig

  constructor(input: RawVideoInput) {
    const theme = resolveTheme(input.theme)
    this.config = {
      size: resolveSize(input.size ?? '1080p'),
      fps: input.fps ?? 30,
      background: input.background ?? theme?.background ?? '#000000',
      font: input.font ?? theme?.font,
      theme,
      scenes: input.scenes.map((s) => s.toConfig()),
      audio: input.audio,
    }
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
