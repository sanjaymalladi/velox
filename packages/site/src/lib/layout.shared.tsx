import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { VeloxWordmark } from '../VeloxBrand'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <VeloxWordmark compact />,
      url: '/docs',
      transparentMode: 'top',
    },
    githubUrl: 'https://github.com/sanjaymalladi/velox',
    links: [
      {
        text: 'Docs',
        url: '/docs',
        active: 'nested-url',
      },
      {
        text: 'Themes',
        url: '/docs/themes',
      },
      {
        text: 'CLI',
        url: '/docs/cli',
      },
    ],
  }
}
