'use client'

import dynamic from 'next/dynamic'

export const PlaygroundLazy = dynamic(
  () => import('./PlaygroundClient').then((m) => ({ default: m.PlaygroundClient })),
  {
    ssr: false,
    loading: () => <p className="docs-playground-loading">Loading playground…</p>,
  },
)
