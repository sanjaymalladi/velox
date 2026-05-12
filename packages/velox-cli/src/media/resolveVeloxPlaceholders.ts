import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import type { ElementConfig, ImageElementConfig, VeloxVideoConfig } from '@velox-video/core'
import { decodeVeloxCardRef, validateVeloxVideoConfig } from '@velox-video/core'
import { svgBrandCard, svgGithubRepoCard, svgNpmPackageCard, svgWebsitePlaceholder } from './svgCards'

async function cachePath(rootDir: string, key: string, ext: string): Promise<string> {
  const dir = path.join(rootDir, '.velox', 'cache', 'media')
  await fs.mkdir(dir, { recursive: true })
  const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 24)
  return path.join(dir, `${hash}.${ext}`)
}

async function fetchWikipediaThumb(query: string): Promise<Buffer | undefined> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&pilicense=any&` +
    `titles=${encodeURIComponent(query.replace(/ /g, '_'))}&pithumbsize=1200`

  const res = await fetch(url, { headers: { 'user-agent': 'velox-video-cli/2.0 (reel render)' } })
  if (!res.ok) return undefined
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { thumbnail?: { source?: string } }> }
  }
  const pages = data.query?.pages
  if (!pages) return undefined
  const first = Object.values(pages)[0]
  const src = first?.thumbnail?.source
  if (!src) return undefined
  const img = await fetch(src, { headers: { 'user-agent': 'velox-video-cli/2.0' } })
  if (!img.ok) return undefined
  return Buffer.from(await img.arrayBuffer())
}

async function patchElement(el: ElementConfig, rootDir: string, log: string[]): Promise<void> {
  if (el.type === 'image') {
    const ie = el as ImageElementConfig
    const src = ie.src

    if (src.startsWith('velox-stock:')) {
      const rest = src.slice('velox-stock:'.length)
      const colon = rest.indexOf(':')
      const provider = colon === -1 ? '' : rest.slice(0, colon)
      const encoded = rest.slice(colon + 1)
      let query = encoded
      try {
        query = decodeURIComponent(encoded)
      } catch {
        /* noop */
      }
      try {
        if (provider === 'local') {
          const abs = path.isAbsolute(query) ? query : path.resolve(rootDir, query)
          if (await fs.pathExists(abs)) {
            ie.src = abs
            log.push(`[velox] stock local → ${abs}`)
          }
        } else if (provider === 'wikipedia') {
          const buf = await fetchWikipediaThumb(query)
          if (buf?.length) {
            const outfile = await cachePath(rootDir, `wiki:${query}`, 'png')
            await fs.writeFile(outfile, buf)
            ie.src = path.resolve(outfile)
            log.push(`[velox] Wikipedia thumbnail cached for "${query}"`)
          }
        } else if (provider === 'unsplashSource') {
          const target = `https://source.unsplash.com/1200x1200/?${encodeURIComponent(query)}`
          const img = await fetch(target, { redirect: 'follow', headers: { 'user-agent': 'velox-video-cli/2.0' } })
          if (img.ok) {
            const buf = Buffer.from(await img.arrayBuffer())
            const outfile = await cachePath(rootDir, `usrc:${query}`, 'jpg')
            await fs.writeFile(outfile, buf)
            ie.src = path.resolve(outfile)
            log.push(`[velox] Cached Unsplash-source image`)
          }
        }
      } catch {
        log.push(`[velox] stock "${provider}" failed — renderer will use placeholders.`)
      }
    }

    const card = decodeVeloxCardRef(src)
    if (card) {
      try {
        let svg = ''
        if (card.kind === 'github') {
          const [owner, repo] = card.payload.split('/')
          if (owner && repo) svg = svgGithubRepoCard(owner, repo)
        } else if (card.kind === 'npm') {
          svg = svgNpmPackageCard(card.payload)
        } else if (card.kind === 'brand') {
          const [provider, ...rest] = card.payload.split(':')
          const nm = rest.join(':') || card.payload
          svg = svgBrandCard(nm, provider || 'openbrand')
        }
        if (svg) {
          const outfile = await cachePath(rootDir, `card:${card.kind}:${card.payload}`, 'svg')
          await fs.writeFile(outfile, svg, 'utf8')
          ie.src = path.resolve(outfile)
          log.push(`[velox] Generated ${card.kind} SVG card`)
        }
      } catch {
        log.push(`[velox] Card generation failed (${card.kind}).`)
      }
    }

    if (src.startsWith('velox-web:')) {
      const inner = src.slice('velox-web:'.length)
      const colon = inner.indexOf(':')
      const device = colon === -1 ? 'laptop' : inner.slice(0, colon)
      const url = decodeURIComponent(inner.slice(colon + 1))
      const svg = svgWebsitePlaceholder(device, url)
      const outfile = await cachePath(rootDir, `web:${device}:${url}`, 'svg')
      await fs.writeFile(outfile, svg, 'utf8')
      ie.src = path.resolve(outfile)
      log.push(`[velox] Website capture placeholder (${device})`)
    }
  }
  if (el.type === 'group') {
    for (const child of el.children) await patchElement(child, rootDir, log)
  }
}

export async function resolveVeloxPlaceholders(config: VeloxVideoConfig, rootDir: string): Promise<void> {
  const log: string[] = []
  for (const scene of config.scenes) {
    for (const el of scene.elements) await patchElement(el, rootDir, log)
  }
  if (log.length) for (const l of log) console.log(l)
  validateVeloxVideoConfig(config)
}
