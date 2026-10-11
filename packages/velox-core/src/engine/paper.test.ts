import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { drawFrame } from './drawFrame'
import type { VeloxVideoConfig } from '../types'

const requireLocal = createRequire(path.join(process.cwd(), 'package.json'))

function freshCtx(w: number, h: number): CanvasRenderingContext2D {
  const mod = requireLocal('@napi-rs/canvas') as { Path?: typeof Path2D; Path2D?: typeof Path2D }
  globalThis.Path2D = mod.Path2D ?? mod.Path ?? globalThis.Path2D
  const canvas = createCanvas(w, h) as unknown as { getContext(type: '2d'): CanvasRenderingContext2D }
  return canvas.getContext('2d')
}

function colorCounts(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data
  let red = 0
  let blue = 0
  let bright = 0
  const total = (w * h) / 4
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (r > 150 && g < 100 && b < 100) red++
      else if (b > 150 && r < 100 && g < 100) blue++
      if (Math.max(r, g, b) > 30) bright++
    }
  }
  return { red, blue, bright, total }
}

describe('paper animation (paperFold transition + paper backdrop)', () => {
  it('renders a crumpled-paper backdrop instead of a flat fill', () => {
    const cfg = {
      size: [1080, 1920] as [number, number],
      fps: 30,
      background: '#000000',
      scenes: [
        { id: 's1', duration: 1, background: 'paper(kraft)', elements: [] as unknown[] },
      ],
    } as unknown as VeloxVideoConfig

    const ctx = freshCtx(1080, 1920)
    expect(() => drawFrame(ctx, cfg, 0, 1080, 1920)).not.toThrow()
    const c = colorCounts(ctx, 1080, 1920)
    expect(c.bright / c.total).toBeGreaterThan(0.9)
  })

  it('paperFold runs and completes the reveal to the next scene', () => {
    const cfg = {
      size: [1080, 1920] as [number, number],
      fps: 30,
      background: '#000000',
      scenes: [
        {
          id: 'a',
          duration: 2,
          background: '#ff0000',
          transition: { type: 'paperFold' as const, duration: 1 },
          elements: [] as unknown[],
        },
        { id: 'b', duration: 2, background: '#0000ff', elements: [] as unknown[] },
      ],
    } as unknown as VeloxVideoConfig

    const ctx = freshCtx(1080, 1920)
    // Before the transition (frame 0): outgoing scene A (red) is active.
    drawFrame(ctx, cfg, 0, 1080, 1920)
    const before = colorCounts(ctx, 1080, 1920)
    expect(before.red).toBeGreaterThan(before.blue)

    // Mid/late transition (frame 59, inside the paperFold window): no throw, and
    // the incoming scene B (blue) has fully unfolded in.
    expect(() => drawFrame(ctx, cfg, 45, 1080, 1920)).not.toThrow()
    drawFrame(ctx, cfg, 59, 1080, 1920)
    const after = colorCounts(ctx, 1080, 1920)
    expect(after.blue).toBeGreaterThan(after.red)
  })
})
