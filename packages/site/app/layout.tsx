import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Providers } from './providers'
import 'fumadocs-ui/style.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Velox',
  description: 'Velox is a code-first motion graphics engine with a docs-first workflow.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
