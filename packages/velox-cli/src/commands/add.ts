import path from 'path'
import chalk from 'chalk'
import fs from 'fs-extra'

interface CatalogEntry {
  id: string
  title: string
  description: string
  file: string
  tags: string[]
}

const MANIFEST = path.join(__dirname, '..', 'catalog', 'manifest.json')

export async function addCommand(blockId: string, options: { dir?: string }): Promise<void> {
  if (!(await fs.pathExists(MANIFEST))) {
    console.error(chalk.red('Catalog manifest missing — reinstall velox-video.'))
    process.exit(1)
  }
  const catalog = JSON.parse(await fs.readFile(MANIFEST, 'utf8')) as CatalogEntry[]
  const entry = catalog.find((b) => b.id === blockId)
  if (!entry) {
    console.log(chalk.red(`Unknown block "${blockId}".\n`))
    console.log(chalk.cyan('Available blocks:'))
    for (const b of catalog) console.log(chalk.white(`  • ${b.id}`) + chalk.gray(` — ${b.title}`))
    console.log()
    process.exit(1)
  }

  const src = path.join(__dirname, '..', 'catalog', 'blocks', entry.file)
  const outDir = path.resolve(options.dir ?? path.join(process.cwd(), 'blocks'))
  await fs.ensureDir(outDir)
  const dest = path.join(outDir, entry.file)
  await fs.copy(src, dest, { overwrite: true })

  const readme = path.join(outDir, 'README.md')
  const line = `- **${entry.id}** — ${entry.description} (\`${entry.file}\`)\n`
  if (await fs.pathExists(readme)) {
    const body = await fs.readFile(readme, 'utf8')
    if (!body.includes(entry.id)) await fs.appendFile(readme, line)
  } else {
    await fs.writeFile(readme, `# Velox blocks\n\n${line}`)
  }

  console.log(chalk.green(`\n  Added ${chalk.bold(entry.id)} → ${dest}\n`))
  console.log(chalk.gray('  Paste the scene snippet into your .vml reel.\n'))
}

export async function listBlocksCommand(): Promise<void> {
  const catalog = JSON.parse(await fs.readFile(MANIFEST, 'utf8')) as CatalogEntry[]
  console.log(chalk.cyan('\n  Catalog blocks:\n'))
  for (const b of catalog) {
    console.log(`  ${chalk.white(b.id)} ${chalk.gray('—')} ${b.title}`)
    console.log(chalk.gray(`    ${b.description}`))
    console.log(chalk.gray(`    tags: ${b.tags.join(', ')}\n`))
  }
  console.log(chalk.gray('  Install: velox add <block-id>\n'))
}
