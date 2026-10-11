/**
 * Native renderer — zero dependencies.
 * Uses @napi-rs/canvas (Skia) + h264-mp4-encoder (WASM) to render MP4s
 * directly from a VeloxVideoConfig, with no browser, no FFmpeg, no system deps.
 */
import path from 'path'
import { createRequire } from 'module'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'fs-extra'
import { performance } from 'node:perf_hooks'
import type { VeloxVideoConfig } from '@velox-video/core'
import '@velox-video/core/node-render'
import { createFrameRenderer, getTotalFrames, resolveSize, setImageCache } from '@velox-video/core'
import type { LoadImageFn } from '@velox-video/core/node-render'
import { registerVeloxFonts } from './registerFonts'
import { resolveRenderTuning, scaledDimensions } from './renderOptions'
import { muxAudioPlan } from './muxAudio'
import { resolveFfmpegPath } from './resolveFfmpeg'
import { resolveHardwareVideoEncoder, type HardwareVideoEncoder } from './hardwareEncoder'

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
  /** Write stage timings and memory data to <output>.profile.json. */
  profile?: boolean
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
  const renderStartedAt = performance.now()
  const memoryStart = process.memoryUsage()
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
  const preloadStartedAt = performance.now()
  const imgCache = await preloadRasterInNodeWithLoader(config, loadImage)
  setImageCache(imgCache)
  const preloadMs = performance.now() - preloadStartedAt
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

  let stageTimings: Record<string, number> = {}
  let videoEncoder = 'h264-mp4-encoder-wasm'
  let audioMuxMs = 0
  const draw = createFrameRenderer(config, width, height)
  if (format === 'mp4') {
    const result = await renderMp4(config, renderW, renderH, totalFrames, outputPath, opts, tuning, emitProgress, draw)
    stageTimings = result.timings
    videoEncoder = result.encoder
    const muxStartedAt = performance.now()
    const packageDir = path.join(__dirname, '..')
    await muxAudioPlan(
      outputPath,
      config,
      opts.sourceDir ?? path.dirname(outputPath),
      packageDir,
    )
    audioMuxMs = performance.now() - muxStartedAt
  } else if (format === 'gif') {
    await renderGif(config, renderW, renderH, totalFrames, outputPath, opts, tuning, emitProgress, draw)
  } else if (format === 'png-sequence') {
    await renderPngSequence(config, renderW, renderH, totalFrames, outputPath, opts, tuning, emitProgress, draw)
  } else {
    throw new Error(`Unsupported render format "${format}".`)
  }

  if (opts.profile && format === 'mp4') {
    const totalMs = performance.now() - renderStartedAt
    const memoryEnd = process.memoryUsage()
    const stat = await fs.stat(outputPath)
    const renderedFrames = Math.ceil(totalFrames / tuning.frameStep)
    const profilePath = `${outputPath}.profile.json`
    await fs.writeJson(profilePath, {
      schemaVersion: 1,
      renderer: `native-canvas-${videoEncoder}`,
      resolution: { width: renderW, height: renderH },
      sourceResolution: { width, height },
      sourceFps: config.fps,
      exportFps: tuning.exportFps,
      frameStep: tuning.frameStep,
      sourceFrames: totalFrames,
      renderedFrames,
      durationSeconds: totalFrames / config.fps,
      sceneCount: config.scenes.length,
      outputBytes: stat.size,
      timingsMs: {
        preloadAssets: roundMs(preloadMs),
        ...Object.fromEntries(Object.entries(stageTimings).map(([key, value]) => [key, roundMs(value)])),
        audioMux: roundMs(audioMuxMs),
        total: roundMs(totalMs),
      },
      renderFramesPerSecond: roundMs(renderedFrames / ((stageTimings.draw + stageTimings.pixelReadback + stageTimings.encoderSubmit + stageTimings.encoderFinalize) / 1000)),
      endToEndFramesPerSecond: roundMs(renderedFrames / (totalMs / 1000)),
      memoryBytes: { rssStart: memoryStart.rss, rssEnd: memoryEnd.rss, heapUsedStart: memoryStart.heapUsed, heapUsedEnd: memoryEnd.heapUsed },
    }, { spaces: 2 })
    console.log(`[velox] Render profile → ${profilePath}`)
  }
}

