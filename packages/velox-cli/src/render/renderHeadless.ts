/**
 * Headless WebGL renderer — true all-WebGL export.
 *
 * Serves the built `@velox-video/core` ESM + a tiny capture page over
 * localhost, drives every frame with Playwright (Chromium, WebGL via
 * SwiftShader), reads each rendered PNG, encodes to MP4 with the bundled
 * `ffmpeg-static`, then muxes audio with `muxAudioPlan` (shares the
 * `buildAudioMixArgs` graph with the Node path).
 *
 * Playwright is an OPTIONAL dependency — dynamic-imported at runtime. Install
 * with: `pnpm add -D playwright && npx playwright install`.
 */
import http from 'http'
import path from 'path'
import fs from 'fs-extra'
import { createRequire } from 'module'
import type { VeloxVideoConfig } from '@velox-video/core'
import { getTotalFrames } from '@velox-video/core'
import { resolveFfmpegPath } from './resolveFfmpeg'
import { muxAudioPlan } from './muxAudio'

const require = createRequire(__dirname)

function capturePageHtml(): string {
  return `<!doctype html><html><head><meta charset="utf-8" />
<script type="importmap">
{ "imports": { "@velox-video/core": "/dist/index.mjs" } }
</script></head><body>
<script type="module">
import { drawFrame, resolveSize, preloadImages, setImageCache, WebGLComposer, getFx, fxEnabled } from '@velox-video/core'
const state = {}
window.__velox = {
  async setConfig(c) {
    const [w, h] = resolveSize(c.size)
    const cache = await preloadImages(c); setImageCache(cache)
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; document.body.appendChild(canvas)
    let composer = null
    if (fxEnabled(c)) { try { composer = new WebGLComposer(canvas); if (composer.ok) composer.setSize(w, h); else composer = null } catch { composer = null } }
    const off = document.createElement('canvas'); off.width = w; off.height = h
    Object.assign(state, { c, w, h, canvas, composer, off })
  },
  capture(frame) {
    const { c, w, h, composer, off } = state
    const octx = off.getContext('2d'); octx.clearRect(0, 0, w, h)
    if (composer && composer.ok) {
      drawFrame(octx, c, frame, w, h, { cpuFx: false })
      composer.draw(off, getFx(c), frame / (c.fps || 30))
      return composer.canvas.toDataURL('image/png')
    }
    drawFrame(octx, c, frame, w, h)
    return off.toDataURL('image/png')
  }
}
window.__veloxReady = true
</script></body></html>`
}

function startServer(
  rootDir: string,
  distDir: string,
  assetFiles: Map<string, string>,
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = (req.url ?? '/').split('?')[0]
      const asset = url.match(/^\/asset\/(asset-\d+)$/)
      if (asset) {
        const source = assetFiles.get(asset[1])
        if (!source) {
          res.writeHead(404)
          res.end('not found')
          return
        }
        fs.readFile(source).then((buf) => {
          const ext = path.extname(source).toLowerCase()
          const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream'
          res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' })
          res.end(buf)
        }).catch(() => {
          res.writeHead(404)
          res.end('not found')
        })
        return
      }
      let filePath = url === '/' ? path.join(rootDir, 'index.html') : path.join(rootDir, url)
      // Map /dist/* to the core dist directory.
      if (url.startsWith('/dist/')) filePath = path.join(distDir, url.replace('/dist/', ''))
      fs.readFile(filePath)
        .then((buf) => {
          const ext = path.extname(filePath)
          const mime = ext === '.mjs' ? 'text/javascript' : ext === '.html' ? 'text/html' : 'application/octet-stream'
          res.writeHead(200, { 'Content-Type': mime })
          res.end(buf)
        })
        .catch(() => {
          res.writeHead(404)
          res.end('not found')
        })
    })
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port
      resolve({ server, port })
    })
  })
}

function stageLocalImages(
  config: VeloxVideoConfig,
  projectDir: string,
): Map<string, string> {
  const assets = new Map<string, string>()
  let nextId = 0
  const visit = (elements: VeloxVideoConfig['scenes'][number]['elements']): void => {
    for (const el of elements) {
      if (el.type === 'group') {
        visit(el.children)
      } else if (el.type === 'image') {
        const src = el.src
        if (/^(https?:|data:|blob:|\/\/)/i.test(src)) continue
        if (!path.isAbsolute(src) && !/^[a-zA-Z]:[\\/]/.test(src) && !/[./\\]/.test(src)) continue
        const key = `asset-${nextId++}`
        assets.set(key, path.isAbsolute(src) || /^[a-zA-Z]:[\\/]/.test(src) ? src : path.resolve(projectDir, src))
        el.src = `/asset/${key}`
      }
    }
  }
  for (const scene of config.scenes) visit(scene.elements)
  return assets
}

