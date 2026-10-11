/**
 * All-WebGL post-processing pipeline.
 *
 * The Canvas2D engine renders the scene to an offscreen 2D canvas; this module
 * is the bridge to the GPU effects pass:
 *   - browser:  `createCompositor()` + `composeToWebGL()` run `WebGLComposer`
 *              (single fragment-shader pass: bloom, chromatic, vignette, grain,
 *              paper displacement, exposure).
 *   - Node/headless: `applyFxCpu()` is a deterministic Canvas2D fallback with the
 *              same controls, so native export keeps working without a GPU.
 */

import { DEFAULT_FX, WebGLComposer, type FxSettings } from '../webgl/composer'
import type { VeloxVideoConfig } from '../types'

export function fxEnabled(config: VeloxVideoConfig): boolean {
  return !!config.fx
}

/** Merge a partial `config.fx` over the engine defaults into a full FxSettings. */
export function getFx(config: VeloxVideoConfig): FxSettings {
  return { ...DEFAULT_FX, ...(config.fx ?? {}) }
}

/** Lazily build a WebGL composer for a display canvas. Returns null if WebGL is unavailable. */
export function createCompositor(canvas: HTMLCanvasElement): WebGLComposer {
  return new WebGLComposer(canvas)
}

/** Run the GPU effects pass: source (Canvas2D frame) → display canvas. No-op if WebGL unavailable. */
export function composeToWebGL(
  compositor: WebGLComposer,
  source: CanvasImageSource,
  fx: FxSettings,
  timeSec: number,
): void {
  compositor.setSize(
    (source as { width?: number }).width ?? 0,
    (source as { height?: number }).height ?? 0,
  )
  compositor.draw(source as TexImageSource, fx, timeSec)
}

// ─── CPU fallback (Node-safe, deterministic) ─────────────────────────────────

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// Deterministic per-pixel noise (no Math.random → identical across renders).
function fxHash(x: number, y: number, t: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + t * 37.719) * 43758.5453
  return s - Math.floor(s)
}

function brightPass(src: Uint8ClampedArray, w: number, h: number, threshold: number): Float32Array {
  const out = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const l = Math.max(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]) / 255
    out[i] = l > threshold ? (l - threshold) / (1 - threshold) : 0
  }
  return out
}

// Separable box blur on a single-channel buffer.
function boxBlur(buf: Float32Array, w: number, h: number, radius: number): Float32Array {
  const tmp = new Float32Array(w * h)
  const win = radius * 2 + 1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let k = -radius; k <= radius; k++) s += buf[y * w + Math.min(w - 1, Math.max(0, x + k))]
      tmp[y * w + x] = s / win
    }
  }
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      for (let k = -radius; k <= radius; k++) s += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x]
      out[y * w + x] = s / win
    }
  }
  return out
}

/**
 * Apply the post-FX stack directly to a 2D context (in place). Used by Node
 * export where no WebGL context exists. Mirrors `WebGLComposer`'s controls.
 */
export function applyFxCpu(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fx: FxSettings,
  timeSec: number,
): void {
  const { bloom, chromatic, vignette, grain, exposure, paper } = fx
  const img = ctx.getImageData(0, 0, width, height)
  const d = img.data
  const out = new Uint8ClampedArray(d)
  const cx = width / 2
  const cy = height / 2
  const maxd = Math.sqrt(cx * cx + cy * cy) || 1

  // Chromatic aberration: shift R left, B right from center.
  if (chromatic > 0) {
    const off = Math.round(chromatic * 0.012 * width)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const xr = Math.min(width - 1, Math.max(0, x - off))
        const xb = Math.min(width - 1, Math.max(0, x + off))
        out[i] = d[(y * width + xr) * 4]
        out[i + 2] = d[(y * width + xb) * 4 + 2]
      }
    }
  }

  // Bloom: bright-pass → blur → add.
  if (bloom > 0) {
    const blurred = boxBlur(brightPass(out, width, height, 0.6), width, height, 3)
    for (let i = 0; i < width * height; i++) {
      const add = blurred[i] * bloom * 1.6 * 255
      out[i * 4] = clamp8(out[i * 4] + add)
      out[i * 4 + 1] = clamp8(out[i * 4 + 1] + add)
      out[i * 4 + 2] = clamp8(out[i * 4 + 2] + add)
    }
  }

  // Exposure + vignette + grain + paper displacement (approx) per pixel.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      let r = out[i] * exposure
      let g = out[i + 1] * exposure
      let b = out[i + 2] * exposure
      if (vignette > 0) {
        const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxd
        const v = 1 - vignette * smoothstep(0.4, 0.85, dist)
        r *= v
        g *= v
        b *= v
      }
      if (grain > 0) {
        const n = (fxHash(x, y, timeSec) - 0.5) * grain * 0.12 * 255
        r += n
        g += n
        b += n
      }
      if (paper > 0) {
        const n = (fxHash(x * 0.5, y * 0.5, timeSec * 0.01) - 0.5) * paper * 10
        r += n
        g += n
        b += n
      }
      out[i] = clamp8(r)
      out[i + 1] = clamp8(g)
      out[i + 2] = clamp8(b)
    }
  }

  img.data.set(out)
  ctx.putImageData(img, 0, 0)
}
