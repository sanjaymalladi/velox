#!/usr/bin/env tsx
/** Render all 9 matrix reels from reels/matrix/manifest.json */
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const ROOT = path.join(__dirname, '..')
const MANIFEST = path.join(ROOT, 'reels', 'matrix', 'manifest.json')
const CLI = path.join(ROOT, 'packages', 'velox-cli', 'dist', 'index.js')

interface Entry {
  vml: string
  mp4: string
  topic: string
  theme: string
}

function renderOne(vml: string, mp4: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const relVml = path.relative(ROOT, vml)
    const relMp4 = path.relative(ROOT, mp4)
    console.log(`\n▶ Rendering ${relVml} → ${relMp4}`)
    const child = spawn(process.execPath, [CLI, 'render', relVml, '-o', relMp4, '--scale', '1', '-q', '80'], {
      cwd: ROOT,
      stdio: 'inherit',
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`render failed (${code}): ${relVml}`))
    })
  })
}

async function main(): Promise<void> {
  if (!fs.existsSync(MANIFEST)) {
    console.error('Run: pnpm generate:reels first')
    process.exit(1)
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Entry[]
  const start = Date.now()
  for (const entry of manifest) {
    await renderOne(entry.vml, entry.mp4)
  }
  const min = ((Date.now() - start) / 60000).toFixed(1)
  console.log(`\n✅ All ${manifest.length} reels rendered in ${min} min`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
