// ─── Size & Video ───────────────────────────────────────────────────────────
export type VeloxSize = '1080p' | '720p' | '4k' | 'square' | 'portrait' | [number, number]
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

export type ExitAnimation =
  | 'fadeOut' | 'slideUpOut' | 'slideDownOut' | 'slideLeftOut' | 'slideRightOut'
  | 'zoomOut' | 'zoomOutBlur' | 'flipOut' | 'shrinkX' | 'glitchOut'

export type LoopAnimation = 'pulse' | 'float' | 'rotate' | 'shimmer' | 'glow' | 'shake'

export type EaseType = 'ease' | 'linear' | 'spring' | 'bouncy'

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
export type TransitionType = 'crossDissolve' | 'wipe' | 'slide' | 'zoom' | 'glitch' | 'flash'

export interface TransitionOptions {
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out'
  color?: string
  intensity?: number
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

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface ShapeConfig {
  shapeType:
    | 'rect' | 'circle' | 'line' | 'particles' | 'noise'
    | 'barChart' | 'progressBar'
  color?: VeloxColor
  width?: number
  height?: number
  borderRadius?: number
  thickness?: number
  // particles / noise
  count?: number
  speed?: number
  // barChart
  data?: ChartDataPoint[]
  showLabels?: boolean
  showValues?: boolean
  // progressBar
  value?: number
  trackColor?: string
}

export interface ShapeElementConfig extends BaseElementConfig {
  type: 'shape'
  shape: ShapeConfig
}

export type ElementConfig =
  | TextElementConfig
  | TextListElementConfig
  | ImageElementConfig
  | ShapeElementConfig

// ─── Scene Config ───────────────────────────────────────────────────────────
export interface SceneConfig {
  id: string
  duration: number        // seconds
  background?: VeloxColor | VeloxGradient
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
  background?: VeloxColor
  font?: string
  theme?: VeloxTheme
  scenes: SceneConfig[]
  audio?: { src: string; volume?: number }
}
