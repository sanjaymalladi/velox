import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { createRequire } from 'module'
import fs from 'fs-extra'

const execFileAsync = promisify(execFile)
const requireLocal = createRequire(path.join(__dirname, 'resolveFfmpeg.js'))

let cachedPath: string | null | undefined

/** System ffmpeg, else bundled ffmpeg-static when installed. */
export async function resolveFfmpegPath(): Promise<string | null> {
  if (cachedPath !== undefined) return cachedPath

  try {
    await execFileAsync('ffmpeg', ['-version'])
    cachedPath = 'ffmpeg'
    return cachedPath
  } catch {
    // fall through
  }

  try {
    const bundled = requireLocal('ffmpeg-static') as string | undefined
    if (bundled && (await fs.pathExists(bundled))) {
      cachedPath = bundled
      return cachedPath
    }
  } catch {
    // optional dependency
  }

  cachedPath = null
  return null
}
