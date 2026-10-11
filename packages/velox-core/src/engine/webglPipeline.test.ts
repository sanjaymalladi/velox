import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { applyFxCpu, getFx, fxEnabled } from './webglPipeline'
import { DEFAULT_FX } from '../webgl/composer'
import type { VeloxVideoConfig } from '../types'

const requireLocal = createRequire(path.join(process.cwd(), 'package.json'))

function freshCtx(w: number, h: number): CanvasRenderingContext2D {
  const mod = requireLocal('@napi-rs/canvas') as { Path?: typeof Path2D; Path2D?: typeof Path2D }
  globalThis.Path2D = mod.Path2D ?? mod.Path ?? globalThis.Path2D
  const canvas = createCanvas(w, h) as unknown as { getContext(type: '2d'): CanvasRenderingContext2D }
  return canvas.getContext('2d')
}

function fill(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number): [number, number, number] {
  const d = ctx.getImageData(x, y, 1, 1).data
  return [d[0], d[1], d[2]]
}

function avg(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const d = ctx.getImageData(0, 0, w, h).data
  let s = 0
  for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3
  return s / (w * h)
}

describe('all-WebGL CPU post-FX fallback', () => {
  it('fxEnabled / getFx resolve the global fx config', () => {
    const cfg = { size: [1080, 1920] as [number, number], fps: 30, scenes: [], fx: { bloom: 0.9, chromatic: 0.4 } } as unknown as VeloxVideoConfig
    expect(fxEnabled(cfg)).toBe(true)
    expect(getFx(cfg)).toEqual({ ...DEFAULT_FX, bloom: 0.9, chromatic: 0.4 })
    expect(fxEnabled({ size: [1080, 1920] as [number, number], fps: 30, scenes: [] } as unknown as VeloxVideoConfig)).toBe(false)
  })

  it('exposure brightens the frame', () => {
    const ctx = freshCtx(40, 40)
    fill(ctx, 40, 40, '#404040')
    const base = avg(ctx, 40, 40)
    applyFxCpu(ctx, 40, 40, { ...DEFAULT_FX, exposure: 0, grain: 0, vignette: 0, chromatic: 0, bloom: 0 }, 0)
    const dark = avg(ctx, 40, 40)
    expect(dark).toBeLessThan(base)
    const ctx2 = freshCtx(40, 40)
    fill(ctx2, 40, 40, '#404040')
    applyFxCpu(ctx2, 40, 40, { ...DEFAULT_FX, exposure: 2, grain: 0, vignette: 0, chromatic: 0, bloom: 0 }, 0)
    expect(avg(ctx2, 40, 40)).toBeGreaterThan(base)
  })

  it('vignette darkens the corners relative to the center', () => {
    const ctx = freshCtx(80, 80)
    fill(ctx, 80, 80, '#808080')
    applyFxCpu(ctx, 80, 80, { ...DEFAULT_FX, vignette: 1, grain: 0, exposure: 1, chromatic: 0, bloom: 0 }, 0)
    const center = px(ctx, 40, 40)
    const corner = px(ctx, 2, 2)
    const centerLum = center[0] + center[1] + center[2]
    const cornerLum = corner[0] + corner[1] + corner[2]
    expect(cornerLum).toBeLessThan(centerLum)
  })

  it('grain perturbs pixels deterministically', () => {
    const ctx = freshCtx(64, 64)
    fill(ctx, 64, 64, '#808080')
    const before = px(ctx, 10, 10)
    applyFxCpu(ctx, 64, 64, { ...DEFAULT_FX, grain: 1, vignette: 0, exposure: 1, chromatic: 0, bloom: 0 }, 0)
    const after = px(ctx, 10, 10)
    // A grainy pixel should differ from the flat gray source at that spot.
    expect(after[0] + after[1] + after[2]).not.toBe(before[0] + before[1] + before[2])
  })

  it('chromatic aberration splits R/B channels', () => {
    const ctx = freshCtx(200, 200)
    fill(ctx, 200, 200, '#000000')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(100, 0, 1, 200) // 1px white line at x=100
    applyFxCpu(ctx, 200, 200, { ...DEFAULT_FX, chromatic: 1, vignette: 0, grain: 0, exposure: 1, bloom: 0 }, 0)
    const at98 = px(ctx, 98, 100) // B line pulled from the white line (left of center)
    const at102 = px(ctx, 102, 100) // R line pulled from the white line (right of center)
    expect(at98[2]).toBeGreaterThan(at98[0])
    expect(at102[0]).toBeGreaterThan(at102[2])
  })
})

