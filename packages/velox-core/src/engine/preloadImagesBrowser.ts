import type { VeloxVideoConfig } from '../types'
import { isPlaceholderImageSrc } from '../mediaProviders'
import { attachBundledLogoPaths, collectImageSrcs, type CachedImage } from './preloadShared'

/**
 * Loads raster image elements for browser / DOM Canvas hosts.
 *
 * `@velox-video/core/index` exposes this as `preloadImages`. It must **not**
 * pull in `@napi-rs/canvas`, otherwise Next/Vercel client bundles crash.
 *
 * Node / CLI: use **`preloadImagesInNode`** from **`@velox-video/core/node-render`**.
 */
export async function preloadImages(config: VeloxVideoConfig): Promise<Map<string, CachedImage>> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    throw new Error(
      '[@velox-video/core] preloadImages() runs only in the browser (DOM Image). ' +
        'In Node/native export import `preloadImagesInNode` from `@velox-video/core/node-render`.',
    )
  }

  await attachBundledLogoPaths(config)

  const cache = new Map<string, CachedImage>()
  const preloadTargets = Array.from(collectImageSrcs(config)).filter((src) => !isPlaceholderImageSrc(src))

  await Promise.all(
    preloadTargets.map(async (src) => {
      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            cache.set(src, img)
            resolve()
          }
          img.onerror = reject
          img.src = src
        })
      } catch (e) {
        console.warn(`[velox] Could not preload image: ${src}`, e)
      }
    }),
  )
  return cache
}
