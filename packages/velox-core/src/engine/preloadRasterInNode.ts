import fs from 'fs/promises'
import path from 'node:path'
import type { VeloxVideoConfig } from '../types'
import { isPlaceholderImageSrc } from '../mediaProviders'
import { attachBundledLogoPaths, collectImageSrcs, type CachedImage } from './preloadShared'

export type LoadImageFn = (input: string | Uint8Array) => Promise<CachedImage>

function ensureSvgDimensions(svgText: string): string {
  if (!svgText.match(/<svg[^>]*\s+width=/)) {
    return svgText.replace('<svg ', '<svg width="256" height="256" ')
  }
  return svgText
}

async function readSvgSource(src: string): Promise<string> {
  if (src.startsWith('data:image/svg+xml')) {
    const comma = src.indexOf(',')
    const payload = src.slice(comma + 1)
    if (src.includes(';base64,')) {
      return ensureSvgDimensions(Buffer.from(payload, 'base64').toString('utf8'))
    }
    return ensureSvgDimensions(decodeURIComponent(payload))
  }
  if (src.startsWith('http://') || src.startsWith('https://')) {
    const res = await fetch(src)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return ensureSvgDimensions(await res.text())
  }
  const abs = path.isAbsolute(src) ? src : path.resolve(src)
  return ensureSvgDimensions(await fs.readFile(abs, 'utf8'))
}

/**
 * Node raster preload given a `loadImage` implementation (e.g. from `@napi-rs/canvas`).
 * Safe to bundle into CJS tools: no `import.meta` / no direct NAPI imports.
 */
export async function preloadRasterInNodeWithLoader(
  config: VeloxVideoConfig,
  loadImage: LoadImageFn,
): Promise<Map<string, CachedImage>> {
  await attachBundledLogoPaths(config)

  const cache = new Map<string, CachedImage>()
  const preloadTargets = Array.from(collectImageSrcs(config)).filter((src) => !isPlaceholderImageSrc(src))

  await Promise.all(
    preloadTargets.map(async (src) => {
      try {
        const svg =
          src.endsWith('.svg') ||
          src.startsWith('data:image/svg+xml') ||
          /^data:image\/svg\+xml/i.test(src)
        if (svg) {
          const svgText = await readSvgSource(src)
          const img = await loadImage(new TextEncoder().encode(svgText))
          cache.set(src, img)
          return
        }
        if (src.startsWith('http://') || src.startsWith('https://')) {
          const img = await loadImage(src)
          cache.set(src, img)
          return
        }
        const abs = path.isAbsolute(src) ? src : path.resolve(src)
        const img = await loadImage(abs)
        cache.set(src, img)
      } catch (e) {
        console.warn(`[velox] Could not preload image: ${src}`, e)
      }
    }),
  )
  return cache
}
