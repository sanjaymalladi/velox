// ─── Size & Video ───────────────────────────────────────────────────────────
export type VeloxSize =
  | '1080p'
  | '720p'
  | '4k'
  | 'square'
  | 'portrait'
  | '16:9'
  | '9:16'
  | '1:1'
  | '4:5'
  | '21:9'
  | [number, number]
export type VeloxFps = 24 | 30 | 60

// ─── Color & Gradient ───────────────────────────────────────────────────────
export type VeloxColor = string // any CSS color string

export interface VeloxGradient {
  type: 'linear'
  angle: string
  stops: string[]
}

// ─── Position ───────────────────────────────────────────────────────────────
export type NamedPosition =
  | 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  | 'topCenter' | 'bottomCenter' | 'leftCenter' | 'rightCenter'

export type VeloxPosition =
  | { type: 'absolute'; x: number; y: number }
  | { type: 'center'; offsetX?: number; offsetY?: number }
  | { type: 'named'; name: NamedPosition; offsetX?: number; offsetY?: number }

// ─── Animations ─────────────────────────────────────────────────────────────
export type EntranceAnimation =
  | 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight'
  | 'zoomIn' | 'zoomInBlur' | 'flipIn' | 'typewriter' | 'expandX'
  | 'growUp' | 'spring' | 'bounceIn' | 'glitchIn' | 'revealLeft'
  | 'slideUpBlur' | 'maskRevealUp' | 'tactileIn' | 'drawIn'

export type ExitAnimation =
  | 'fadeOut' | 'slideUpOut' | 'slideDownOut' | 'slideLeftOut' | 'slideRightOut'
  | 'zoomOut' | 'zoomOutBlur' | 'flipOut' | 'shrinkX' | 'glitchOut'

export type LoopAnimation = 'pulse' | 'float' | 'rotate' | 'shimmer' | 'glow' | 'shake' | 'breathing'

export type EaseType = 'ease' | 'linear' | 'spring' | 'bouncy' | 'jitter' | 'tactile' | 'premium' | 'cinematic' | 'magnetic'

export interface AnimationOptions {
  delay?: number     // seconds
  ease?: EaseType
  at?: number        // for exit: scene-relative start time in seconds
}

export interface LoopOptions {
  duration?: number  // period in seconds
  scale?: number     // for pulse
  distance?: number  // for float/shake
  speed?: number     // multiplier
}

// ─── Transitions ────────────────────────────────────────────────────────────
export type TransitionType =
  | 'crossDissolve'
  | 'blurDissolve'
  | 'zoomSmooth'
  | 'wipe'
  | 'slide'
  | 'zoom'
  | 'glitch'
  | 'flash'

export interface TransitionOptions {
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out'
  color?: string
  intensity?: number
}

/** Global motion polish — vignette/grain defaults scale with premium */
export type MotionQuality = 'standard' | 'premium'

/** Semantic scene camera moves (applied in the renderer) */
export type SceneCamera =
  | 'none'
  | 'slowPush'
  | 'parallaxDrift'
  | 'handheld'
  | 'kenBurns'

/** Affects default overlay intensity */
export type SceneMood = 'neutral' | 'editorial' | 'cinematic'

export interface SceneOverlay {
  /** 0–1 vignette darkness at edges */
  vignetteOpacity?: number
  /** 0–1 film grain overlay strength */
  grainOpacity?: number
}

// ─── Element Configs ────────────────────────────────────────────────────────
export interface BaseElementConfig {
  id: string
  type: string
  position?: VeloxPosition
  opacity?: number
  entrance?: { animation: EntranceAnimation; duration: number; options?: AnimationOptions }
  exit?: { animation: ExitAnimation; duration: number; options?: AnimationOptions }
  loop?: { animation: LoopAnimation; options?: LoopOptions }
}

