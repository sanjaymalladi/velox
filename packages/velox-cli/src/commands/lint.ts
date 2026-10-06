import path from 'path'
import chalk from 'chalk'
import fs from 'fs-extra'
import { lintVeloxMarkup, lintVeloxConfig, preloadAesthetics } from '@velox-video/core'
import { loadVideoConfig } from '../utils/loadVideo'

export async function lintCommand(
  inputFile: string,
  options: { frames?: boolean; strict?: boolean },
): Promise<void> {
  const abs = path.resolve(inputFile)
  const isMarkup = abs.toLowerCase().endsWith('.vml')

  await preloadAesthetics()

  let result
  let themeId: string | undefined

  if (isMarkup) {
    const markup = await fs.readFile(abs, 'utf8')
    result = lintVeloxMarkup(markup)
    themeId = markup.match(/theme="([^"]+)"/)?.[1]
  } else {
    // TypeScript / JavaScript authoring file — load and lint the compiled config.
    try {
      const config = await loadVideoConfig(abs)
      result = lintVeloxConfig(config)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(chalk.red(`  error invalid-config: ${msg}\n`))
      process.exit(1)
    }
  }

  for (const issue of result.issues) {
    const prefix = issue.level === 'error' ? chalk.red('error') : chalk.yellow('warn')
    const scene = issue.scene ? chalk.gray(` [${issue.scene}]`) : ''
    console.log(`  ${prefix} ${issue.code}${scene}: ${issue.message}`)
  }

  if (result.sceneCount !== undefined) {
    console.log(
      chalk.gray(
        `\n  ${result.sceneCount} scenes · ~${result.durationSec?.toFixed(1)}s · theme ${themeId ?? 'default'}`,
      ),
    )
  }

  if (options.frames && result.ok && result.config) {
    console.log(chalk.cyan('\n  Spot-check: run velox render --draft'))
  }

  const failed = !result.ok || (options.strict && result.issues.some((i) => i.level === 'warn'))
  if (failed) {
    console.log(chalk.red('\n  Lint failed.\n'))
    process.exit(1)
  }
  console.log(chalk.green('\n  Lint passed.\n'))
}
