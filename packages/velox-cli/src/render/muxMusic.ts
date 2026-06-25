import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs-extra'

const execFileAsync = promisify(execFile)

/** Mux background music onto a silent MP4 when ffmpeg is available. */
export async function muxMusicIfPresent(
  videoPath: string,
  musicSrc: string | undefined,
  volume = 0.35,
  projectDir: string,
): Promise<void> {
  if (!musicSrc) return

  const musicPath = path.isAbsolute(musicSrc) ? musicSrc : path.resolve(projectDir, musicSrc)
  if (!(await fs.pathExists(musicPath))) {
    console.warn(`[velox] Music file not found: ${musicPath} — export stays silent.`)
    return
  }

  try {
    await execFileAsync('ffmpeg', ['-version'])
  } catch {
    console.warn('[velox] ffmpeg not found — add music with: ffmpeg -i video.mp4 -i track.mp3 -c:v copy -map 0:v -map 1:a -shortest out.mp4')
    return
  }

  const tmp = `${videoPath}.mux.mp4`
  const vol = Math.max(0, Math.min(1, volume))
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', videoPath,
      '-i', musicPath,
      '-filter_complex', `[1:a]volume=${vol}[a]`,
      '-map', '0:v:0',
      '-map', '[a]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      tmp,
    ], { timeout: 120_000 })
    await fs.move(tmp, videoPath, { overwrite: true })
    console.log(`[velox] Muxed music → ${path.basename(videoPath)}`)
  } catch (err) {
    await fs.remove(tmp).catch(() => {})
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[velox] Music mux failed: ${msg}`)
  }
}
