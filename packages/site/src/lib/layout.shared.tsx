import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Velox',
      url: '/',
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
        text: 'CLI',
        url: '/docs/cli',
      },
    ],
  }
}
