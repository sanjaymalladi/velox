/**
 * Velox Easing Engine — Pure math, no dependencies.
 * Works identically in Node.js (rendering) and the Browser (preview).
 */

// ─── Basic Easings ────────────────────────────────────────────────────────────

export function linear(t: number): number { return t }
export function easeIn(t: number): number { return t * t * t }
export function easeOut(t: number): number { return 1 - Math.pow(1 - t, 3) }
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ─── Spring Physics ──────────────────────────────────────────────────────────

export interface SpringConfig {
  stiffness?: number   // default 170
  damping?: number     // default 26
  mass?: number        // default 1
}

/**
 * Simulates spring physics. Returns value 0→1 for a given normalized time t.
 * Simulates forward in small steps — accurate for any duration.
 */
export function springValue(t: number, config: SpringConfig = {}): number {
  const { stiffness = 170, damping = 26, mass = 1 } = config
  if (t <= 0) return 0
  if (t >= 1) return 1

  const dt = 1 / 600 // simulate at 600Hz for accuracy
  let position = 0
  let velocity = 0
  const totalSteps = Math.round(t / dt)

  for (let i = 0; i < totalSteps; i++) {
    const springForce = -stiffness * (position - 1)
    const dampingForce = -damping * velocity
    const acceleration = (springForce + dampingForce) / mass
    velocity += acceleration * dt
    position += velocity * dt
  }

  return Math.min(Math.max(position, 0), 1.5) // allow slight overshoot
}

// ─── Elastic ─────────────────────────────────────────────────────────────────

export function elastic(t: number, amplitude = 1, period = 0.3): number {
  if (t === 0 || t === 1) return t
  const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude)
  return amplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / period) + 1
}

// ─── Bounce ──────────────────────────────────────────────────────────────────

export function bounce(t: number): number {
  const n1 = 7.5625, d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
  return n1 * (t -= 2.625 / d1) * t + 0.984375
}

// ─── Cubic Bezier ────────────────────────────────────────────────────────────

function cubicBezierAt(t: number, p1: number, p2: number): number {
  const c = 3 * p1, b = 3 * (p2 - p1) - c, a = 1 - c - b
  return ((a * t + b) * t + c) * t
}

function cubicBezierDerivative(t: number, p1: number, p2: number): number {
  const c = 3 * p1, b = 3 * (p2 - p1) - c, a = 1 - c - b
  return (3 * a * t + 2 * b) * t + c
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  return (t: number): number => {
    if (t === 0 || t === 1) return t
    let x = t, i = 0
    // Newton-Raphson to find t for x
    for (i = 0; i < 8; i++) {
      const xErr = cubicBezierAt(x, x1, x2) - t
      if (Math.abs(xErr) < 0.001) break
      x -= xErr / cubicBezierDerivative(x, x1, x2)
    }
    return cubicBezierAt(x, y1, y2)
  }
}

// ─── Resolver ────────────────────────────────────────────────────────────────

export type EaseName = 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'spring' | 'bouncy' | 'elastic' | 'bounce'

export function resolveEase(name: EaseName | undefined): (t: number) => number {
  switch (name) {
    case 'linear':    return linear
    case 'ease':      return easeInOut
    case 'easeIn':    return easeIn
    case 'easeOut':   return easeOut
    case 'easeInOut': return easeInOut
    case 'spring':    return (t) => springValue(t, { stiffness: 170, damping: 26 })
    case 'bouncy':    return (t) => springValue(t, { stiffness: 300, damping: 20 })
    case 'elastic':   return elastic
    case 'bounce':    return bounce
    default:          return easeOut
  }
}

// ─── Interpolate ─────────────────────────────────────────────────────────────

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(val: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, val))
}

/** Normalize a frame within a window into a 0→1 progress value */
export function frameProgress(
  currentFrame: number,
  startFrame: number,
  durationFrames: number
): number {
  return clamp((currentFrame - startFrame) / durationFrames)
}
