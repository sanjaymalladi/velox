'use client'

/**
 * Browser audio muxer — client-side equivalent of the Node `muxAudioPlan`.
 *
 * Uses `@ffmpeg/ffmpeg` (WebAssembly) to mux resolved music / SFX / voiceover
 * onto a captured video blob (e.g. a WebM from `canvas.captureStream` +
 * `MediaRecorder`). The ffmpeg filter graph is shared with the Node path via
 * `buildAudioMixArgs` from `@velox-video/core`, so behaviour stays identical.
 *
 * Audio sources must be fetchable URLs (http(s)/data/blob). The ffmpeg core is
 * loaded from a CDN at runtime (configurable via `coreBaseURL`).
 */

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { resolveAudio, buildAudioMixArgs } from '@velox-video/core'
import type { VeloxVideoConfig } from '@velox-video/core'

export interface BrowserMuxOptions {
  /** Base URL for bundled audio (maps preset names → `<remoteBase>/audio/*.mp3`). */
  remoteBase?: string
  /** Base URL for the @ffmpeg/core wasm distribution. */
  coreBaseURL?: string
  /** Called with ffmpeg progress (0..1). */
  onProgress?: (p: number) => void
  /** Called with ffmpeg log lines (debugging). */
  onLog?: (line: string) => void
}

let ffmpegSingleton: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

async function getFFmpeg(opts: BrowserMuxOptions): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton
  if (loadPromise) return loadPromise
  const ffmpeg = new FFmpeg()
  if (opts.onLog) ffmpeg.on('log', ({ message }) => opts.onLog?.(message))
  if (opts.onProgress) ffmpeg.on('progress', ({ progress }) => opts.onProgress?.(Math.max(0, Math.min(1, progress))))
  const base = opts.coreBaseURL ?? 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  loadPromise = (async () => {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegSingleton = ffmpeg
    return ffmpeg
  })().catch((err) => {
    loadPromise = null
    throw err
  })
  return loadPromise
}

/**
 * Mux audio (from `config.audio` / `audioPlan` / scene `audio`) onto `videoBlob`.
 * Returns a new MP4 Blob, or the original blob if no audio could be resolved.
 */
export async function muxAudioInBrowser(
  videoBlob: Blob,
  config: VeloxVideoConfig,
  opts: BrowserMuxOptions = {},
): Promise<Blob> {
  const resolved = resolveAudio(config, { remoteBase: opts.remoteBase })
  const usable = resolved.tracks.filter(
    (t) => /^(https?:|data:|blob:)/.test(t.src) || t.src.startsWith('//'),
  )
  if (usable.length === 0) return videoBlob

  const { args, hasAudio } = buildAudioMixArgs({ ...resolved, tracks: usable }, 'input.webm')
  if (!hasAudio) return videoBlob

  const ffmpeg = await getFFmpeg(opts)
  const files = ['input.webm', 'output.mp4']
  try {
    await ffmpeg.writeFile('input.webm', await fetchFile(videoBlob))
    // ffmpeg.wasm cannot read URLs directly, so rewrite each audio input to a
    // file in its virtual filesystem, preserving the filter graph input order.
    let audioIdx = 0
    const inputArgs = [...args]
    for (let i = 0; i < inputArgs.length; i++) {
      if (inputArgs[i] !== '-i') continue
      const src = inputArgs[i + 1]
      if (src === 'input.webm') continue
      try {
        let buf: Uint8Array
        if (src.startsWith('blob:') || src.startsWith('data:')) {
          buf = await fetchFile(src)
        } else {
          const response = await fetch(src.startsWith('//') ? `${location.protocol}${src}` : src)
          if (!response.ok) throw new Error(`Audio fetch failed (${response.status})`)
          buf = await fetchFile(await response.blob())
        }
        let ext = '.dat'
        try { ext = `.${new URL(src, location.href).pathname.split('.').pop() || 'dat'}` } catch { /* use probeable .dat */ }
        const name = `audio${audioIdx}${ext}`
        files.push(name)
        await ffmpeg.writeFile(name, buf)
        inputArgs[i + 1] = name
        audioIdx++
      } catch {
        // A partial audio mix is misleading; return the silent capture instead.
        return videoBlob
      }
    }
    const codecIndex = inputArgs.indexOf('-c:v')
    if (codecIndex >= 0) inputArgs[codecIndex + 1] = 'libx264'
    inputArgs.push('-pix_fmt', 'yuv420p', 'output.mp4')
    await ffmpeg.exec(inputArgs)
    const out = await ffmpeg.readFile('output.mp4')
    const bytes = out instanceof Uint8Array ? out : new Uint8Array(out as unknown as ArrayBuffer)
    return new Blob([bytes as BlobPart], { type: 'video/mp4' })
  } finally {
    await Promise.all(files.map((file) => ffmpeg.deleteFile(file).catch(() => {})))
  }
}

/**
 * Capture the live preview canvas to a WebM blob via MediaRecorder.
 * Records `durationSec` seconds at `fps`.
 */
export function captureCanvasToWebm(
  canvas: HTMLCanvasElement,
  durationSec: number,
  fps = 30,
  renderFrame?: (frame: number) => void | Promise<void>,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let stream = canvas.captureStream(renderFrame ? 0 : fps)
    let track = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined
    if (renderFrame && typeof track?.requestFrame !== 'function') {
      stream.getTracks().forEach((t) => t.stop())
      stream = canvas.captureStream(fps)
      track = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined
    }
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find((type) => MediaRecorder.isTypeSupported(type))
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: BlobPart[] = []
    let failed = false
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    recorder.onerror = () => {
      failed = true
      reject(new Error('MediaRecorder capture failed'))
    }
    recorder.start()
    if (!renderFrame) {
      setTimeout(() => recorder.stop(), Math.round(durationSec * 1000))
      return
    }
    const count = Math.max(1, Math.round(durationSec * fps))
    void (async () => {
      try {
        for (let frame = 0; frame < count; frame++) {
          await renderFrame(frame)
          track?.requestFrame?.()
          if (frame + 1 < count) await new Promise((r) => setTimeout(r, 1000 / fps))
        }
        if (!failed) recorder.stop()
      } catch (err) {
        if (recorder.state !== 'inactive') recorder.stop()
        reject(err)
      }
    })()
    recorder.addEventListener('stop', () => stream.getTracks().forEach((t) => t.stop()), { once: true })
  })
}
