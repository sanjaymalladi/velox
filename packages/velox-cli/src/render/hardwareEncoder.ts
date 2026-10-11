import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface HardwareVideoEncoder {
  name: 'h264_nvenc' | 'h264_amf' | 'h264_qsv'
  args: (quantizer: number) => string[]
}

const candidates: HardwareVideoEncoder[] = [
  {
    name: 'h264_nvenc',
    args: (quantizer) => ['-preset', 'p4', '-rc', 'vbr', '-cq', String(quantizer), '-b:v', '0'],
  },
  {
    name: 'h264_amf',
    args: (quantizer) => ['-quality', 'quality', '-rc', 'cqp', '-qp_i', String(quantizer), '-qp_p', String(quantizer)],
  },
  {
    name: 'h264_qsv',
    args: (quantizer) => ['-preset', 'medium', '-global_quality', String(quantizer)],
  },
]

const probeCache = new Map<string, Promise<HardwareVideoEncoder | null>>()

/** Return the first FFmpeg hardware H.264 encoder that can initialize on this host. */
export function resolveHardwareVideoEncoder(ffmpegPath: string): Promise<HardwareVideoEncoder | null> {
  const cached = probeCache.get(ffmpegPath)
  if (cached) return cached

  const probe = probeEncoders(ffmpegPath)
  probeCache.set(ffmpegPath, probe)
  return probe
}

async function probeEncoders(ffmpegPath: string): Promise<HardwareVideoEncoder | null> {
  let output: string
  try {
    const result = await execFileAsync(ffmpegPath, ['-hide_banner', '-encoders'], { timeout: 15_000, maxBuffer: 2 * 1024 * 1024 })
    output = result.stdout + result.stderr
  } catch {
    return null
  }

  for (const encoder of candidates) {
    if (!new RegExp(`\\b${encoder.name}\\b`).test(output)) continue
    try {
      await execFileAsync(ffmpegPath, [
        '-hide_banner', '-loglevel', 'error',
        '-f', 'lavfi', '-i', 'color=c=black:s=256x256:r=1',
        '-frames:v', '1', '-an', '-c:v', encoder.name, ...encoder.args(24),
        '-pix_fmt', 'yuv420p', '-f', 'null', '-',
      ], { timeout: 20_000, maxBuffer: 1024 * 1024 })
      return encoder
    } catch {
      // The binary can list an encoder even when the matching GPU or driver is unavailable.
    }
  }
  return null
}
