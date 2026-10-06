/**
 * Audio resolution — map declarative audio references (`audioPlan`, scene
 * `audio`, config `audio`) to concrete, muxer-ready file paths / URLs.
 *
 * References are resolved as follows:
 *  - http(s): / data: / blob: URLs are passed through untouched.
 *  - strings that already look like a file path / have an audio extension are
 *    passed through (user-provided local files).
 *  - anything else is treated as a bundled royalty-free preset name and
 *    resolved against `assetRoot` (Node export) or `remoteBase` (browser).
 *
 * The muxers (#11 Node / #12 browser) consume the `ResolvedAudio` output.
 */

import type { VeloxVideoConfig, VeloxAudioPlan, SceneConfig } from './types'

export type AudioKind = 'music' | 'sfx' | 'voice'

export interface ResolvedAudioTrack {
  src: string
  kind: AudioKind
  /** Linear playback volume 0..1. */
  volume: number
  /** Seconds from global timeline start (sfx one-shots / scene voice). */
  at?: number
  /** When true, the music bed should duck while this track plays. */
  duck: boolean
}

export interface ResolvedAudio {
  tracks: ResolvedAudioTrack[]
  beats: number[]
  /** Total video duration in seconds. */
  durationSec: number
  hasAudio: boolean
}

export interface ResolveAudioOptions {
  /** Local directory containing bundled audio (files live in `<assetRoot>/audio`). */
  assetRoot?: string
  /** Remote base URL for bundled audio when running in the browser. */
  remoteBase?: string
  /** Override: declare a src already resolved (skips preset lookup). */
  isResolved?: (src: string) => boolean
  /** Resolve a bundled preset name to a concrete path/URL (CLI hook for its own layout). */
  resolvePresetName?: (name: string) => string | undefined
  /** Resolve a user-authored relative file path (CLI project-relative paths). */
  resolvePath?: (src: string) => string
}

/** Known bundled royalty-free preset names (documentation / Studio picker). */
export const BUNDLED_AUDIO_PRESETS = [
  'ambient',
  'upbeat',
  'cinematic',
  'lofi',
  'pop',
  'whoosh',
  'chime',
  'click',
] as const

const URL_RE = /^(https?:|data:|blob:|\/\/)/
const AUDIO_EXT = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/**
 * Pure ffmpeg argument builder for the audio mix. Returns the full argument
 * list (including `-y`, inputs, filter graph, maps and codecs) or
 * `{ args: [], hasAudio: false }` when there is nothing to mux.
 *
 * Behaviour:
 *  - Background music is sidechain-compressed (ducked) whenever any SFX or
 *    voice track is active.
 *  - SFX one-shots and voice tracks are delayed to their global timeline `at`.
 *  - Everything is summed with `amix` (duration = first, so it matches video).
 *
 * Pure / deterministic — safe to unit test without ffmpeg installed.
 */
export function buildAudioMixArgs(
  resolved: ResolvedAudio,
  videoPath: string,
): { args: string[]; hasAudio: boolean } {
  const inputs: string[] = ['-i', videoPath]
  let idx = 1
  const filters: string[] = []
  const mix: string[] = []

  const music = resolved.tracks.find((t) => t.kind === 'music')
  const others = resolved.tracks.filter((t) => t.kind !== 'music')

  // Each non-music track (SFX one-shot / voiceover) is added once, delayed to
  // its global `at`, and referenced by both the ducking sidechain and the mix.
  const otherLabels: string[] = []
  for (const t of others) {
    inputs.push('-i', t.src)
    const tIdx = idx++
    const delay = Math.max(0, Math.round((t.at ?? 0) * 1000))
    const ol = `ot${tIdx}`
    filters.push(`[${tIdx}:a]adelay=${delay}|${delay},volume=${clamp01(t.volume).toFixed(3)}[${ol}]`)
    otherLabels.push(`[${ol}]`)
  }

  if (music) {
    inputs.push('-i', music.src)
    const mIdx = idx++
    filters.push(`[${mIdx}:a]volume=${clamp01(music.volume).toFixed(3)}[mus]`)
    if (otherLabels.length) {
      filters.push(`${otherLabels.join('')}amix=inputs=${otherLabels.length}[sc]`)
      filters.push(
        `[mus]sidechaincompress=threshold=0.01:ratio=8:attack=30:release=300:level_sc=1:sidechain=sc[musicduck]`,
      )
      mix.push('[musicduck]')
    } else {
      mix.push('[mus]')
    }
  }

  for (const l of otherLabels) mix.push(l)

  if (mix.length === 0) return { args: [], hasAudio: false }

  const filterComplex = [
    ...filters,
    `${mix.join('')}amix=inputs=${mix.length}:duration=first:dropout_transition=0[aout]`,
  ].join(';')

  const args = [
    '-y',
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '0:v:0',
    '-map',
    '[aout]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
  ]
  return { args, hasAudio: true }
}

