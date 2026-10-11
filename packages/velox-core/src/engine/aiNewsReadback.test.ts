import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import '../node-render.js'
import { drawFrame, setImageCache, createVideoFromMarkup } from '../index.js'
import { preloadRasterInNodeWithLoader } from './preloadRasterInNode.js'
import type { VeloxVideoConfig } from '../types.js'

const requireLocal = createRequire(path.join(process.cwd(), 'package.json'))

describe('this-week-in-ai reel', () => {
  const vml = fs.readFileSync(
    path.join(process.cwd(), 'fixtures/this-week-in-ai.vml'),
    'utf8',
  )

  it('compiles into 6 scenes', () => {
    const cfg = createVideoFromMarkup(vml).config as VeloxVideoConfig
    expect(cfg.scenes.length).toBe(6)
    expect(cfg.size).toEqual([1080, 1920])
  })

  it('draws the first frame of every scene without error', async () => {
    const cfg = createVideoFromMarkup(vml).config as VeloxVideoConfig
    const mod = requireLocal('@napi-rs/canvas') as {
      Path?: typeof Path2D
      Path2D?: typeof Path2D
      loadImage: (src: string) => Promise<unknown>
    }
    globalThis.Path2D = mod.Path2D ?? mod.Path ?? globalThis.Path2D
    const cache = await preloadRasterInNodeWithLoader(cfg, mod.loadImage)
    setImageCache(cache)

    const w = 1080
    const h = 1920
    const canvas = createCanvas(w, h) as unknown as {
      data(): Buffer
      getContext(type: '2d'): CanvasRenderingContext2D
    }
    const ctx = canvas.getContext('2d')

    let start = 0
    for (let i = 0; i < cfg.scenes.length; i++) {
      // Sample ~40% into the scene, where entrance animations have settled.
      const frame = start + Math.round(cfg.scenes[i].duration * cfg.fps * 0.4)
      ctx.clearRect(0, 0, w, h)
      drawFrame(ctx, cfg, frame, w, h)
      const pixels = canvas.data()
      expect(pixels.length).toBe(w * h * 4)
      // On the dark obsidian theme, title text renders bright (light-on-dark).
      let bright = 0
      for (let p = 0; p < pixels.length; p += 4) {
        if (pixels[p] + pixels[p + 1] + pixels[p + 2] > 180) {
          bright++
          if (bright > 300) break
        }
      }
      expect(bright).toBeGreaterThan(300)
      start += Math.round(cfg.scenes[i].duration * cfg.fps)
    }
  })
})
