/**
 * Native renderer — zero dependencies.
 * Uses @napi-rs/canvas (Skia) + h264-mp4-encoder (WASM) to render MP4s
 * directly from a VeloxVideoConfig, with no browser, no FFmpeg, no system deps.
 */
import path from 'path'
import { createRequire } from 'module'
import fs from 'fs-extra'
import type { VeloxVideoConfig } from '@velox-video/core'
import '@velox-video/core/node-render'
import { drawFrame, getTotalFrames, resolveSize, setImageCache } from '@velox-video/core'
import type { LoadImageFn } from '@velox-video/core/node-render'
import { registerVeloxFonts } from './registerFonts'
import { resolveRenderTuning, scaledDimensions } from './renderOptions'
import { muxAudioPlan } from './muxAudio'

export interface RenderOptions {
  outputPath: string
  format?: 'mp4' | 'gif' | 'png-sequence'
  quality?: number       // 0-100 user quality (higher = better)
  /** Directory for resolving relative music/assets (VML file folder). */
  sourceDir?: string
  /** Output resolution scale 0.25–1 */
  scale?: number
  /** Cap export fps (skips frames, keeps duration) */
  exportFps?: number
  /** Fast draft: 50% res + max 30fps */
  draft?: boolean
  onProgress?: (progress: number, frame: number, total: number, rendered: number, renderTotal: number) => void
  onPhase?: (phase: 'preload' | 'render') => void
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

/** @napi-rs/canvas exposes Path as Path2D but does not install a global — charts/logos need it. */
function ensureNodePath2D(requireLocal: NodeJS.Require): void {
  if (typeof globalThis.Path2D !== 'undefined') return
  const specifier = `${String.fromCharCode(64)}napi-rs/canvas`
  const mod = requireLocal(specifier) as { Path?: typeof Path2D; Path2D?: typeof Path2D }
  const PathCtor = mod.Path2D ?? mod.Path
  if (!PathCtor) throw new Error('[@napi-rs/canvas] Path2D is unavailable in this environment.')
  ;(globalThis as typeof globalThis & { Path2D: typeof Path2D }).Path2D = PathCtor
}

export async function nativeRender(config: VeloxVideoConfig, opts: RenderOptions): Promise<void> {
  const { outputPath, format = 'mp4', onProgress } = opts
  const [width, height] = resolveSize(config.size)
  const totalFrames = getTotalFrames(config)
  const tuning = resolveRenderTuning(config, opts)
  const [renderW, renderH] = scaledDimensions(width, height, tuning.scale)
  const renderTotal = Math.ceil(totalFrames / tuning.frameStep)

  const requireLocal = createRequire(path.join(__dirname, 'index.js'))
  registerVeloxFonts()
  ensureNodePath2D(requireLocal)
  const specifier = `${String.fromCharCode(64)}napi-rs/canvas`
  const { loadImage } = requireLocal(specifier) as { loadImage: LoadImageFn }
  const { preloadRasterInNodeWithLoader } = await import('@velox-video/core/node-render')
  opts.onPhase?.('preload')
  const imgCache = await preloadRasterInNodeWithLoader(config, loadImage)
  setImageCache(imgCache)
  opts.onPhase?.('render')

  if (config.audioPlan && config.audioPlan.sfx.length > 0 && config.audioPlan.beats.length > 0) {
    // beats are timeline metadata for future visual sync
  }

  const emitProgress = (rendered: number, sourceFrame: number) => {
    onProgress?.(
      (rendered + 1) / renderTotal,
      sourceFrame,
      totalFrames,
      rendered,
      renderTotal,
    )
  }

  if (format === 'mp4') {
    await renderMp4(config, renderW, renderH, totalFrames, outputPath, opts, tuning, emitProgress)
    const music = config.audio?.src ?? config.audioPlan?.music?.src
    const vol = config.audio?.volume ?? config.audioPlan?.music?.volume ?? 0.35
    const packageDir = path.join(__dirname, '..')
    await muxAudioPlan(
      outputPath,
      config.audioPlan,
      music,
      vol,
      opts.sourceDir ?? path.dirname(outputPath),
      packageDir,
    )
  } else if (format === 'gif') {
    await renderGif(config, renderW, renderH, totalFrames, outputPath, opts, tuning, emitProgress)
  } else if (format === 'png-sequence') {
    await renderPngSequence(config, renderW, renderH, totalFrames, outputPath, opts, tuning, emitProgress)
  } else {
    throw new Error(`Unsupported render format "${format}".`)
  }
}

// ─── MP4 Renderer ────────────────────────────────────────────────────────────

import type { NativeRenderTuning } from './renderOptions'

async function renderMp4(
  config: VeloxVideoConfig,
  width: number,
  height: number,
  totalFrames: number,
  outputPath: string,
  opts: RenderOptions,
  tuning: NativeRenderTuning,
  emitProgress: (rendered: number, sourceFrame: number) => void,
): Promise<void> {
  const { createCanvas } = require('@napi-rs/canvas')
  const HME = require('h264-mp4-encoder')

  const encoder = await HME.createH264MP4Encoder()
  encoder.width = width
  encoder.height = height
  encoder.frameRate = tuning.exportFps
  encoder.quantizationParameter = toMp4Quantization(opts.quality)
  encoder.initialize()

  const encW = encoder.width
  const encH = encoder.height
  type NodeCanvas = { data(): Buffer }
  type NodeCtx = CanvasRenderingContext2D & { reset?: () => void }

  const canvas = createCanvas(encW, encH) as NodeCanvas & { getContext(type: '2d', attrs?: { willReadFrequently?: boolean }): NodeCtx }
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  const expectedBytes = encW * encH * 4
  const step = tuning.frameStep
  let rendered = 0
  for (let frame = 0; frame < totalFrames; frame += step) {
    ctx.reset?.()
    drawFrame(ctx, config, frame, encW, encH)
    const pixels = canvas.data()
    if (pixels.length < expectedBytes) {
      throw new Error(`Canvas pixel readback failed at frame ${frame} (${pixels.length} < ${expectedBytes})`)
    }
    encoder.addFrameRgba(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength))
    emitProgress(rendered, frame)
    rendered++
  }

