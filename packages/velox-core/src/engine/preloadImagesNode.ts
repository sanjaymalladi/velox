import { createRequire } from 'module'
import { fileURLToPath } from 'node:url'
import type { VeloxVideoConfig } from '../types'
import { preloadRasterInNodeWithLoader, type LoadImageFn } from './preloadRasterInNode'
import type { CachedImage } from './preloadShared'

/**
 * Node/native entry for published `@velox-video/core/node-render` (ESM `.mjs` only).
 * Uses `import.meta.url` — do not bundle this file into a CJS app; use
 * `preloadRasterInNodeWithLoader` + your own `createRequire` anchor instead.
 */
function getCanvasLoadImage(): LoadImageFn {
  const requireFn = createRequire(fileURLToPath(import.meta.url))
  const specifier = `${String.fromCharCode(64)}napi-rs/canvas`
  const mod = requireFn(specifier) as { loadImage: LoadImageFn }
  return mod.loadImage
}

/**
 * Convenience: preload for Node using `@napi-rs/canvas`.
 * Import from **`@velox-video/core/node-render`** only.
 */
export async function preloadImagesInNode(config: VeloxVideoConfig): Promise<Map<string, CachedImage>> {
  return preloadRasterInNodeWithLoader(config, getCanvasLoadImage())
}
