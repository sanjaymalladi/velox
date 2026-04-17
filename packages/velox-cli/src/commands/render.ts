import path from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { loadVideoConfig } from '../utils/loadVideo'
import { nativeRender } from '../render/nativeRender'
import { getTotalFrames, resolveSize } from '@velox-video/core'

export async function renderCommand(inputFile: string, options: {
  output?: string
  format?: 'mp4' | 'gif' | 'png-sequence'
  quality?: number
}) {
  const spinner = ora()

  try {
    // 1. Load config
    spinner.start(chalk.cyan('Loading video config...'))
    const config = await loadVideoConfig(inputFile)
    const [width, height] = resolveSize(config.size)
    const totalFrames = getTotalFrames(config)
    const duration = (totalFrames / config.fps).toFixed(1)
    spinner.succeed(chalk.green(`Loaded: ${path.basename(inputFile)} — ${config.scenes.length} scenes, ${duration}s, ${width}×${height}`))

    // 2. Determine output path
    const format = options.format ?? 'mp4'
    const ext = format === 'png-sequence' ? '' : `.${format}`
    const outputPath = options.output ?? path.join(
      path.dirname(path.resolve(inputFile)),
      path.basename(inputFile, path.extname(inputFile)) + ext
    )

    // 3. Render
    let lastPct = -1
    spinner.start(chalk.cyan(`Rendering ${totalFrames} frames → ${chalk.bold(path.basename(outputPath))}`))

    await nativeRender(config, {
      outputPath,
      format,
      quality: options.quality,
      onProgress: (progress, frame, total) => {
        const pct = Math.round(progress * 100)
        if (pct !== lastPct) {
          spinner.text = chalk.cyan(`Rendering... ${chalk.bold(pct + '%')} (${frame}/${total} frames)`)
          lastPct = pct
        }
      },
    })

    const stat = require('fs').statSync(outputPath)
    const sizeMb = (stat.size / 1024 / 1024).toFixed(1)
    spinner.succeed(chalk.green(`✨ Done! → ${chalk.bold(outputPath)} ${chalk.gray(`(${sizeMb} MB)`)}`))

  } catch (err: unknown) {
    spinner.fail(chalk.red('Render failed'))
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(message))
    if (err instanceof Error && err.stack) {
      console.error(chalk.gray(err.stack.split('\n').slice(1).join('\n')))
    }
    process.exit(1)
  }
}
