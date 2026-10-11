import { loadBundledLogo } from '@velox-video/svgl/loadLogo'
import type { VeloxVideoConfig } from '@velox-video/core'

type LogoPathData = { viewBox?: string; paths: { d: string; fill?: string; stroke?: string; length?: number }[] }
type LogoWithPaths = { _paths?: LogoPathData }

/** Browser playground: static import so Next bundles SVGL JSON (core dist uses dynamic import). */
export async function attachPlaygroundLogoPaths(config: VeloxVideoConfig): Promise<void> {
  const queue: Promise<void>[] = []

  const visit = (elements: VeloxVideoConfig['scenes'][number]['elements']): void => {
    for (const el of elements) {
      if (el.type === 'group') {
        visit(el.children)
        continue
      }
      if (el.type !== 'logo') continue
      const logoEl = el as LogoWithPaths & { logo: string; theme?: string }
      if (logoEl._paths) continue

      queue.push(
        (async () => {
          const paths = await loadBundledLogo(logoEl.logo, logoEl.theme)
          if (paths) logoEl._paths = paths
        })(),
      )
    }
  }

  for (const scene of config.scenes) visit(scene.elements)
  await Promise.all(queue)
}
