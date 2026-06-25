import path from 'path'
import fs from 'fs-extra'
import http from 'http'
import chalk from 'chalk'
import ora from 'ora'
import { loadVideoConfig } from '../utils/loadVideo'
import { resolveSize } from '@velox-video/core'
import type { VeloxVideoConfig } from '@velox-video/core'

export async function previewCommand(inputFile: string) {
  const spinner = ora()

  try {
    const absInput = path.resolve(inputFile)
    if (!await fs.pathExists(absInput)) throw new Error(`File not found: ${absInput}`)

    spinner.start(chalk.cyan('Loading video config...'))
    let config = await loadVideoConfig(absInput)
    spinner.succeed(chalk.green(`Loaded: ${path.basename(absInput)}`))

    const { WebSocketServer } = require('ws')
    const studioDir = path.join(__dirname, 'studio')
    const enginePath = path.join(__dirname, 'preview-engine.js')
    const studioHtml = await fs.readFile(path.join(studioDir, 'index.html'), 'utf8')

    if (!await fs.pathExists(enginePath)) {
      throw new Error(
        'Preview engine bundle missing. Run `pnpm build` in velox-video to generate dist/preview-engine.js.',
      )
    }

    const clients = new Set<import('ws').WebSocket>()

    const server = http.createServer(async (req, res) => {
      const url = req.url ?? '/'

      if (url === '/velox-engine.js' || url === '/preview-engine.js') {
        res.setHeader('Content-Type', 'application/javascript')
        res.end(await fs.readFile(enginePath))
        return
      }

      res.setHeader('Content-Type', 'text/html')
      res.end(studioHtml)
    })

    const wss = new WebSocketServer({ server })

    wss.on('connection', (ws: import('ws').WebSocket) => {
      clients.add(ws)
      ws.send(JSON.stringify({ type: 'config', config: serializableConfig(config) }))

      ws.on('message', async (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'export') {
          handleExport(config, msg.format, ws)
        }
      })

      ws.on('close', () => clients.delete(ws))
    })

    const chokidar = await import('chokidar')
    const watcher = chokidar.watch(absInput, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 300 } })

    watcher.on('change', async () => {
      try {
        const newConfig = await loadVideoConfig(absInput)
        config = newConfig
        const payload = JSON.stringify({ type: 'config', config: serializableConfig(newConfig) })
        clients.forEach(c => { if (c.readyState === 1) c.send(payload) })
        console.log(chalk.green(`\n  Hot reload: ${path.basename(absInput)}`))
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        console.error(chalk.red(`\n  HMR error: ${message}`))
      }
    })

    const PORT = 3333
    server.listen(PORT, async () => {
      console.log(chalk.cyan('\n  ⚡ Velox Studio\n'))
      console.log(chalk.white(`  ➜  ${chalk.bold(`http://localhost:${PORT}`)}`))
      console.log(chalk.gray(`  ➜  Watching: ${path.basename(absInput)}`))
      console.log(chalk.gray(`\n  Shortcuts: [Space] Play  [←→] Seek  [E] Export  [Ctrl+C] Stop\n`))

      const { default: open } = await import('open')
      await open(`http://localhost:${PORT}`)
    })

    await new Promise<void>((resolve) => {
      process.on('SIGINT', () => {
        server.close()
        watcher.close()
        resolve()
      })
    })

  } catch (err: unknown) {
    spinner.fail(chalk.red('Preview failed'))
    const message = err instanceof Error ? err.message : String(err)
    console.error(chalk.red(message))
    process.exit(1)
  }
}

async function handleExport(config: VeloxVideoConfig, format: string, ws: import('ws').WebSocket): Promise<void> {
  const { nativeRender } = await import('../render/nativeRender.js')
  const outPath = path.join(process.cwd(), `output.${format === 'gif' ? 'gif' : 'mp4'}`)

  try {
    await nativeRender(config, {
      outputPath: outPath,
      format: format as 'mp4' | 'gif' | 'png-sequence',
      onProgress: (progress: number, frame: number, total: number) => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'export-progress', progress, frame, total }))
        }
      }
    })
    ws.send(JSON.stringify({ type: 'export-done', path: outPath }))
    console.log(chalk.green(`\n  ✨ Exported: ${outPath}`))
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(chalk.red(`  Export failed: ${message}`))
  }
}

function serializableConfig(config: VeloxVideoConfig): VeloxVideoConfig & { size: [number, number] } {
  const [w, h] = resolveSize(config.size)
  return JSON.parse(JSON.stringify({ ...config, size: [w, h] })) as VeloxVideoConfig & { size: [number, number] }
}
