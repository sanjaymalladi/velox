import { describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { createVideoFromMarkup } from '../markupCompiler'
import { drawFrame } from './drawFrame'

describe('product UI demo renderer', () => {
  it('renders different seek-safe UI states as the pointer acts', () => {
    const video = createVideoFromMarkup(`
      <video size="720p" fps="30" theme="obsidian">
        <scene duration="6">
          <uiDemo prompt="Create a product video" result="Video ready" />
        </scene>
      </video>
    `)
    const canvas = createCanvas(1280, 720)
    const context = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
    const frames: Buffer[] = []

    for (const frame of [30, 90, 150]) {
      drawFrame(context, video.config, frame, 1280, 720)
      frames.push(canvas.toBuffer('image/png'))
    }

    expect(frames[0]).not.toEqual(frames[1])
    expect(frames[1]).not.toEqual(frames[2])
    const titleBarPixel = context.getImageData(640, 40, 1, 1).data
    expect(Math.max(titleBarPixel[0]!, titleBarPixel[1]!, titleBarPixel[2]!)).toBeLessThan(100)
  })
})
