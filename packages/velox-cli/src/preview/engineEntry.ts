import type { VeloxVideoConfig } from '@velox-video/core'
import { drawFrame, resolveSize, preloadImages, setImageCache } from '@velox-video/core'

export async function boot(config: VeloxVideoConfig): Promise<{
  drawFrame: typeof drawFrame
  config: VeloxVideoConfig & { size: [number, number] }
  width: number
  height: number
}> {
  const [width, height] = resolveSize(config.size)
  const normalized = {
    ...config,
    size: [width, height] as [number, number],
  }
  const cache = await preloadImages(normalized)
  setImageCache(cache)
  return { drawFrame, config: normalized, width, height }
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { VeloxEngine: { boot: typeof boot } }).VeloxEngine = { boot }
}
