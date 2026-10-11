import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs-extra'
import type { VeloxVideoConfig } from '@velox-video/core'
import { resolveAudio, buildAudioMixArgs } from '@velox-video/core'
import { resolveFfmpegPath } from './resolveFfmpeg'
import type { ResolvedAudio } from '@velox-video/core'

const execFileAsync = promisify(execFile)

/** Resolve every audio reference in `config` to a real file using CLI conventions. */
function resolveConfigAudio(
  config: VeloxVideoConfig,
  projectDir: string,
  packageDir: string,
) {
  const tryCandidates = (name: string): string | undefined => {
    const base = path.isAbsolute(name) || /^[a-zA-Z]:[\\/]/.test(name) || name.startsWith('/')
      ? [name]
      : [
          path.join(projectDir, 'sfx', `${name}.mp3`),
          path.join(projectDir, 'sfx', `${name}.wav`),
          path.join(projectDir, `${name}.mp3`),
          path.join(projectDir, 'audio', `${name}.mp3`),
          path.join(packageDir, 'assets', 'sfx', `${name}.mp3`),
          path.join(packageDir, 'assets', 'sfx', `${name}.wav`),
          path.join(packageDir, 'assets', 'audio', `${name}.mp3`),
        ]
    for (const c of base) if (fs.existsSync(c)) return c
    return undefined
  }
  return resolveAudio(config, {
    resolvePresetName: tryCandidates,
    resolvePath: (src) => path.isAbsolute(src) ? src : path.resolve(projectDir, src),
  })
}

/** Mux background music, SFX and voiceover onto a silent MP4 when ffmpeg exists. */
export async function muxAudioPlan(
  videoPath: string,
  config: VeloxVideoConfig,
  projectDir: string,
  packageDir: string,
): Promise<void> {
  const ffmpeg = await resolveFfmpegPath()
  if (!ffmpeg) {
    if (config.audioPlan?.sfx.length || config.audio?.src || config.audioPlan?.music?.src) {
      console.warn('[velox] Audio skipped — no ffmpeg available (system or bundled).')
    }
    return
  }

  const resolved = resolveConfigAudio(config, projectDir, packageDir)
  const existing = resolved.tracks.filter((t) => {
    if (/^https?:/i.test(t.src)) return true
    return fs.existsSync(t.src)
  })

  const skippedUnsupported = resolved.tracks.some((t) => /^(data:|blob:)/i.test(t.src))
  if (skippedUnsupported) {
    console.warn('[velox] Some data/blob audio sources cannot be read by the CLI ffmpeg muxer and were skipped.')
  }

  if (existing.length === 0) return

  const { args, hasAudio } = buildAudioMixArgs({ ...resolved, tracks: existing }, videoPath)
  if (!hasAudio) return

  const tmp = `${videoPath}.mux.mp4`
  try {
    await execFileAsync(ffmpeg, [...args, tmp], { timeout: 180_000 })
    await fs.move(tmp, videoPath, { overwrite: true })
    const kinds = new Set(existing.map((t) => t.kind))
    const parts: string[] = []
    if (kinds.has('music')) parts.push('music')
    if (kinds.has('sfx')) parts.push('sfx')
    if (kinds.has('voice')) parts.push('voice')
    console.log(`[velox] Muxed ${parts.join(' + ')} → ${path.basename(videoPath)}`)
  } catch (err) {
    await fs.remove(tmp).catch(() => {})
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[velox] Audio mux failed: ${msg}`)
  }
}
