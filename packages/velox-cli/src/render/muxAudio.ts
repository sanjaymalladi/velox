import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs-extra'
import type { SfxCue, VeloxAudioPlan } from '@velox-video/core'
import { resolveFfmpegPath } from './resolveFfmpeg'

const execFileAsync = promisify(execFile)

const BUNDLED_SFX = ['whoosh', 'click', 'pop', 'swoosh']

async function ffmpegAvailable(): Promise<string | null> {
  return resolveFfmpegPath()
}

function resolveSfxPath(cue: SfxCue, projectDir: string, packageDir: string): string | undefined {
  if (cue.src) {
    const p = path.isAbsolute(cue.src) ? cue.src : path.resolve(projectDir, cue.src)
    return p
  }
  const candidates = [
    path.join(projectDir, 'sfx', `${cue.name}.mp3`),
    path.join(projectDir, 'sfx', `${cue.name}.wav`),
    path.join(projectDir, `${cue.name}.mp3`),
    path.join(packageDir, 'assets', 'sfx', `${cue.name}.mp3`),
    path.join(packageDir, 'assets', 'sfx', `${cue.name}.wav`),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return undefined
}

/** Mux background music and timeline SFX onto a silent MP4 when ffmpeg is available. */
export async function muxAudioPlan(
  videoPath: string,
  plan: VeloxAudioPlan | undefined,
  musicSrc: string | undefined,
  musicVolume: number,
  projectDir: string,
  packageDir: string,
): Promise<void> {
  const ffmpeg = await ffmpegAvailable()
  if (!ffmpeg) {
    if (plan?.sfx.length || musicSrc) {
      console.warn('[velox] Audio skipped — no ffmpeg available (system or bundled).')
    }
    return
  }

  const musicPath = musicSrc
    ? path.isAbsolute(musicSrc)
      ? musicSrc
      : path.resolve(projectDir, musicSrc)
    : undefined

  const sfxResolved: Array<{ cue: SfxCue; file: string }> = []
  for (const cue of plan?.sfx ?? []) {
    const file = resolveSfxPath(cue, projectDir, packageDir)
    if (file && (await fs.pathExists(file))) sfxResolved.push({ cue, file })
    else if (BUNDLED_SFX.includes(cue.name)) {
      console.warn(`[velox] SFX "${cue.name}" not found — add sfx/${cue.name}.mp3 to your project.`)
    }
  }

  if (!musicPath && sfxResolved.length === 0) return
  if (musicPath && !(await fs.pathExists(musicPath))) {
    console.warn(`[velox] Music file not found: ${musicPath}`)
    if (sfxResolved.length === 0) return
  }

  const tmp = `${videoPath}.mux.mp4`
  const inputs: string[] = ['-i', videoPath]
  const filters: string[] = []
  const mixLabels: string[] = []

  let inputIndex = 1
  if (musicPath && (await fs.pathExists(musicPath))) {
    inputs.push('-i', musicPath)
    const vol = Math.max(0, Math.min(1, musicVolume))
    filters.push(`[${inputIndex}:a]volume=${vol}[music]`)
    mixLabels.push('[music]')
    inputIndex++
  }

  for (const { cue, file } of sfxResolved) {
    inputs.push('-i', file)
    const delayMs = Math.max(0, Math.round(cue.at * 1000))
    const vol = cue.volume ?? 0.85
    const label = `sfx${inputIndex}`
    filters.push(`[${inputIndex}:a]adelay=${delayMs}|${delayMs},volume=${vol}[${label}]`)
    mixLabels.push(`[${label}]`)
    inputIndex++
  }

  if (mixLabels.length === 0) return

  const filterComplex =
    filters.join(';') +
    `;${mixLabels.join('')}` +
    `amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0[aout]`

  try {
    await execFileAsync(
      ffmpeg,
      [
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
        tmp,
      ],
      { timeout: 180_000 },
    )
    await fs.move(tmp, videoPath, { overwrite: true })
    const parts = []
    if (musicPath) parts.push('music')
    if (sfxResolved.length) parts.push(`${sfxResolved.length} sfx`)
    console.log(`[velox] Muxed ${parts.join(' + ')} → ${path.basename(videoPath)}`)
  } catch (err) {
    await fs.remove(tmp).catch(() => {})
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[velox] Audio mux failed: ${msg}`)
  }
}
