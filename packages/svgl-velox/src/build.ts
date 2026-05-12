import fs from 'fs'
import path from 'path'
import { parse } from 'node-html-parser'
import { svgPathProperties } from 'svg-path-properties'

const OUT_DIR = path.resolve(__dirname, '../dist/logos')
const SVGL_API = 'https://api.github.com/repos/pheralb/svgl/contents/static/library'
const SVGL_RAW_BASE = 'https://raw.githubusercontent.com/pheralb/svgl/main/static/library'

type GithubContent = { name: string; type: string; download_url?: string }

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': '@velox-video/svgl-builder',
    },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  return await res.json() as T
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': '@velox-video/svgl-builder' } })
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  return await res.text()
}

async function listSvgFiles(): Promise<GithubContent[]> {
  const entries = await fetchJson<GithubContent[]>(SVGL_API)
  return entries.filter((entry) => entry.type === 'file' && entry.name.endsWith('.svg'))
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  }))
  return results
}

async function processSvg(file: GithubContent): Promise<string> {
  const content = await fetchText(file.download_url ?? `${SVGL_RAW_BASE}/${file.name}`)

  const root = parse(content)
  const paths = root.querySelectorAll('path')
  const rects = root.querySelectorAll('rect')
  const circles = root.querySelectorAll('circle')

  const outPaths: { d: string, fill?: string, stroke?: string, length: number }[] = []

  // Extract paths
  for (const p of paths) {
    const d = p.getAttribute('d')
    if (!d || d.trim() === '') continue
    try {
      const props = new svgPathProperties(d)
      outPaths.push({
        d,
        fill: p.getAttribute('fill') || undefined,
        stroke: p.getAttribute('stroke') || undefined,
        length: props.getTotalLength()
      })
    } catch (e) {
      console.warn(`Skipping invalid path in ${file.name}`)
    }
  }

  // Basic Rect to Path conversion
  for (const r of rects) {
    const x = parseFloat(r.getAttribute('x') || '0')
    const y = parseFloat(r.getAttribute('y') || '0')
    const w = parseFloat(r.getAttribute('width') || '0')
    const h = parseFloat(r.getAttribute('height') || '0')
    const d = `M${x},${y} L${x+w},${y} L${x+w},${y+h} L${x},${y+h} Z`
    const props = new svgPathProperties(d)
    outPaths.push({
      d,
      fill: r.getAttribute('fill') || undefined,
      stroke: r.getAttribute('stroke') || undefined,
      length: props.getTotalLength()
    })
  }

  // Basic Circle to Path conversion
  for (const c of circles) {
    const cx = parseFloat(c.getAttribute('cx') || '0')
    const cy = parseFloat(c.getAttribute('cy') || '0')
    const r = parseFloat(c.getAttribute('r') || '0')
    if (r > 0) {
      const d = `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`
      const props = new svgPathProperties(d)
      outPaths.push({
        d,
        fill: c.getAttribute('fill') || undefined,
        stroke: c.getAttribute('stroke') || undefined,
        length: props.getTotalLength()
      })
    }
  }

  const name = file.name.replace('.svg', '')
  const viewBox = root.querySelector('svg')?.getAttribute('viewBox') || '0 0 256 256'

  const payload = { name, viewBox, paths: outPaths }
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(payload))
  return name
}

async function main(): Promise<void> {
  const files = await listSvgFiles()
  const registry = await mapLimit(files, 12, processSvg)

  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(registry))
  console.log(`Processed ${files.length} SVGs from pheralb/svgl for Velox!`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
