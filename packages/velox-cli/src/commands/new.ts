import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'

const TEMPLATES: Record<string, string> = {
  'news-intro': `import { createVideo, scene, text, image, shape } from '@velox-video/core'

export default createVideo({
  size: '1080p',
  fps: 30,
  background: '#06060f',
  font: 'Inter',

  scenes: [
    // ── Cinematic Opener (4s) ─────────────────────────────────────
    scene(4)
      .background(shape.gradient('160deg', '#0f0c29', '#302b63', '#24243e'))
      .add(
        shape.particles(50).color('#a78bfa').opacity(0.2).speed(0.4),

        text('BREAKING NEWS')
          .center({ offsetY: -60 })
          .size(18).weight(700).color('#ef4444').letterSpacing(8).uppercase()
          .in('fadeIn', 0.3),

        text('AI Changes Everything')
          .center()
          .size(72).weight(800).gradient('#ffffff', '#a78bfa')
          .in('slideUp', 0.6, { delay: 0.2 }),

        text('The future is already here — and it is extraordinary.')
          .center({ offsetY: 80 })
          .size(22).color('rgba(255,255,255,0.55)')
          .in('fadeIn', 0.5, { delay: 0.5 }),

        shape.line(360)
          .center({ offsetY: 48 }).color('#6C63FF').thickness(2).opacity(0.7)
          .in('expandX', 0.6, { delay: 0.3 }),
      ),

    // ── Content + Key Points (7s) ──────────────────────────────────
    scene(7)
      .transition('crossDissolve', 0.5)
      .background('#0a0a14')
      .add(
        text('What You Need to Know')
          .pos(80, 70).size(42).weight(700).color('#ffffff')
          .in('slideRight', 0.45),

        text.list([
          '🚀 GPT-5 surpasses human experts on every benchmark',
          '🌍 Over 2 billion people now use AI daily',
          '💡 Open-source models reached GPT-4 level performance',
        ])
          .pos(80, 160)
          .size(28).color('#cbd5e1').gap(22)
          .stagger('slideUp', 0.28),

        shape.rect(6, 280)
          .pos(60, 155).color('#6C63FF').radius(3).opacity(0.8)
          .in('growUp', 0.4, { delay: 0.2 }),
      ),

    // ── Outro (3s) ────────────────────────────────────────────────
    scene(3)
      .transition('crossDissolve', 0.4)
      .background(shape.gradient('160deg', '#06060f', '#1a0533'))
      .add(
        text('Stay Informed')
          .center({ offsetY: -20 })
          .size(52).weight(800).gradient('#ffffff', '#a78bfa')
          .in('zoomIn', 0.5),

        text('velox.news')
          .center({ offsetY: 40 })
          .size(20).color('#6C63FF').letterSpacing(4)
          .in('fadeIn', 0.4, { delay: 0.3 }),
      ),
  ],
})
`,

  'product-launch': `import { createVideo, scene, text, image, shape } from '@velox-video/core'

export default createVideo({
  size: '1080p',
  fps: 30,
  background: '#ffffff',
  font: 'Inter',

  scenes: [
    // ── Hero (5s) ─────────────────────────────────────────────────
    scene(5)
      .background(shape.gradient('135deg', '#667eea', '#764ba2'))
      .add(
        shape.particles(40).color('#ffffff').opacity(0.12),

        text('Introducing')
          .center({ offsetY: -80 })
          .size(20).weight(500).color('rgba(255,255,255,0.7)').letterSpacing(6).uppercase()
          .in('fadeIn', 0.4),

        text('Product Name')
          .center()
          .size(88).weight(900).color('#ffffff')
          .in('slideUp', 0.6, { delay: 0.2 }),

        text('The tool that changes how you work forever.')
          .center({ offsetY: 80 })
          .size(24).color('rgba(255,255,255,0.75)')
          .in('fadeIn', 0.5, { delay: 0.5 }),
      ),

    // ── Features (8s) ─────────────────────────────────────────────
    scene(8)
      .transition('slide', 0.5, { direction: 'left' })
      .background('#fafafa')
      .add(
        text('Why Product Name?')
          .pos(80, 70).size(44).weight(800).color('#1a1a2e')
          .in('slideRight', 0.45),

        text.list([
          '⚡ 10x faster than the competition',
          '🎯 99.9% accuracy on every task',
          '🔒 Enterprise-grade security built-in',
          '🌐 Works everywhere, always',
        ])
          .pos(80, 170)
          .size(26).color('#374151').gap(24)
          .stagger('slideUp', 0.22),
      ),

    // ── CTA (4s) ──────────────────────────────────────────────────
    scene(4)
      .transition('crossDissolve', 0.5)
      .background(shape.gradient('135deg', '#667eea', '#764ba2'))
      .add(
        text('Start Free Today')
          .center({ offsetY: -20 })
          .size(64).weight(900).color('#ffffff')
          .in('spring', 0.6),

        text('product.com — No credit card required')
          .center({ offsetY: 50 })
          .size(20).color('rgba(255,255,255,0.75)')
          .in('fadeIn', 0.4, { delay: 0.3 }),
      ),
  ],
})
`,

  'data-story': `import { createVideo, scene, text, shape } from '@velox-video/core'

export default createVideo({
  size: '1080p',
  fps: 30,
  background: '#0b1120',
  font: 'Inter',

  scenes: [
    // ── Title (4s) ────────────────────────────────────────────────
    scene(4)
      .background(shape.gradient('160deg', '#0b1120', '#1a1f3d'))
      .add(
        text('The Data')
          .center({ offsetY: -30 }).size(20).color('#64748b').letterSpacing(8).uppercase()
          .in('fadeIn', 0.4),
        text('2024 AI Report')
          .center({ offsetY: 20 }).size(80).weight(800).gradient('#60a5fa', '#a78bfa')
          .in('slideUp', 0.6, { delay: 0.2 }),
      ),

    // ── Bar Chart (8s) ────────────────────────────────────────────
    scene(8)
      .transition('crossDissolve', 0.4)
      .background('#0b1120')
      .add(
        text('Adoption by Industry')
          .pos(80, 60).size(40).weight(700).color('#ffffff')
          .in('slideRight', 0.4),

        text('% of companies using AI in production')
          .pos(80, 115).size(20).color('#64748b')
          .in('fadeIn', 0.4, { delay: 0.2 }),

        shape.barChart({
          data: [
            { label: 'Tech',       value: 94, color: '#6C63FF' },
            { label: 'Finance',    value: 78, color: '#06b6d4' },
            { label: 'Healthcare', value: 61, color: '#10b981' },
            { label: 'Retail',     value: 53, color: '#f59e0b' },
            { label: 'Education',  value: 42, color: '#f43f5e' },
          ],
        })
          .pos(80, 160).size(760, 380)
          .in('growUp', 0.8, { delay: 0.4 }),
      ),

    // ── Key Stat (5s) ─────────────────────────────────────────────
    scene(5)
      .transition('crossDissolve', 0.4)
      .background(shape.gradient('135deg', '#0b1120', '#1e1b4b'))
      .add(
        text('$15.7 Trillion')
          .center({ offsetY: -20 })
          .size(96).weight(900).gradient('#60a5fa', '#a78bfa')
          .in('spring', 0.7),

        text('Projected AI economic impact by 2030')
          .center({ offsetY: 70 })
          .size(24).color('#94a3b8')
          .in('fadeIn', 0.5, { delay: 0.4 }),

        shape.line(600)
          .center({ offsetY: 30 }).color('#6C63FF').opacity(0.3)
          .in('expandX', 0.6, { delay: 0.2 }),
      ),
  ],
})
`,
}

