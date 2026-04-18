import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'

const TEMPLATES: Record<string, string> = {
  'news-intro': `import { createVideo, scene, text, shape } from '@velox-video/core'

export default createVideo({
  size: '1080p',
  fps: 30,
  background: '#06060f',
  font: 'Inter',

  scenes: [
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
      ),
  ],
})
`,

  'product-launch': `import { createVideo, scene, text, shape } from '@velox-video/core'

export default createVideo({
  size: '1080p',
  fps: 30,
  background: '#ffffff',

  scenes: [
    scene(8)
      .background(shape.gradient('135deg', '#667eea', '#764ba2'))
      .add(
        text('Introducing')
          .center({ offsetY: -80 })
          .size(20).color('rgba(255,255,255,0.7)').letterSpacing(6).uppercase()
          .in('fadeIn', 0.4),

        text('Product Name')
          .center()
          .size(88).weight(900).color('#ffffff')
          .in('slideUp', 0.6, { delay: 0.2 }),
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
    scene(8)
      .background('#0b1120')
      .add(
        text('Adoption by Industry')
          .center({ offsetY: -200 }).size(40).weight(700).color('#ffffff')
          .in('slideDown', 0.4),

        shape.barChart({
          data: [
            { label: 'Tech',       value: 94, color: '#6C63FF' },
            { label: 'Finance',    value: 78, color: '#06b6d4' },
            { label: 'Healthcare', value: 61, color: '#10b981' },
          ],
          showLabels: true,
          showValues: true,
        })
          .center({ offsetY: 50 }).size(800, 300)
          .in('growUp', 0.8, { delay: 0.4 }),
      ),
  ],
})
`,
  
  'kinetic-text': `import { createVideo, scene, text, shape } from '@velox-video/core'

export default createVideo({
  size: '1080p',
  fps: 30,
  background: '#030303',
  font: 'Inter',

  scenes: [
    scene(5)
      .add(
        text('KINETIC')
          .center({ offsetY: -40 }).size(110).weight(900).color('#ffffff')
          .in('slideRight', 0.5),
        text('TYPOGRAPHY')
          .center({ offsetY: 60 }).size(110).weight(900).color('#7c3aed')
          .in('slideLeft', 0.5, { delay: 0.2 }),
      ),
  ],
})
`,

  'particle-system': `import { createVideo, scene, shape } from '@velox-video/core'

export default createVideo({
  size: '1080p',
  fps: 30,
  background: '#000000',

  scenes: [
    scene(10)
      .add(
        shape.particles(100, {
          color: '#00ffcc',
          speed: 1.2
        }).opacity(0.8),
      ),
  ],
})
`
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
