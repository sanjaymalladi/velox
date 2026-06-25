'use client'

import dynamic from 'next/dynamic'
import type { ThemeEntry } from './themesManifest.shared'

const ThemesExplorerInner = dynamic(
  () => import('./ThemesExplorer').then((m) => ({ default: m.ThemesExplorer })),
  {
    ssr: false,
    loading: () => <p className="docs-playground-loading">Loading theme explorer…</p>,
  },
)

export function ThemesExplorerLazy({ themes }: { themes: ThemeEntry[] }) {
  return <ThemesExplorerInner themes={themes} />
}