  encoder.finalize()
  const data = encoder.FS.readFile(encoder.outputFilename)
  await fs.ensureDir(path.dirname(outputPath))
  await fs.writeFile(outputPath, Buffer.from(data))

  try { encoder.delete() } catch {}
}

// ─── GIF Renderer ────────────────────────────────────────────────────────────

async function renderGif(
  config: VeloxVideoConfig,
  width: number,
  height: number,
  totalFrames: number,
  outputPath: string,
  opts: RenderOptions,
  tuning: NativeRenderTuning,
  emitProgress: (rendered: number, sourceFrame: number) => void,
): Promise<void> {
  const { createCanvas } = require('@napi-rs/canvas')
  const GIFEncoder = require('gif-encoder-2')

  const scale = Math.min(1, 600 / width)
  const gifW = Math.round(width * scale)
  const gifH = Math.round(height * scale)
  const gifFps = Math.min(tuning.exportFps, 12)
  const step = Math.max(tuning.frameStep, Math.round(config.fps / gifFps))

  const encoder = new GIFEncoder(gifW, gifH, 'neuquant', true)
  const stream = encoder.createReadStream()
  const chunks: Buffer[] = []
  stream.on('data', (c: Buffer) => chunks.push(c))

  encoder.start()
  encoder.setDelay(Math.round(1000 / gifFps))
  encoder.setQuality(toGifQuality(opts.quality))

  const canvas = createCanvas(width, height)
  const gifCanvas = createCanvas(gifW, gifH)
  type NodeCanvas = { data(): Buffer }
  type NodeCtx = CanvasRenderingContext2D & { reset?: () => void }
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as NodeCtx
  const gifCtx = gifCanvas.getContext('2d', { willReadFrequently: true }) as NodeCtx

  const gifBytes = gifW * gifH * 4
  let rendered = 0
  for (let frame = 0; frame < totalFrames; frame += step) {
    ctx.reset?.()
    drawFrame(ctx, config, frame, width, height)
    gifCtx.reset?.()
    gifCtx.drawImage(canvas as unknown as CanvasImageSource, 0, 0, gifW, gifH)
    const pixels = (gifCanvas as NodeCanvas).data()
    if (pixels.length < gifBytes) {
      throw new Error(`GIF pixel readback failed at frame ${frame}`)
    }
    encoder.addFrame(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength) as unknown as Buffer)
    emitProgress(rendered, frame)
    rendered++
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
  opts: RenderOptions,
  tuning: NativeRenderTuning,
  emitProgress: (rendered: number, sourceFrame: number) => void,
): Promise<void> {
  const { createCanvas } = require('@napi-rs/canvas')
  await fs.ensureDir(outputDir)

  const canvas = createCanvas(width, height)
  type NodeCtx = CanvasRenderingContext2D & { reset?: () => void }
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as NodeCtx

  const step = tuning.frameStep
  let rendered = 0
  for (let frame = 0; frame < totalFrames; frame += step) {
    ctx.reset?.()
    drawFrame(ctx, config, frame, width, height)
    const pngData = await (canvas as { encode: (fmt: string) => Promise<Buffer> }).encode('png')
    const frameName = `frame_${String(rendered).padStart(5, '0')}.png`
    await fs.writeFile(path.join(outputDir, frameName), pngData)
    emitProgress(rendered, frame)
    rendered++
  }
}