export interface TextElementConfig extends BaseElementConfig {
  type: 'text'
  content: string
  fontSize?: number
  fontWeight?: number
  color?: VeloxColor
  gradient?: VeloxGradient
  fontFamily?: string
  letterSpacing?: number
  lineHeight?: number
  textTransform?: 'uppercase' | 'lowercase' | 'none'
  fontStyle?: 'italic' | 'normal'
  textAlign?: 'left' | 'center' | 'right'
  /** Max pixel width before text wraps. Defaults to 88% of canvas width. */
  maxWidth?: number
  /** Max pixel height — excess lines are clipped. */
  maxHeight?: number
}

export interface TextListElementConfig extends BaseElementConfig {
  type: 'textList'
  items: string[]
  fontSize?: number
  fontWeight?: number
  color?: VeloxColor
  fontFamily?: string
  gap?: number
  bullet?: string | false
  staggerAnimation?: EntranceAnimation
  staggerInterval?: number
  /** Max pixel width for each list item before it wraps. Defaults to 88% of canvas width. */
  maxWidth?: number
}

export interface ImageElementConfig extends BaseElementConfig {
  type: 'image'
  src: string
  width?: number
  height?: number
  objectFit?: 'fill' | 'contain' | 'cover'
  blur?: number
  brightness?: number
  saturate?: number
  borderRadius?: number
  kenBurns?: boolean | { direction?: 'in' | 'out'; intensity?: number }
}

export interface LogoElementConfig extends BaseElementConfig {
  type: 'logo'
  logo: string
  theme?: 'light' | 'dark'
  width?: number
  height?: number
  blur?: number
}

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface LineChartSeries {
  label?: string
  color?: string
  values: number[]
}

export interface ShapeShadow {
  color?: string
  blur?: number
  offsetX?: number
  offsetY?: number
}

export interface ShapeConfig {
  shapeType:
    | 'rect' | 'circle' | 'line' | 'particles' | 'noise'
    | 'barChart' | 'lineChart' | 'donutChart' | 'morphBlob' | 'progressBar' | 'growUp'
  color?: VeloxColor
  width?: number
  height?: number
  borderRadius?: number
  thickness?: number
  // gradient & shadow
  gradient?: VeloxGradient
  shadow?: ShapeShadow
  // particles / noise
  count?: number
  speed?: number
  // barChart
  data?: ChartDataPoint[]
  series?: LineChartSeries[]
  showLabels?: boolean
  showValues?: boolean
  curve?: 'linear' | 'smooth' | 'step'
  innerRadius?: number
  paths?: string[]
  // progressBar
  value?: number
  trackColor?: string
}

export interface ShapeElementConfig extends BaseElementConfig {
  type: 'shape'
  shape: ShapeConfig
}

export interface GroupElementConfig extends BaseElementConfig {
  type: 'group'
  children: ElementConfig[]
}

export type ElementConfig =
  | TextElementConfig
  | TextListElementConfig
  | ImageElementConfig
  | LogoElementConfig
  | ShapeElementConfig
  | GroupElementConfig

// ─── Scene Config ───────────────────────────────────────────────────────────
export interface SceneConfig {
  id: string
  duration: number        // seconds
  background?: VeloxColor | VeloxGradient
  /** Subtle canvas camera: push, drift, handheld, ken burns */
  camera?: SceneCamera
  /** Tunes default vignette/grain when overlay not set */
  mood?: SceneMood
  /** Optional post overlays (defaults from mood + video motionQuality) */
  overlay?: SceneOverlay
  transition?: {
    type: TransitionType
    duration: number
    options?: TransitionOptions
  }
  elements: ElementConfig[]
  audio?: { src: string; volume?: number; startFrom?: number }
}

// ─── Theme ──────────────────────────────────────────────────────────────────
export interface VeloxTheme {
  background: string
  primary: string
  secondary: string
  text: string
  muted: string
  font: string
  accent?: string
}

// ─── Root Video Config ───────────────────────────────────────────────────────
export interface VeloxVideoConfig {
  size: [number, number]
  fps: VeloxFps
  background?: VeloxColor | VeloxGradient
  font?: string
  theme?: VeloxTheme
  /** Stronger vignette/grain defaults for scenes without explicit overlay */
  motionQuality?: MotionQuality
  scenes: SceneConfig[]
  audio?: { src: string; volume?: number }
}
