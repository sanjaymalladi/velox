/**
 * Animation State Calculator — Pure math.
 * Given an element config and a frame number, returns the current visual state.
 * Works identically in Node.js (rendering) and the Browser (preview).
 */
import type {
  BaseElementConfig, EntranceAnimation, ExitAnimation, LoopAnimation,
  AnimationOptions, EaseType,
} from '../types'
import { resolveEase, frameProgress, lerp, clamp, springValue } from './easing'

export interface AnimationState {
  opacity: number
  x: number          // offset in pixels
  y: number
  scaleX: number
  scaleY: number
  rotation: number   // degrees
  blur: number       // px
  skewX: number      // degrees
  clipReveal: number // 0→1, for typewriter/revealLeft
}

const DEFAULT_STATE: AnimationState = {
  opacity: 1, x: 0, y: 0, scaleX: 1, scaleY: 1,
  rotation: 0, blur: 0, skewX: 0, clipReveal: 1,
}

// ─── Entrance Resolver ───────────────────────────────────────────────────────

function applyEntrance(
  anim: EntranceAnimation,
  p: number,           // 0→1 eased progress
  raw: number,         // 0→1 raw progress (for spring overshoot)
  state: AnimationState
): AnimationState {
  const inv = 1 - p
  switch (anim) {
    case 'fadeIn':      return { ...state, opacity: p }
    case 'slideUp':     return { ...state, opacity: clamp(p * 2), y: lerp(60, 0, p) }
    case 'slideDown':   return { ...state, opacity: clamp(p * 2), y: lerp(-60, 0, p) }
    case 'slideLeft':   return { ...state, opacity: clamp(p * 2), x: lerp(80, 0, p) }
    case 'slideRight':  return { ...state, opacity: clamp(p * 2), x: lerp(-80, 0, p) }
    case 'zoomIn':      return { ...state, opacity: p, scaleX: lerp(0.4, 1, p), scaleY: lerp(0.4, 1, p) }
    case 'zoomInBlur':  return { ...state, opacity: p, scaleX: lerp(0.6, 1, p), scaleY: lerp(0.6, 1, p), blur: lerp(12, 0, p) }
    case 'spring': {
      const sp = springValue(raw, { stiffness: 170, damping: 26 })
      return { ...state, opacity: clamp(p * 3), y: lerp(50, 0, sp), scaleY: lerp(0.85, 1, sp) }
    }
    case 'bounceIn': {
      const sp = springValue(raw, { stiffness: 300, damping: 18 })
      return { ...state, opacity: clamp(p * 3), scaleX: lerp(0.3, 1, sp), scaleY: lerp(0.3, 1, sp) }
    }
    case 'flipIn':      return { ...state, opacity: p, rotation: lerp(-90, 0, p), scaleX: lerp(0.1, 1, p) }
    case 'expandX':     return { ...state, scaleX: p, opacity: clamp(p * 3) }
    case 'growUp':      return { ...state, scaleY: p, opacity: clamp(p * 3) }
    case 'typewriter':  return { ...state, clipReveal: p }
    case 'revealLeft':  return { ...state, clipReveal: p }
    case 'glitchIn': {
      const glitch = p < 0.8 ? (Math.random() - 0.5) * (1 - p) * 20 : 0
      return { ...state, opacity: p, x: glitch, blur: lerp(4, 0, p) }
    }
    default: return { ...state, opacity: p }
  }
}

// ─── Exit Resolver ───────────────────────────────────────────────────────────

function applyExit(
  anim: ExitAnimation,
  p: number,    // 0→1 progress (0=start of exit, 1=fully gone)
  state: AnimationState
): AnimationState {
  const ip = 1 - p
  switch (anim) {
    case 'fadeOut':       return { ...state, opacity: ip }
    case 'slideUpOut':    return { ...state, opacity: clamp(ip * 2), y: lerp(0, -60, p) }
    case 'slideDownOut':  return { ...state, opacity: clamp(ip * 2), y: lerp(0, 60, p) }
    case 'slideLeftOut':  return { ...state, opacity: clamp(ip * 2), x: lerp(0, -80, p) }
    case 'slideRightOut': return { ...state, opacity: clamp(ip * 2), x: lerp(0, 80, p) }
    case 'zoomOut':       return { ...state, opacity: ip, scaleX: lerp(1, 0.3, p), scaleY: lerp(1, 0.3, p) }
    case 'zoomOutBlur':   return { ...state, opacity: ip, scaleX: lerp(1, 1.4, p), blur: lerp(0, 16, p) }
    case 'flipOut':       return { ...state, opacity: ip, rotation: lerp(0, 90, p) }
    case 'shrinkX':       return { ...state, scaleX: ip, opacity: clamp(ip * 3) }
    case 'glitchOut': {
      const glitch = p < 0.8 ? (Math.random() - 0.5) * p * 24 : 0
      return { ...state, opacity: ip, x: glitch, blur: lerp(0, 6, p) }
    }
    default: return { ...state, opacity: ip }
  }
}

// ─── Loop Resolver ───────────────────────────────────────────────────────────

function applyLoop(
  anim: LoopAnimation,
  frame: number,
  fps: number,
  opts: { duration?: number; scale?: number; distance?: number; speed?: number } = {}
): Partial<AnimationState> {
  const dur = (opts.duration ?? 2) * fps
  const t = (frame % dur) / dur
  const sin = Math.sin(t * Math.PI * 2)
  const cos = Math.cos(t * Math.PI * 2)
  
  switch (anim) {
    case 'pulse':   return { scaleX: 1 + sin * (opts.scale ?? 0.05), scaleY: 1 + sin * (opts.scale ?? 0.05) }
    case 'float':   return { y: sin * (opts.distance ?? 10) }
    case 'rotate':  return { rotation: t * 360 * (opts.speed ?? 1) }
    case 'shake':   return { x: sin * (opts.distance ?? 5), y: cos * (opts.distance ?? 3) }
    case 'glow':    return { blur: Math.abs(sin) * 8 }
    case 'shimmer': return { opacity: 0.7 + Math.abs(sin) * 0.3 }
    default:        return {}
  }
}

// ─── Master Calculator ───────────────────────────────────────────────────────

export function getAnimationState(
  element: BaseElementConfig,
  localFrame: number,  // frame relative to scene start
  fps: number
): AnimationState {
  let state: AnimationState = { ...DEFAULT_STATE, opacity: element.opacity ?? 1 }

  const { entrance, exit, loop } = element

  // Entrance
  if (entrance) {
    const delayFrames = Math.round((entrance.options?.delay ?? 0) * fps)
    const durationFrames = Math.round(entrance.duration * fps)
    const startFrame = delayFrames

    if (localFrame < startFrame) {
      // Before animation starts — element invisible
      return { ...state, opacity: 0 }
    }

    const raw = frameProgress(localFrame, startFrame, durationFrames)
    if (raw < 1) {
      const ease = resolveEase(entrance.options?.ease as any)
      const p = ease(raw)
      state = applyEntrance(entrance.animation, p, raw, state)
    }
  }

  // Exit
  if (exit) {
    const exitStart = Math.round((exit.options?.at ?? 0) * fps)
    const exitDuration = Math.round(exit.duration * fps)
    const raw = frameProgress(localFrame, exitStart, exitDuration)
    if (raw > 0) {
      const ease = resolveEase(exit.options?.ease as any)
      const p = ease(clamp(raw))
      state = applyExit(exit.animation, p, state)
    }
  }

  // Loop
  if (loop) {
    const loopState = applyLoop(loop.animation, localFrame, fps, loop.options)
    state = { ...state, ...loopState }
  }

  return state
}
