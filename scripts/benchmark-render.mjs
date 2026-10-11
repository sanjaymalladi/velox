import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')
const cli = path.join(rootDir, 'packages', 'velox-cli', 'dist', 'index.js')
const fixtureDir = path.join(rootDir, 'benchmarks', 'render')
const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'velox-render-benchmark-'))
const cases = ['static', 'motion', 'charts', 'transitions', 'depth']
const results = []

for (const name of cases) {
  const input = path.join(fixtureDir, name + '.vml')
  const output = path.join(outputDir, name + '.mp4')
  process.stdout.write('Rendering ' + name + ' benchmark... ')
  await execFileAsync(process.execPath, [
    cli, 'render', input, '--output', output, '--quality', '80', '--profile',
  ], { cwd: rootDir, maxBuffer: 4 * 1024 * 1024 })
  const profile = JSON.parse(await fs.readFile(output + '.profile.json', 'utf8'))
  results.push({ name, ...profile })
  process.stdout.write(profile.endToEndFramesPerSecond + ' fps, ' + profile.timingsMs.total + ' ms\n')
}

const summaryPath = path.join(outputDir, 'summary.json')
await fs.writeFile(summaryPath, JSON.stringify({
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  machine: { platform: process.platform, arch: process.arch, release: os.release(), cpus: os.cpus().length },
  cases: results,
}, null, 2) + '\n')
console.log('Benchmark outputs and report: ' + outputDir)
console.log('Summary: ' + summaryPath)
