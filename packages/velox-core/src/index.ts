// ─── Public API ──────────────────────────────────────────────────────────────
export { createVideo } from './core/Video'
export type { VeloxVideo, RawVideoInput } from './core/Video'

export { scene } from './core/Scene'
export type { SceneBuilder } from './core/Scene'

export { text } from './elements/Text'
export { image } from './elements/Image'
export { shape } from './elements/Shape'
export { logo } from './elements/Logo'
export { group } from './elements/Group'
export { layout } from './layout'
export { backdrops } from './backdrops'
export { typography, cards as creativeCards, motion } from './presets'

export { random, randomRange } from './utils/random'
export { themes, resolveTheme, resolveAesthetic, aestheticIds, preloadAesthetics, aestheticsArePreloaded } from './themes'
export { preloadHeavyDeps } from './engine/lazyDeps'
export type { VeloxAesthetic, CardSurfaceStyle, TypeStyle } from './aesthetics/types'
export { colors } from './color'
export {
  CREATIVE_SPEC_FORMAT,
  validateCreativeSpec,
} from './creativeSpec'
export type {
  CreativeBackground,
  CreativeBlock,
  CreativeMotion,
  CreativePlacement,
  CreativeScale,
  CreativeScene,
  CreativeSpec,
  CreativeStyle,
} from './creativeSpec'
export { createVideoFromCreativeSpec, isCreativeSpec } from './creativeCompiler'
export { createVideoFromMarkup, isVeloxMarkup, configToMarkup } from './markupCompiler'
export type { MarkupNode } from './markup'
export {
  heroTitle,
  bulletList,
  statCard,
  quoteCard,
  flowchart,
  cards,
  diagrams,
  shots,
  createExplainerVideo,
  createStoryVideo,
  createVideoFromSchema,
} from './llm'
export type {
  AspectRatioPreset,
  LlmThemeName,
  NarrativeSectionType,
  VideoSection,
  LlmVideoSpec,
  HeroTitleProps,
  BulletListProps,
  StatCardProps,
  FlowchartProps,
  SectionStyle,
} from './llm'

// ─── Native Rendering Engine ──────────────────────────────────────────────────
export {
  drawFrame,
  getTotalFrames,
  buildSceneTimeline,
  buildSceneStartsSeconds,
  resolveSize,
  setImageCache,
} from './engine/drawFrame'
export { preloadImages } from './engine/preloadImagesBrowser'
export { getAnimationState } from './engine/animations'
export { WebGLComposer, DEFAULT_FX } from './webgl/composer'
export type { FxSettings } from './webgl/composer'
export {
  createCompositor,
  composeToWebGL,
  applyFxCpu,
  getFx,
  fxEnabled,
} from './engine/webglPipeline'
export type { AnimationState } from './engine/animations'
export { resolveEase, lerp, clamp, frameProgress, springValue } from './engine/easing'
export { validateRawVideoInput, validateVeloxVideoConfig } from './validation'
export { lintVeloxMarkup, lintVeloxConfig } from './lint'
export type { LintIssue, LintResult } from './lint'
export { applyVmlVariables, findUnresolvedVariables } from './variables'
export {
  encodeVeloxStockRef,
  encodeVeloxCardRef,
  encodeVeloxWebCapture,
  decodeVeloxStockRef,
  decodeVeloxCardRef,
  isVeloxUnresolvedSrc,
  isPlaceholderImageSrc,
} from './mediaProviders'
export {
  parseSrt,
  parseAss,
  parseVtt,
  parseCaptionTracks,
  splitWords,
  buildCaptionWordSpans,
  pickCaptionEntrance,
} from './captions'
export type { CaptionStyle, CaptionCue } from './captions'
export type { CaptionTrack } from './types'
export { drawCaptionTrack } from './engine/drawText'

// ─── Audio resolution ──────────────────────────────────────────────────────
export {
  resolveAudio,
  buildAudioMixArgs,
  BUNDLED_AUDIO_PRESETS,
} from './audio'
export type { ResolvedAudio, ResolvedAudioTrack, AudioKind, ResolveAudioOptions } from './audio'

// ─── Re-export all types ──────────────────────────────────────────────────────
export type {
  VeloxSize, VeloxFps, VeloxColor, VeloxGradient,
  VeloxPosition, NamedPosition,
  EntranceAnimation, ExitAnimation, LoopAnimation, EaseType,
  AnimationOptions, LoopOptions,
  TransitionType, TransitionOptions,
  BaseElementConfig, TextElementConfig, TextListElementConfig,
  ImageElementConfig, ShapeElementConfig, ShapeConfig, ElementConfig,
  GroupElementConfig, ChartDataPoint, SceneConfig, VeloxTheme, VeloxVideoConfig,
  MotionQuality, SceneCamera, SceneMood, SceneOverlay,
  SfxCue, VeloxAudioPlan,
} from './types'
