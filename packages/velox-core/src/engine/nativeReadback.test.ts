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

describe('native canvas readback', () => {
  it('draws minimal reel frames without pixel readback errors', async () => {
    const vmlPath = path.join(process.cwd(), 'fixtures/minimal-reel.vml')
    const vml = fs.readFileSync(vmlPath, 'utf8')
    const video = createVideoFromMarkup(vml)
    const cfg = video.config as VeloxVideoConfig

    const spec = `${String.fromCharCode(64)}napi-rs/canvas`
    const mod = requireLocal(spec) as { Path?: typeof Path2D; Path2D?: typeof Path2D; loadImage: (src: string) => Promise<unknown> }
    globalThis.Path2D = mod.Path2D ?? mod.Path ?? globalThis.Path2D

    const cache = await preloadRasterInNodeWithLoader(cfg, mod.loadImage)
    setImageCache(cache)

    const w = 1080
    const h = 1920
    const total = cfg.scenes.reduce((acc, scene) => {
      const frames = Math.round(scene.duration * cfg.fps)
      const trans = scene.transition ? Math.round(scene.transition.duration * cfg.fps) : 0
      return acc + frames - trans
    }, 0)

    type NodeCanvas = {
      data(): Buffer
      getContext(type: '2d', attrs?: { willReadFrequently?: boolean }): CanvasRenderingContext2D & { reset?: () => void }
    }
    const canvas = createCanvas(w, h) as unknown as NodeCanvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const expected = w * h * 4

    const sampleFrames = [0, Math.floor(total / 3), Math.floor((2 * total) / 3), total - 1]
    for (const frame of sampleFrames) {
      ctx.reset?.()
      drawFrame(ctx, cfg, frame, w, h)
      const pixels = canvas.data()
      expect(pixels.length).toBeGreaterThanOrEqual(expected)
    }
  })

  it('does not repaint ribbon metric cards black when a caption pill follows', () => {
    const vml = `<video size="portrait" fps="30" theme="dell-1996">
  <scene duration="4" template="centerCard">
    <column slot="center" gap="28">
      <metricRow gap="24">
        <metric value="10×" label="Faster iteration" />
        <metric value="30fps" label="Native export" />
      </metricRow>
      <countdown value="30fps" label="1080p native render" />
    </column>
    <captions slot="caption" text="Production-grade exports." style="pill" start="0.5" />
  </scene>
</video>`
    const cfg = createVideoFromMarkup(vml).config as VeloxVideoConfig
    const spec = `${String.fromCharCode(64)}napi-rs/canvas`
    const mod = requireLocal(spec) as { Path?: typeof Path2D; Path2D?: typeof Path2D }
    globalThis.Path2D = mod.Path2D ?? mod.Path ?? globalThis.Path2D

    const canvas = createCanvas(1080, 1920) as unknown as {
      getContext(type: '2d'): CanvasRenderingContext2D
    }
    const ctx = canvas.getContext('2d')
    const frame = Math.round(4 * 30 * 0.5)
    drawFrame(ctx, cfg, frame, 1080, 1920)

    // Center of the left metric card — must not be repainted solid black by the caption pill.
    const sample = ctx.getImageData(328, 786, 1, 1).data
    const isSolidBlack = sample[0] < 12 && sample[1] < 12 && sample[2] < 12
    expect(isSolidBlack).toBe(false)
    expect(sample[0] + sample[1] + sample[2]).toBeGreaterThan(80)
  })
})
