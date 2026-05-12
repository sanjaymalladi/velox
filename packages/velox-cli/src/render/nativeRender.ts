/**
 * Native renderer — zero dependencies.
 * Uses @napi-rs/canvas (Skia) + h264-mp4-encoder (WASM) to render MP4s
 * directly from a VeloxVideoConfig, with no browser, no FFmpeg, no system deps.
 */
import path from 'path'
import fs from 'fs-extra'
import type { VeloxVideoConfig } from '@velox-video/core'
import { drawFrame, getTotalFrames, resolveSize } from '@velox-video/core'

export interface RenderOptions {
  outputPath: string
  format?: 'mp4' | 'gif' | 'png-sequence'
  quality?: number       // 0-100 user quality (higher = better)
  onProgress?: (progress: number, frame: number, total: number) => void
}

function toQualityPercent(quality?: number): number {
  if (!Number.isFinite(quality)) return 80
  return Math.min(100, Math.max(0, quality as number))
}

function toMp4Quantization(quality?: number): number {
  const percent = toQualityPercent(quality)
  const qp = 51 - (percent / 100) * 41
  return Math.round(Math.min(51, Math.max(10, qp)))
}

function toGifQuality(quality?: number): number {
  const percent = toQualityPercent(quality)
  // gif-encoder-2: lower is better, valid 1-30
  return Math.round(30 - (percent / 100) * 29)
}

export async function nativeRender(config: VeloxVideoConfig, opts: RenderOptions): Promise<void> {
  const { outputPath, format = 'mp4', onProgress } = opts
  const [width, height] = resolveSize(config.size)
  const totalFrames = getTotalFrames(config)

  if (format === 'mp4') {
    await renderMp4(config, width, height, totalFrames, outputPath, opts)
  } else if (format === 'gif') {
    await renderGif(config, width, height, totalFrames, outputPath, opts)
  } else if (format === 'png-sequence') {
    await renderPngSequence(config, width, height, totalFrames, outputPath, opts)
  } else {
    throw new Error(`Unsupported render format "${format}".`)
  }
}

// ─── MP4 Renderer ────────────────────────────────────────────────────────────

async function renderMp4(
  config: VeloxVideoConfig,
  width: number,
  height: number,
  totalFrames: number,
  outputPath: string,
  opts: RenderOptions
): Promise<void> {
  // Use require() so Node resolves from node_modules (not ESM resolver which breaks in CJS bundles)
  const { createCanvas } = require('@napi-rs/canvas')
  const HME = require('h264-mp4-encoder')

  const encoder = await HME.createH264MP4Encoder()
  // H264 requires dimensions to be multiples of 2
  encoder.width = Math.floor(width / 2) * 2
  encoder.height = Math.floor(height / 2) * 2
  encoder.frameRate = Math.round(config.fps || 30)
  encoder.quantizationParameter = toMp4Quantization(opts.quality)
  encoder.initialize()

  const canvas = createCanvas(encoder.width, encoder.height)
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D

  for (let frame = 0; frame < totalFrames; frame++) {
    drawFrame(ctx, config, frame, width, height)

    // Get raw RGBA pixel data
    const imageData = ctx.getImageData(0, 0, width, height)
    encoder.addFrameRgba(imageData.data as unknown as Uint8Array)

    opts.onProgress?.(frame / totalFrames, frame, totalFrames)
  }

  encoder.finalize()
  const data = encoder.FS.readFile(encoder.outputFilename)
  await fs.ensureDir(path.dirname(outputPath))
  await fs.writeFile(outputPath, Buffer.from(data))

  // Cleanup encoder
  try { encoder.delete() } catch {}
}

// ─── GIF Renderer ────────────────────────────────────────────────────────────

async function renderGif(
  config: VeloxVideoConfig,
  width: number,
  height: number,
  totalFrames: number,
  outputPath: string,
  opts: RenderOptions
): Promise<void> {
  const { createCanvas } = require('@napi-rs/canvas')
  const GIFEncoder = require('gif-encoder-2')

  // GIFs are large — render at max 600px wide, 12fps
  const scale = Math.min(1, 600 / width)
  const gifW = Math.round(width * scale)
  const gifH = Math.round(height * scale)
  const gifFps = Math.min(config.fps, 12)
  const step = Math.round(config.fps / gifFps)

  const encoder = new GIFEncoder(gifW, gifH, 'neuquant', true)
  const stream = encoder.createReadStream()
  const chunks: Buffer[] = []
  stream.on('data', (c: Buffer) => chunks.push(c))

  encoder.start()
  encoder.setDelay(Math.round(1000 / gifFps))
  encoder.setQuality(toGifQuality(opts.quality))

  const canvas = createCanvas(width, height)
  const gifCanvas = createCanvas(gifW, gifH)
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  const gifCtx = gifCanvas.getContext('2d') as unknown as CanvasRenderingContext2D

  for (let frame = 0; frame < totalFrames; frame += step) {
    drawFrame(ctx, config, frame, width, height)
    // Downscale to gif canvas
    gifCtx.drawImage(canvas as any, 0, 0, gifW, gifH)
    const imageData = gifCtx.getImageData(0, 0, gifW, gifH)
    encoder.addFrame(imageData.data as any)
    opts.onProgress?.(frame / totalFrames, frame, totalFrames)
  }

  encoder.finish()
  await new Promise(resolve => stream.on('end', resolve))
  await fs.ensureDir(path.dirname(outputPath))
  await fs.writeFile(outputPath, Buffer.concat(chunks))
}

// ─── PNG Sequence Renderer ───────────────────────────────────────────────────

async function renderPngSequence(
  config: VeloxVideoConfig,
  width: number,
  height: number,
  totalFrames: number,
  outputDir: string,
  opts: RenderOptions
): Promise<void> {
  const { createCanvas } = require('@napi-rs/canvas')
  await fs.ensureDir(outputDir)

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D

  for (let frame = 0; frame < totalFrames; frame++) {
    drawFrame(ctx, config, frame, width, height)
    const pngData = await (canvas as any).encode('png')
    const frameName = `frame_${String(frame).padStart(5, '0')}.png`
    await fs.writeFile(path.join(outputDir, frameName), pngData)
    opts.onProgress?.(frame / totalFrames, frame, totalFrames)
  }
}
