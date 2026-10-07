import type { VeloxVideoConfig, ImageElementConfig, LogoElementConfig } from '../types'

type LogoPathEntry = { d: string; fill?: string; stroke?: string; length?: number }
type LogoPathData = { viewBox?: string; paths: LogoPathEntry[] }
export type LogoWithPaths = LogoElementConfig & { _paths?: LogoPathData }

export function collectImageSrcs(config: VeloxVideoConfig): Set<string> {
  const srcs = new Set<string>()
  const visit = (els: typeof config.scenes[number]['elements']): void => {
    for (const el of els) {
      if (el.type === 'image') srcs.add((el as ImageElementConfig).src)
      else if (el.type === 'group') visit((el as { children: typeof els }).children)
    }
  }
  for (const scene of config.scenes) visit(scene.elements)
  return srcs
}

/** Mutating: attaches `_paths` to logo elements via bundled SVGL JSON. */
export async function attachBundledLogoPaths(config: VeloxVideoConfig): Promise<void> {
  const queue: Promise<void>[] = []
  const visit = (elements: VeloxVideoConfig['scenes'][number]['elements']): void => {
    for (const el of elements) {
      if (el.type === 'group') {
        visit(el.children)
        continue
      }
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
  for (const scene of config.scenes) {
    visit(scene.elements)
  }
  await Promise.all(queue)
}

export type CachedImage = { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
