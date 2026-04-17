'use client'

import { RootProvider } from 'fumadocs-ui/provider/next'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{ enabled: false }}
      theme={{
        enabled: true,
        attribute: 'class',
        defaultTheme: 'dark',
        enableSystem: false,
        disableTransitionOnChange: true,
      }}
    >
      {children}
    </RootProvider>
  )
}
