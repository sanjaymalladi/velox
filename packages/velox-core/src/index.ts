// ─── Public API ──────────────────────────────────────────────────────────────
export { createVideo } from './core/Video'
export type { VeloxVideo, RawVideoInput } from './core/Video'

export { scene } from './core/Scene'
export type { SceneBuilder } from './core/Scene'

export { text } from './elements/Text'
export { image } from './elements/Image'
export { shape } from './elements/Shape'

export { random, randomRange } from './utils/random'
export { themes, resolveTheme } from './themes'

// ─── Native Rendering Engine ──────────────────────────────────────────────────
export { drawFrame, getTotalFrames, buildSceneTimeline, resolveSize } from './engine/drawFrame'
export { getAnimationState } from './engine/animations'
export type { AnimationState } from './engine/animations'
export { resolveEase, lerp, clamp, frameProgress, springValue } from './engine/easing'

// ─── Re-export all types ──────────────────────────────────────────────────────
export type {
  VeloxSize, VeloxFps, VeloxColor, VeloxGradient,
  VeloxPosition, NamedPosition,
  EntranceAnimation, ExitAnimation, LoopAnimation, EaseType,
  AnimationOptions, LoopOptions,
  TransitionType, TransitionOptions,
  BaseElementConfig, TextElementConfig, TextListElementConfig,
  ImageElementConfig, ShapeElementConfig, ShapeConfig, ElementConfig,
  ChartDataPoint, SceneConfig, VeloxTheme, VeloxVideoConfig,
} from './types'