function roundMs(value: number): number {
  return Math.round(value * 100) / 100
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
  draw: (ctx: CanvasRenderingContext2D, frame: number) => void,
): Promise<{ timings: Record<string, number>; encoder: string }> {
  const ffmpeg = await resolveFfmpegPath()
  if (ffmpeg) {
    const hardwareEncoder = await resolveHardwareVideoEncoder(ffmpeg)
    if (hardwareEncoder) {
      console.log(`[velox] Using GPU video encoder: ${hardwareEncoder.name}`)
      try {
        return {
          timings: await renderMp4WithHardwareEncoder(
            ffmpeg, hardwareEncoder, config, width, height, totalFrames,
            outputPath, opts, tuning, emitProgress, draw,
          ),
          encoder: hardwareEncoder.name,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[velox] GPU encoder failed; retrying with portable WASM encoder: ${message}`)
        await fs.remove(outputPath).catch(() => {})
        await fs.remove(`${outputPath}.gpu.tmp.mp4`).catch(() => {})
      }
    }
  }

  return {
    timings: await renderMp4WithWasm(config, width, height, totalFrames, outputPath, opts, tuning, emitProgress, draw),
    encoder: 'h264-mp4-encoder-wasm',
  }
}

async function renderMp4WithHardwareEncoder(
  ffmpeg: string,
  hardwareEncoder: HardwareVideoEncoder,
  config: VeloxVideoConfig,
  width: number,
  height: number,
  totalFrames: number,
  outputPath: string,
  opts: RenderOptions,
  tuning: NativeRenderTuning,
  emitProgress: (rendered: number, sourceFrame: number) => void,
  draw: (ctx: CanvasRenderingContext2D, frame: number) => void,
): Promise<Record<string, number>> {
  const { createCanvas } = require('@napi-rs/canvas')
  const [logicalW, logicalH] = resolveSize(config.size)
  type NodeCanvas = { data(): Buffer }
  type NodeCtx = CanvasRenderingContext2D & { reset?: () => void }

  const canvas = createCanvas(width, height) as NodeCanvas & { getContext(type: '2d', attrs?: { willReadFrequently?: boolean }): NodeCtx }
  const ctx = canvas.getContext('2d', { willReadFrequently: false })
  const expectedBytes = width * height * 4
  const step = tuning.frameStep
  const tempOutput = `${outputPath}.gpu.tmp.mp4`
  await fs.ensureDir(path.dirname(outputPath))
  const child = spawn(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${width}x${height}`,
    '-framerate', String(tuning.exportFps), '-i', 'pipe:0',
    '-an', '-c:v', hardwareEncoder.name,
    ...hardwareEncoder.args(toMp4Quantization(opts.quality)),
    '-pix_fmt', 'yuv420p', '-r', String(tuning.exportFps), '-movflags', '+faststart',
    tempOutput,
  ], { stdio: ['pipe', 'ignore', 'pipe'] })

  let stderr = ''
  child.stderr?.on('data', (chunk: Buffer) => {
    if (stderr.length < 16_384) stderr += chunk.toString()
  })
  child.stdin.on('error', () => {})
  const exitPromise = new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg ${hardwareEncoder.name} exited (${code ?? signal}): ${stderr.trim()}`))
    })
  })
  // The exit promise can reject while the render loop is still drawing. It is
  // awaited by the loop's backpressure handler or after stdin closes.
  void exitPromise.catch(() => {})

  const timings = opts.profile ? { draw: 0, pixelReadback: 0, encoderSubmit: 0, encoderFinalize: 0, videoWrite: 0 } : undefined
  let rendered = 0
  try {
    for (let frame = 0; frame < totalFrames; frame += step) {
      ctx.reset?.()
      if (width !== logicalW || height !== logicalH) ctx.scale(width / logicalW, height / logicalH)
      let stageStartedAt = timings ? performance.now() : 0
      draw(ctx, frame)
      if (timings) {
        timings.draw += performance.now() - stageStartedAt
        stageStartedAt = performance.now()
      }
      const pixels = canvas.data()
      if (timings) {
        timings.pixelReadback += performance.now() - stageStartedAt
        stageStartedAt = performance.now()
      }
      if (pixels.length < expectedBytes) {
        throw new Error(`Canvas pixel readback failed at frame ${frame} (${pixels.length} < ${expectedBytes})`)
      }
      if (!child.stdin.write(pixels)) {
        await Promise.race([
          once(child.stdin, 'drain'),
          exitPromise.then(() => { throw new Error('FFmpeg closed its input before all frames were submitted.') }),
        ])
      }
      if (timings) timings.encoderSubmit += performance.now() - stageStartedAt
      emitProgress(rendered, frame)
      rendered++
    }

    const finalizeStartedAt = timings ? performance.now() : 0
    child.stdin.end()
    await exitPromise
    if (timings) timings.encoderFinalize = performance.now() - finalizeStartedAt

    const writeStartedAt = timings ? performance.now() : 0
    await fs.move(tempOutput, outputPath, { overwrite: true })
    if (timings) timings.videoWrite = performance.now() - writeStartedAt
    return timings ?? {}
  } catch (error) {
    child.kill()
    await exitPromise.catch(() => {})
    await fs.remove(tempOutput).catch(() => {})
    throw error
  }
}

async function renderMp4WithWasm(
  config: VeloxVideoConfig,
  width: number,
  height: number,
  totalFrames: number,
  outputPath: string,
  opts: RenderOptions,
  tuning: NativeRenderTuning,
  emitProgress: (rendered: number, sourceFrame: number) => void,
  draw: (ctx: CanvasRenderingContext2D, frame: number) => void,
): Promise<Record<string, number>> {
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
  const [logicalW, logicalH] = resolveSize(config.size)
  type NodeCanvas = { data(): Buffer }
  type NodeCtx = CanvasRenderingContext2D & { reset?: () => void }

  const canvas = createCanvas(encW, encH) as NodeCanvas & { getContext(type: '2d', attrs?: { willReadFrequently?: boolean }): NodeCtx }
  // `canvas.data()` reads the full frame through Skia's native API. The
  // browser-oriented willReadFrequently hint can force a software surface and
  // has not shown a benefit for this readback path.
  const ctx = canvas.getContext('2d', { willReadFrequently: false })

  const expectedBytes = encW * encH * 4
  const step = tuning.frameStep
  let rendered = 0
  const timings = opts.profile ? { draw: 0, pixelReadback: 0, encoderSubmit: 0, encoderFinalize: 0, videoWrite: 0 } : undefined
  for (let frame = 0; frame < totalFrames; frame += step) {
    ctx.reset?.()
    // Keep layout in the composition's logical coordinate space. A draft
    // shrinks the whole frame; it must not shrink only the canvas and crop text.
    if (encW !== logicalW || encH !== logicalH) ctx.scale(encW / logicalW, encH / logicalH)
    let stageStartedAt = timings ? performance.now() : 0
    draw(ctx, frame)
    if (timings) {
      timings.draw += performance.now() - stageStartedAt
      stageStartedAt = performance.now()
    }
    const pixels = canvas.data()
    if (timings) {
      timings.pixelReadback += performance.now() - stageStartedAt
      stageStartedAt = performance.now()
    }
    if (pixels.length < expectedBytes) {
      throw new Error(`Canvas pixel readback failed at frame ${frame} (${pixels.length} < ${expectedBytes})`)
    }
    encoder.addFrameRgba(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength))
    if (timings) timings.encoderSubmit += performance.now() - stageStartedAt
    emitProgress(rendered, frame)
    rendered++
  }

  let stageStartedAt = timings ? performance.now() : 0
  encoder.finalize()
  if (timings) timings.encoderFinalize = performance.now() - stageStartedAt
  const data = encoder.FS.readFile(encoder.outputFilename)
  await fs.ensureDir(path.dirname(outputPath))
  if (timings) stageStartedAt = performance.now()
  await fs.writeFile(outputPath, Buffer.from(data))
  if (timings) timings.videoWrite = performance.now() - stageStartedAt

  try { encoder.delete() } catch {}
  return timings ?? {}
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
  draw: (ctx: CanvasRenderingContext2D, frame: number) => void,
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
    draw(ctx, frame)
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
  draw: (ctx: CanvasRenderingContext2D, frame: number) => void,
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
    draw(ctx, frame)
    const pngData = await (canvas as { encode: (fmt: string) => Promise<Buffer> }).encode('png')
    const frameName = `frame_${String(rendered).padStart(5, '0')}.png`
    await fs.writeFile(path.join(outputDir, frameName), pngData)
    emitProgress(rendered, frame)
    rendered++
  }
}
