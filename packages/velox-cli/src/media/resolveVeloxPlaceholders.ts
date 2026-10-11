import path from 'path'
import fs from 'fs-extra'
import crypto from 'crypto'
import type { ElementConfig, ImageElementConfig, VeloxVideoConfig } from '@velox-video/core'
import { decodeVeloxCardRef, validateVeloxVideoConfig } from '@velox-video/core'
import { svgBrandCard, svgGithubRepoCard, svgNpmPackageCard, svgWebsitePlaceholder } from './svgCards'
import { svgStockArt } from './svgStock'

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

async function fetchOpenverseImage(query: string): Promise<{ buffer: Buffer; ext: string; credit: { source: string; creator?: string; rights?: string } } | undefined> {
  const params = new URLSearchParams({
    q: query,
    page_size: '1',
    license: 'cc0,pdm,by,by-sa',
    license_type: 'commercial',
  })
  const headers = { 'user-agent': 'Velox video renderer/2.0 (https://github.com/sanjaymalladi/velox)' }
  const search = await fetch(`https://api.openverse.org/v1/images/?${params}`, { headers })
  if (!search.ok) throw new Error(`Openverse search returned HTTP ${search.status}`)
  const data = (await search.json()) as { results?: Array<{ id?: string; thumbnail?: string; url?: string; foreign_landing_url?: string; creator?: string; license?: string; license_version?: string; license_url?: string }> }
  const item = data.results?.find((result) => result.thumbnail && result.foreign_landing_url)
  if (!item?.thumbnail || !item.foreign_landing_url) return undefined
  let response: Response | undefined
  if (item.url) {
    try { response = await fetch(item.url, { headers }) } catch { /* try the API thumbnail below */ }
  }
  if (!response?.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    response = await fetch(item.thumbnail, { headers })
  }
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return undefined
  const contentType = response.headers.get('content-type')?.split(';')[0]
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : contentType === 'image/gif' ? 'gif' : contentType === 'image/svg+xml' ? 'svg' : 'jpg'
  const buffer = Buffer.from(await response.arrayBuffer())
  if (!buffer.length || buffer.length > 25 * 1024 * 1024) return undefined
  return {
    buffer,
    ext,
    credit: {
      source: item.foreign_landing_url,
      creator: item.creator || undefined,
      rights: [item.license?.toUpperCase(), item.license_version, item.license_url].filter(Boolean).join(' '),
    },
  }
}

async function fetchQuarryImage(query: string): Promise<{ buffer: Buffer; ext: string; credit: { source: string; creator?: string; rights?: string } } | undefined> {
  const params = new URLSearchParams({ q: query.slice(0, 200), per_page: '10', sort: 'relevant' })
  const response = await fetch(`https://quarry.siteko.tech/api/v1/images?${params}`, {
    headers: { 'user-agent': 'Velox video renderer/2.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Quarry search returned HTTP ${response.status}`)
  const data = (await response.json()) as {
    images?: Array<{
      id?: string
      title?: string
      author?: string
      sourceUrl?: string
      licence?: string
      urls?: Record<string, string>
    }>
  }
  const item = data.images?.find((image) => {
    const license = image.licence?.toLowerCase() ?? ''
    return image.id && (image.urls?.['1600'] || image.urls?.['1200']) &&
      (license.includes('cc0') || license.includes('public domain') || license.includes('us government'))
  })
  if (!item?.id) return undefined
  const url = item.urls?.['1600'] ?? item.urls?.['1200']
  if (!url) return undefined
  const imageResponse = await fetch(url, { signal: AbortSignal.timeout(20000) })
  const contentType = imageResponse.headers.get('content-type')?.split(';')[0].toLowerCase()
  if (!imageResponse.ok || !contentType?.startsWith('image/')) return undefined
  const buffer = Buffer.from(await imageResponse.arrayBuffer())
  if (!buffer.length || buffer.length > 25 * 1024 * 1024) return undefined
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : contentType === 'image/gif' ? 'gif' : 'jpg'
  return {
    buffer,
    ext,
    credit: {
      source: item.sourceUrl ?? `https://quarry.siteko.tech/api/v1/images/${item.id}`,
      creator: item.author,
      rights: item.licence,
    },
  }
}

async function patchElement(el: ElementConfig, rootDir: string, log: string[]): Promise<void> {
  if (el.type === 'image') {
    const ie = el as ImageElementConfig
    const src = ie.src

    if (src.startsWith('stock://')) {
      const slug = src.slice('stock://'.length)
      const query = slug.replace(/-/g, ' ')
      const w = ie.width ?? 520
      const h = ie.height ?? 640
      try {
        const svg = svgStockArt(query, w, h)
        const outfile = await cachePath(rootDir, `stock-gen:${slug}`, 'svg')
        await fs.writeFile(outfile, svg, 'utf8')
        ie.src = path.resolve(outfile)
        log.push(`[velox] Generated stock tile for "${query}"`)
      } catch {
        log.push(`[velox] stock:// tile generation failed for "${query}".`)
      }
    }

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
        } else if (provider === 'openverse') {
          const metadataPath = await cachePath(rootDir, `openverse:${query}`, 'json')
          const cached = await fs.readJson(metadataPath).catch(() => undefined) as { file?: string; credit?: { source?: string; creator?: string; rights?: string } } | undefined
          const cachedFile = cached?.file ? path.join(path.dirname(metadataPath), path.basename(cached.file)) : undefined
          if (cachedFile && await fs.pathExists(cachedFile) && cached?.credit?.source) {
            ie.src = cachedFile
            ie.provenance = { ...ie.provenance, ...cached.credit }
            log.push(`[velox] Openverse image reused from cache for "${query}"`)
          } else {
            const result = await fetchOpenverseImage(query)
            if (result) {
              const outfile = await cachePath(rootDir, `openverse:${query}`, result.ext)
              await fs.writeFile(outfile, result.buffer)
              ie.src = path.resolve(outfile)
              ie.provenance = { ...ie.provenance, ...result.credit }
              await fs.writeJson(metadataPath, { file: path.basename(outfile), credit: result.credit })
              log.push(`[velox] Openverse image cached for "${query}"${result.credit.creator ? ` by ${result.credit.creator}` : ''}`)
            } else {
              log.push(`[velox] No commercially licensed Openverse image found for "${query}"`)
            }
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
        } else if (provider === 'quarry') {
          const metadataPath = await cachePath(rootDir, `quarry:${query}`, 'json')
          const cached = await fs.readJson(metadataPath).catch(() => undefined) as { file?: string; credit?: { source?: string; creator?: string; rights?: string } } | undefined
          const cachedFile = cached?.file ? path.join(path.dirname(metadataPath), path.basename(cached.file)) : undefined
          if (cachedFile && await fs.pathExists(cachedFile) && cached?.credit?.source) {
            ie.src = cachedFile
            ie.provenance = { ...ie.provenance, ...cached.credit }
            log.push(`[velox] Quarry image reused from cache for "${query}"`)
          } else {
            const result = await fetchQuarryImage(query)
            if (result) {
              const outfile = await cachePath(rootDir, `quarry:${query}`, result.ext)
              await fs.writeFile(outfile, result.buffer)
              ie.src = path.resolve(outfile)
              ie.provenance = { ...ie.provenance, ...result.credit }
              await fs.writeJson(metadataPath, { file: path.basename(outfile), credit: result.credit })
              log.push(`[velox] Quarry image cached for "${query}"`)
            } else {
              log.push(`[velox] No permissively licensed Quarry image found for "${query}"`)
            }
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
