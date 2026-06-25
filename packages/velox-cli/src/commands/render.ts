import path from 'path'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import { loadVideoConfig } from '../utils/loadVideo'
import { nativeRender } from '../render/nativeRender'
import { getTotalFrames, resolveSize } from '@velox-video/core'
import { RenderProgress } from '../render/progress'
import { resolveRenderTuning, scaledDimensions } from '../render/renderOptions'

export async function renderCommand(inputFile: string, options: {
  output?: string
  format?: 'mp4' | 'gif' | 'png-sequence' | string
  quality?: number
  scale?: number
  fps?: number
  draft?: boolean
}) {
  const spinner = ora()
  let preloadSpinner: ReturnType<typeof ora> | undefined

  try {
    spinner.start(chalk.cyan('Loading video config...'))
    const config = await loadVideoConfig(inputFile)
    const [width, height] = resolveSize(config.size)
    const totalFrames = getTotalFrames(config)
    const duration = (totalFrames / config.fps).toFixed(1)
    const tuning = resolveRenderTuning(config, {
      scale: options.scale,
      exportFps: options.fps,
      draft: options.draft,
    })
    const [renderW, renderH] = scaledDimensions(width, height, tuning.scale)
    const renderTotal = Math.ceil(totalFrames / tuning.frameStep)

    const tuningNote =
      tuning.scale < 1 || tuning.frameStep > 1
        ? chalk.gray(
            ` · export ${renderW}×${renderH} @ ${tuning.exportFps}fps (${renderTotal} frames)`,
          )
        : ''
    spinner.succeed(
      chalk.green(
        `Loaded: ${path.basename(inputFile)} — ${config.scenes.length} scenes, ${duration}s, ${width}×${height}${tuningNote}`,
      ),
    )

    const format = options.format ?? 'mp4'
    const validFormats = new Set(['mp4', 'gif', 'png-sequence'])
    if (!validFormats.has(format)) {
      throw new Error(`Unsupported format "${format}". Use one of: mp4, gif, png-sequence.`)
    }
    const normalizedQuality = Number.isFinite(options.quality)
      ? Math.min(100, Math.max(0, options.quality as number))
      : options.draft
        ? 72
        : undefined
    const ext = format === 'png-sequence' ? '' : `.${format}`
    const outputPath = options.output ?? path.join(
      path.dirname(path.resolve(inputFile)),
      path.basename(inputFile, path.extname(inputFile)) + ext,
    )

    const progress = new RenderProgress(totalFrames, path.basename(outputPath), tuning.frameStep)
    if (options.draft) {
      console.log(chalk.yellow('  Draft mode: 50% resolution, max 30fps export\n'))
    }
    console.log(chalk.cyan(`  Rendering ${renderTotal} frames → ${chalk.bold(outputPath)}`))

    preloadSpinner = ora({ text: chalk.cyan('Loading assets...'), stream: process.stdout }).start()
    await nativeRender(config, {
      outputPath,
      sourceDir: path.dirname(path.resolve(inputFile)),
      format: format as 'mp4' | 'gif' | 'png-sequence',
      quality: normalizedQuality,
      scale: tuning.scale,
      exportFps: tuning.exportFps,
      draft: options.draft,
      onPhase: (phase) => {
        if (phase === 'render') {
          preloadSpinner?.stop()
          preloadSpinner?.clear()
          progress.begin()
        }
      },
      onProgress: (_progress, sourceFrame, _total, rendered) => {
        progress.update(rendered, sourceFrame)
      },
    })

    const stat = await fs.stat(outputPath)
    const sizeMb = (stat.size / 1024 / 1024).toFixed(1)
    progress.done(outputPath, sizeMb)

  } catch (err: unknown) {
    preloadSpinner?.stop()
    spinner.fail(chalk.red('Render failed'))
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(message))
    if (err instanceof Error && err.stack) {
      console.error(chalk.gray(err.stack.split('\n').slice(1).join('\n')))
    }
    process.exit(1)
  }
}
