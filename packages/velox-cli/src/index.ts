import { program } from 'commander'
import chalk from 'chalk'
import { renderCommand } from './commands/render'
import { previewCommand } from './commands/preview'
import { newCommand } from './commands/new'

const VERSION = '2.0.0'

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
  .option('-f, --format <format>', 'output format: mp4 | webm | gif', 'mp4')
  .option('-q, --quality <number>', 'quality 0-100', '80')
  .action((file: string, opts) => renderCommand(file, {
    output: opts.output,
    format: opts.format,
    quality: parseInt(opts.quality, 10),
  }))

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
      const themes = ['darkNeon', 'corporate', 'warmCinema', 'brutalist', 'pastel']
      console.log(chalk.cyan('\n  Built-in themes:'))
      themes.forEach(t => console.log(chalk.white(`    • ${t}`)))

    } else if (type === 'templates') {
      console.log(chalk.cyan('\n  Starter templates:'))
      ;['news-intro', 'product-launch', 'data-story'].forEach(t =>
        console.log(chalk.white(`    • ${t}`))
      )
    } else {
      console.log(chalk.red(`Unknown type "${type}". Try: animations, themes, templates`))
    }
    console.log()
  })

program.parse()