export interface HeadlessRenderOptions {
  /** Directory for resolving relative music/assets. */
  projectDir?: string
  onProgress?: (progress: number, frame: number, total: number) => void
  chromiumArgs?: string[]
}

/** Render a VeloxVideoConfig to MP4 via headless Chromium + ffmpeg + audio mux. */
export async function renderHeadless(
  config: VeloxVideoConfig,
  outputPath: string,
  opts: HeadlessRenderOptions = {},
): Promise<void> {
  let playwright: typeof import('playwright')
  try {
    playwright = await import('playwright')
  } catch {
    throw new Error('[velox] Headless render requires Playwright: `pnpm add -D playwright && npx playwright install`.')
  }

  const corePkg = require.resolve('@velox-video/core/package.json')
  const distDir = path.join(path.dirname(corePkg), 'dist')
  if (!fs.existsSync(path.join(distDir, 'index.mjs'))) {
    throw new Error('[velox] @velox-video/core dist not built (expected dist/index.mjs). Run the core build first.')
  }

  const ffmpeg = await resolveFfmpegPath()
  if (!ffmpeg) throw new Error('[velox] ffmpeg not available for headless encode.')

  const tmp = await fs.mkdtemp(path.join(require('os').tmpdir(), 'velox-headless-'))
  const framesDir = path.join(tmp, 'frames')
  await fs.ensureDir(framesDir)
  await fs.writeFile(path.join(tmp, 'index.html'), capturePageHtml())
  const renderConfig = JSON.parse(JSON.stringify(config)) as VeloxVideoConfig
  const assetFiles = stageLocalImages(renderConfig, opts.projectDir ?? process.cwd())

  let server: http.Server | undefined
  let browser: { close(): Promise<void> } | undefined
  try {
    const srv = await startServer(tmp, distDir, assetFiles)
    server = srv.server
    const { chromium } = playwright
    const b = await chromium.launch({ headless: true, args: opts.chromiumArgs ?? ['--use-gl=swiftshader', '--no-sandbox'] })
    browser = b

    const page = await b.newPage()
    await page.goto(`http://localhost:${srv.port}/`, { waitUntil: 'load' })
    await page.evaluate(() => new Promise<void>((r) => {
      const check = () => (window as unknown as { __veloxReady?: boolean }).__veloxReady ? r() : setTimeout(check, 50)
      check()
    }))
    await page.evaluate((c) => (window as unknown as { __velox: { setConfig(c: unknown): Promise<void> } }).__velox.setConfig(c), renderConfig)

    const totalFrames = getTotalFrames(config)
    const fps = config.fps
    for (let frame = 0; frame < totalFrames; frame++) {
      const dataUrl = (await page.evaluate(
        (f) => (window as unknown as { __velox: { capture(f: number): string } }).__velox.capture(f),
        frame,
      )) as string
      const b64 = dataUrl.split(',')[1] ?? ''
      await fs.writeFile(path.join(framesDir, `frame_${String(frame).padStart(5, '0')}.png`), Buffer.from(b64, 'base64'))
      opts.onProgress?.(frame / totalFrames, frame, totalFrames)
    }
    await page.close()

    // Encode image sequence -> MP4 (silent).
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)
    await execFileAsync(ffmpeg, [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(framesDir, 'frame_%05d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '20',
      '-r', String(fps),
      outputPath,
    ], { timeout: 600_000 })

    // Mux audio (reuses resolveAudio + buildAudioMixArgs).
    const packageDir = path.join(__dirname, '..')
    await muxAudioPlan(outputPath, config, opts.projectDir ?? path.dirname(outputPath), packageDir)
    opts.onProgress?.(1, totalFrames, totalFrames)
  } finally {
    await browser?.close().catch(() => {})
    if (server) await new Promise<void>((r) => server!.close(() => r()))
    await fs.remove(tmp).catch(() => {})
  }
}
