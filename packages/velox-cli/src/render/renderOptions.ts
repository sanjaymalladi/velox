import type { VeloxVideoConfig } from '@velox-video/core'

export interface NativeRenderTuning {
  /** Output resolution scale 0.25–1 (default 1). */
  scale: number
  /** Skip source frames to cap encoder fps while keeping duration. */
  frameStep: number
  /** Encoder / output fps after frame skipping. */
  exportFps: number
}

export function resolveRenderTuning(
  config: VeloxVideoConfig,
  opts: { scale?: number; exportFps?: number; draft?: boolean },
): NativeRenderTuning {
  const configFps = config.fps || 30

  let scale = clamp(opts.scale ?? 1, 0.25, 1)
  let exportFps = opts.exportFps ?? configFps

  if (opts.draft) {
    scale = Math.min(scale, 0.5)
    exportFps = Math.min(exportFps, 30)
  }

  exportFps = Math.min(exportFps, configFps)
  const frameStep = exportFps >= configFps ? 1 : Math.max(1, Math.round(configFps / exportFps))
  const effectiveExportFps = Math.max(1, Math.round(configFps / frameStep))

  return { scale, frameStep, exportFps: effectiveExportFps }
}

export function scaledDimensions(width: number, height: number, scale: number): [number, number] {
  const w = Math.floor((width * scale) / 2) * 2
  const h = Math.floor((height * scale) / 2) * 2
  return [Math.max(2, w), Math.max(2, h)]
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
