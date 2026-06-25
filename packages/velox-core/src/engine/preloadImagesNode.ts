import { createRequire } from 'module'
import type { VeloxVideoConfig } from '../types'
import { preloadRasterInNodeWithLoader, type LoadImageFn } from './preloadRasterInNode'
import type { CachedImage } from './preloadShared'

/**
 * Node/native entry for published `@velox-video/core/node-render` (ESM `.mjs` only).
 * Keep the require anchor CJS-safe so the shared workspace lint pass can compile it too.
 */
function getCanvasLoadImage(): LoadImageFn {
  const requireFn = typeof __filename === 'string'
    ? createRequire(__filename)
    : createRequire(`${process.cwd()}/noop.js`)
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
