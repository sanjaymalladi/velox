import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Providers } from './providers'
import 'fumadocs-ui/style.css'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Velox',
    template: '%s | Velox',
  },
  description: 'Velox is a code-first motion graphics engine built for fast previews, native rendering, and LLM-friendly video generation.',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
  },
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
