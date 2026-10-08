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
        text: 'Themes',
        url: '/docs/themes',
      },
      {
        text: 'Playground',
        url: '/docs/playground',
      },
    ],
  }
}