export async function newCommand(name: string, options: { template?: string }) {
  const template = options.template ?? 'news-intro'
  const targetDir = path.resolve(name)

  if (await fs.pathExists(targetDir)) {
    console.error(chalk.red(`Directory "${name}" already exists.`))
    process.exit(1)
  }

  await fs.mkdirp(targetDir)

  const templateContent = TEMPLATES[template] ?? TEMPLATES['news-intro']
  await fs.writeFile(path.join(targetDir, 'video.ts'), templateContent)

  // Write a minimal package.json for the project
  await fs.writeJson(path.join(targetDir, 'package.json'), {
    name,
    version: '1.0.0',
    private: true,
    scripts: {
      preview: 'velox preview video.ts',
      render: 'velox render video.ts',
    },
    dependencies: {
      '@velox-video/core': '^1.0.0',
    },
  }, { spaces: 2 })

  await fs.writeFile(path.join(targetDir, 'README.md'), `# ${name}

A Velox video project.

## Commands

\`\`\`bash
# Live preview in browser
velox preview video.ts

# Render to MP4
velox render video.ts --output output.mp4
\`\`\`

## Edit \`video.ts\`

All you need to know:
- Time is in **seconds** — never frames
- \`in(animation, duration)\` for entrance
- \`out(animation, duration, { at: startTime })\` for exit
- \`loop(animation)\` for continuous animation
`)

  console.log(chalk.green(`\n✨ Created project: ${chalk.bold(name)}/`))
  console.log(chalk.cyan(`\n   Template: ${chalk.bold(template)}`))
  console.log(chalk.gray(`\n   cd ${name}`))
  console.log(chalk.gray(`   velox preview video.ts\n`))
}
