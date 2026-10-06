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
  })()
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

  const { args, hasAudio } = buildAudioMixArgs({ ...resolved, tracks: usable }, 'input.mp4')
  if (!hasAudio) return videoBlob

  const ffmpeg = await getFFmpeg(opts)
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoBlob))

  // ffmpeg.wasm cannot read URLs directly, so rewrite each audio `-i` input to
  // a file we wrote into the FS, preserving the order they appear in `args`.
  let audioIdx = 0
  let wroteAny = false
  let failedAny = false
  const inputArgs = [...args]
  for (let i = 0; i < inputArgs.length; i++) {
    if (inputArgs[i] !== '-i') continue
    const src = inputArgs[i + 1]
    if (src === 'input.mp4') continue // video input, already written
    try {
      const buf = src.startsWith('blob:')
        ? await fetchFile(src)
        : await fetchFile(await (await fetch(src)).blob())
      const name = `audio${audioIdx}.dat`
      await ffmpeg.writeFile(name, buf)
      inputArgs[i + 1] = name
      audioIdx++
      wroteAny = true
    } catch {
      // Un-fetchable audio (CORS / 404). Its label is still referenced by the
      // graph, so abort the mux and return the unmuxed video rather than emit
      // a broken ffmpeg command.
      failedAny = true
      break
    }
  }

  if (!wroteAny || failedAny) return videoBlob

  try {
    await ffmpeg.exec([...args, 'output.mp4'])
    const out = await ffmpeg.readFile('output.mp4')
    const bytes = out instanceof Uint8Array ? out : new Uint8Array(out as unknown as ArrayBuffer)
    return new Blob([bytes as BlobPart], { type: 'video/mp4' })
  } finally {
    await ffmpeg.deleteFile('input.mp4').catch(() => {})
    await ffmpeg.deleteFile('output.mp4').catch(() => {})
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
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(fps)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    recorder.onerror = () => reject(new Error('MediaRecorder capture failed'))
    recorder.start()
    setTimeout(() => recorder.stop(), Math.round(durationSec * 1000))
  })
}
