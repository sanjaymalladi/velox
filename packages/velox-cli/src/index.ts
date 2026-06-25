import { program } from 'commander'
import chalk from 'chalk'
import { renderCommand } from './commands/render'
import { previewCommand } from './commands/preview'
import { newCommand } from './commands/new'
import { lintCommand } from './commands/lint'
import { addCommand, listBlocksCommand } from './commands/add'
import { aestheticIds } from '@velox-video/core'

const { version: VERSION } = require('../package.json') as { version: string }

console.log(chalk.bold.hex('#6C63FF')('\n  ⚡ velox') + chalk.gray(` v${VERSION}\n`))

program
  .name('velox')
  .description('LLM-first motion graphics — write code, ship cinematic video')
  .version(VERSION)

// ── velox new <name> ────────────────────────────────────────────────────────
program
  .command('new <name>')
  .description('Scaffold a new Velox video project')
  .option('-t, --template <template>', 'starter template: news-intro | product-launch | data-story', 'news-intro')
  .action((name: string, opts) => newCommand(name, opts))

// ── velox preview <file> ────────────────────────────────────────────────────
program
  .command('preview <file>')
  .description('Live preview in Velox Studio (hot reload)')
  .action((file: string) => previewCommand(file))

// ── velox render <file> ─────────────────────────────────────────────────────
program
  .command('render <file>')
  .description('Render video to file')
  .option('-o, --output <path>', 'output file path')
  .option('-f, --format <format>', 'output format: mp4 | gif | png-sequence', 'mp4')
  .option('-q, --quality <number>', 'quality 0-100 (higher is better)', '80')
  .option('--draft', 'fast preview export: 50% resolution, max 30fps')
  .option('--scale <number>', 'output resolution scale 0.25–1 (e.g. 0.5 for half res)')
  .option('--fps <number>', 'cap export fps (skips frames, keeps duration)')
  .action((file: string, opts) => renderCommand(file, {
    output: opts.output,
    format: opts.format,
    quality: opts.quality !== undefined ? parseInt(opts.quality, 10) : undefined,
    draft: Boolean(opts.draft),
    scale: opts.scale !== undefined ? parseFloat(opts.scale) : undefined,
    fps: opts.fps !== undefined ? parseInt(opts.fps, 10) : undefined,
  }))

// ── velox lint <file> ───────────────────────────────────────────────────────
program
  .command('lint <file>')
  .description('Validate VML markup before rendering')
  .option('--frames', 'hint spot-frame check after lint')
  .option('--strict', 'treat warnings as errors')
  .action((file: string, opts) => lintCommand(file, opts))

// ── velox add <block> ───────────────────────────────────────────────────────
program
  .command('add <block>')
  .description('Install a catalog block snippet into ./blocks')
  .option('-d, --dir <path>', 'output directory', 'blocks')
  .action((block: string, opts) => addCommand(block, opts))

// ── velox list ──────────────────────────────────────────────────────────────
program
  .command('list <type>')
  .description('List available animations, themes, or templates')
  .action((type: string) => {
    if (type === 'animations') {
      console.log(chalk.cyan('\n  Entrance animations:'))
      const entrance = ['fadeIn', 'slideUp', 'slideDown', 'slideLeft', 'slideRight',
        'zoomIn', 'zoomInBlur', 'flipIn', 'typewriter', 'expandX',
        'growUp', 'spring', 'bounceIn', 'glitchIn', 'revealLeft']
      entrance.forEach(a => console.log(chalk.white(`    • ${a}`)))

      console.log(chalk.cyan('\n  Exit animations:'))
      const exit = ['fadeOut', 'slideUpOut', 'slideDownOut', 'slideLeftOut', 'slideRightOut',
        'zoomOut', 'zoomOutBlur', 'flipOut', 'shrinkX', 'glitchOut']
      exit.forEach(a => console.log(chalk.white(`    • ${a}`)))

      console.log(chalk.cyan('\n  Loop animations:'))
      const loop = ['pulse', 'float', 'rotate', 'shimmer', 'glow', 'shake']
      loop.forEach(a => console.log(chalk.white(`    • ${a}`)))

    } else if (type === 'themes') {
      console.log(chalk.cyan('\n  Built-in aesthetics (use theme="…" in <video>):'))
      aestheticIds.forEach((t) => console.log(chalk.white(`    • ${t}`)))

    } else if (type === 'blocks') {
      listBlocksCommand().catch((err) => {
        console.error(err)
        process.exit(1)
      })

    } else if (type === 'templates') {
      console.log(chalk.cyan('\n  Starter templates:'))
      ;['news-intro', 'product-launch', 'data-story'].forEach(t =>
        console.log(chalk.white(`    • ${t}`))
      )
    } else {
      console.log(chalk.red(`Unknown type "${type}". Try: animations, themes, templates, blocks`))
    }
    console.log()
  })

program.parse()
