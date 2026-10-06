import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { createVideoFromMarkup, configToMarkup } from '../markupCompiler'
import { drawFrame } from './drawFrame'
import type { VeloxVideoConfig } from '../types'

const requireLocal = createRequire(path.join(process.cwd(), 'package.json'))

function freshCtx(w: number, h: number): CanvasRenderingContext2D {
  const mod = requireLocal('@napi-rs/canvas') as {
    Path?: typeof Path2D
    Path2D?: typeof Path2D
  }
  globalThis.Path2D = mod.Path2D ?? mod.Path ?? globalThis.Path2D
  const canvas = createCanvas(w, h) as unknown as {
    getContext(type: '2d'): CanvasRenderingContext2D
  }
  return canvas.getContext('2d')
}

function centroid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  match: (r: number, g: number, b: number) => boolean,
): [number, number] | null {
  const data = ctx.getImageData(0, 0, w, h).data
  let sx = 0
  let sy = 0
  let n = 0
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4
      if (match(data[i], data[i + 1], data[i + 2])) {
        sx += x
        sy += y
        n++
      }
    }
  }
  return n ? [sx / n, sy / n] : null
}

describe('multi-plane parallax (parallaxDrift + depth)', () => {
  it('parses depth from VML and round-trips through the serializer', () => {
    const vml = `<video size="portrait" fps="30" camera="parallaxDrift">
      <scene duration="4">
        <text value="near" x="540" y="960" depth="1" />
        <text value="far" x="540" y="960" depth="-1" />
      </scene>
    </video>`
    const cfg = createVideoFromMarkup(vml).config
    const depths = cfg.scenes[0].elements.map((e) => e.depth)
    expect(depths).toEqual([1, -1])

    const round = createVideoFromMarkup(configToMarkup(cfg)).config
    expect(round.scenes[0].elements.map((e) => e.depth)).toEqual([1, -1])
  })

  it('moves near and far planes by different amounts under parallaxDrift', () => {
    const cfg = {
      size: [1080, 1920] as [number, number],
      fps: 30,
      background: '#000000',
      scenes: [
        {
          id: 's1',
          duration: 4,
          camera: 'parallaxDrift',
          elements: [
            {
              id: 'near',
              type: 'shape',
              position: { type: 'absolute', x: 540, y: 960 },
              depth: 1,
              shape: { shapeType: 'rect', width: 200, height: 200, color: '#ff0000' },
            },
            {
              id: 'far',
              type: 'shape',
              position: { type: 'absolute', x: 540, y: 960 },
              depth: -1,
              shape: { shapeType: 'rect', width: 200, height: 200, color: '#0000ff' },
            },
          ],
        },
      ],
    } as unknown as VeloxVideoConfig

    const ctx = freshCtx(1080, 1920)
    // localFrame = 30 → rawT = 0.25, a point where the drift is non-zero.
    drawFrame(ctx, cfg, 30, 1080, 1920)

    const near = centroid(ctx, 1080, 1920, (r, g, b) => r > 150 && g < 100 && b < 100)
    const far = centroid(ctx, 1080, 1920, (r, g, b) => b > 150 && r < 100 && g < 100)
    expect(near).not.toBeNull()
    expect(far).not.toBeNull()

    // Far plane (depth -1) is locked at the canvas center; near plane (depth +1) drifts.
    expect(Math.abs(far![0] - 540)).toBeLessThan(4)
    expect(Math.abs(near![0] - 540)).toBeGreaterThan(3)
    expect(Math.abs(near![0] - far![0])).toBeGreaterThan(3)
  })
})
