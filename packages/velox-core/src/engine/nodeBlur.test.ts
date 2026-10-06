import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import '../node-render.js'
import { drawFrame, setImageCache } from '../index.js'
import type { VeloxVideoConfig } from '../types.js'

const requireLocal = createRequire(path.join(process.cwd(), 'package.json'))

function freshCtx(w: number, h: number) {
  const spec = `${String.fromCharCode(64)}napi-rs/canvas`
  const mod = requireLocal(spec) as { Path?: typeof Path2D; Path2D?: typeof Path2D }
  globalThis.Path2D = mod.Path2D ?? mod.Path ?? globalThis.Path2D
  const canvas = createCanvas(w, h) as unknown as {
    getContext(type: '2d'): CanvasRenderingContext2D
    data(): Buffer
  }
  return canvas.getContext('2d')
}

describe('native per-element blur / filters', () => {
  it('renders a glowing (blurred) shape on Node without throwing', () => {
    const cfg = {
      size: [1080, 1920] as [number, number],
      fps: 30,
      background: '#000000',
      scenes: [
        {
          id: 's1',
          duration: 2,
          elements: [
            {
              id: 'e1',
              type: 'shape',
              position: { type: 'center' },
              shape: { shapeType: 'rect', width: 400, height: 200, color: '#ff3366' },
              loop: { animation: 'glow' },
            },
          ],
        },
      ],
    } as unknown as VeloxVideoConfig

    const ctx = freshCtx(1080, 1920)
    expect(() => drawFrame(ctx, cfg, 8, 1080, 1920)).not.toThrow()
  })

  it('applies brightness/saturate to an image on Node without throwing', () => {
    const img = createCanvas(10, 10) as unknown as CanvasImageSource & { width: number; height: number }
    const ictx = (img as unknown as { getContext(t: '2d'): CanvasRenderingContext2D }).getContext('2d')
    ictx.fillStyle = '#3366ff'
    ictx.fillRect(0, 0, 10, 10)
    setImageCache(new Map([['test.png', img as unknown as never]]))

    const cfg = {
      size: [1080, 1920] as [number, number],
      fps: 30,
      background: '#000000',
      scenes: [
        {
          id: 's1',
          duration: 2,
          elements: [
            {
              id: 'img',
              type: 'image',
              src: 'test.png',
              position: { type: 'center' },
              width: 300,
              height: 200,
              brightness: 1.25,
              saturate: 1.1,
            },
          ],
        },
      ],
    } as unknown as VeloxVideoConfig

    const ctx = freshCtx(1080, 1920)
    expect(() => drawFrame(ctx, cfg, 0, 1080, 1920)).not.toThrow()
  })
})
