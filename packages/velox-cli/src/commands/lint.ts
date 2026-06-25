import path from 'path'
import chalk from 'chalk'
import fs from 'fs-extra'
import { lintVeloxMarkup } from '@velox-video/core'

export async function lintCommand(
  inputFile: string,
  options: { frames?: boolean; strict?: boolean },
): Promise<void> {
  const abs = path.resolve(inputFile)
  const markup = await fs.readFile(abs, 'utf8')
  const result = lintVeloxMarkup(markup)

  for (const issue of result.issues) {
    const prefix = issue.level === 'error' ? chalk.red('error') : chalk.yellow('warn')
    const scene = issue.scene ? chalk.gray(` [${issue.scene}]`) : ''
    console.log(`  ${prefix} ${issue.code}${scene}: ${issue.message}`)
  }

  if (result.sceneCount !== undefined) {
    console.log(
      chalk.gray(
        `\n  ${result.sceneCount} scenes · ~${result.durationSec?.toFixed(1)}s · theme ${markup.match(/theme="([^"]+)"/)?.[1] ?? 'default'}`,
      ),
    )
  }

  if (options.frames && result.ok && result.config) {
    console.log(chalk.cyan('\n  Spot-check: run node scripts/spot-render-scenes.cjs or velox render --draft'))
  }

  const failed = !result.ok || (options.strict && result.issues.some((i) => i.level === 'warn'))
  if (failed) {
    console.log(chalk.red('\n  Lint failed.\n'))
    process.exit(1)
  }
  console.log(chalk.green('\n  Lint passed.\n'))
}