function isUrlOrData(src: string): boolean {
  return URL_RE.test(src.trim())
}

function looksLikePath(src: string): boolean {
  return (
    /^[a-zA-Z]:[\\/]/.test(src) ||
    src.startsWith('/') ||
    src.startsWith('./') ||
    AUDIO_EXT.some((e) => src.toLowerCase().endsWith(e))
  )
}

function toPath(root: string, file: string): string {
  const clean = root.replace(/[\\/]+$/, '')
  return `${clean}/audio/${file}`
}

function resolveOne(src: string, opts: ResolveAudioOptions): string {
  if (!src) return src
  if (isUrlOrData(src)) return src
  if (opts.isResolved && opts.isResolved(src)) return src
  if (looksLikePath(src)) return opts.resolvePath ? opts.resolvePath(src) : src
  // Bundled preset name — let the caller map it to a concrete file/URL.
  if (opts.resolvePresetName) {
    const custom = opts.resolvePresetName(src)
    if (custom) return custom
  }
  // Fallback: resolve against assetRoot / remoteBase.
  const file = AUDIO_EXT.some((e) => src.toLowerCase().endsWith(e)) ? src : `${src}.mp3`
  if (opts.assetRoot) return toPath(opts.assetRoot, file)
  if (opts.remoteBase) return `${opts.remoteBase.replace(/\/+$/, '')}/audio/${file}`
  return src
}

/** Resolve every audio reference in a video config to concrete tracks. */
export function resolveAudio(
  config: VeloxVideoConfig,
  opts: ResolveAudioOptions = {},
): ResolvedAudio {
  const tracks: ResolvedAudioTrack[] = []

  if (config.audio?.src) {
    tracks.push({
      src: resolveOne(config.audio.src, opts),
      kind: 'voice',
      volume: config.audio.volume ?? 1,
      duck: true,
    })
  }

  const plan: VeloxAudioPlan | undefined = config.audioPlan
  if (plan) {
    if (plan.music?.src) {
      tracks.push({
        src: resolveOne(plan.music.src, opts),
        kind: 'music',
        volume: plan.music.volume ?? 1,
        duck: true,
      })
    }
    for (const cue of plan.sfx) {
      const src = cue.src ?? cue.name
      tracks.push({
        src: resolveOne(src, opts),
        kind: 'sfx',
        volume: cue.volume ?? 1,
        at: cue.at,
        duck: true,
      })
    }
  }

  // Per-scene voice/audio: align to global timeline by accumulating durations.
  let acc = 0
  for (const scene of config.scenes as SceneConfig[]) {
    if (scene.audio?.src) {
      tracks.push({
        src: resolveOne(scene.audio.src, opts),
        kind: 'voice',
        volume: scene.audio.volume ?? 1,
        at: acc + (scene.audio.startFrom ?? 0),
        duck: true,
      })
    }
    acc += scene.duration
  }

  const durationSec = config.scenes.reduce((a, s) => a + s.duration, 0)
  return { tracks, beats: plan?.beats ?? [], durationSec, hasAudio: tracks.length > 0 }
}
