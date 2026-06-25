import type { VeloxVideoConfig, ImageElementConfig, LogoElementConfig } from '../types'

type LogoPathEntry = { d: string; fill?: string; stroke?: string; length?: number }
type LogoPathData = { viewBox?: string; paths: LogoPathEntry[] }
export type LogoWithPaths = LogoElementConfig & { _paths?: LogoPathData }

export function collectImageSrcs(config: VeloxVideoConfig): Set<string> {
  const srcs = new Set<string>()
  for (const scene of config.scenes) {
    for (const el of scene.elements) {
      if (el.type === 'image') srcs.add((el as ImageElementConfig).src)
    }
  }
  return srcs
}

/** Mutating: attaches `_paths` to logo elements via bundled SVGL JSON. */
export async function attachBundledLogoPaths(config: VeloxVideoConfig): Promise<void> {
  const queue: Promise<void>[] = []
  for (const scene of config.scenes) {
    for (const el of scene.elements) {
      if (el.type !== 'logo') continue
      const logoEl = el as LogoElementConfig
      queue.push(
        (async () => {
          const name = logoEl.logo.toLowerCase().replace(/\s+/g, '')
          const themeStr = logoEl.theme === 'dark' ? '_dark' : '_light'
          let data
          try {
            data = await import('@velox-video/svgl/dist/logos/' + name + themeStr + '.json')
          } catch {
            try {
              data = await import('@velox-video/svgl/dist/logos/' + name + '.json')
            } catch {
              console.error('Failed to load bundled SVGL paths for', name)
              return
            }
          }
          ;(logoEl as LogoWithPaths)._paths = (data.default || data) as LogoPathData
        })(),
      )
    }
  }
  await Promise.all(queue)
}

export type CachedImage = { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
