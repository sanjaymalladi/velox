import fs from 'fs'
import path from 'path'
import { notFound } from 'next/navigation'
import { DocsLayout } from 'fumadocs-ui/layouts/notebook'
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/notebook/page'
import type { Root as PageTreeRoot } from 'fumadocs-core/page-tree'
import type { TOCItemType } from 'fumadocs-core/toc'
import type { FC } from 'react'
import { Markdown as MarkdownAsync } from 'fumadocs-core/content/md'
import { VeloxWordmark } from './VeloxBrand'
import { PlaygroundLazy } from './PlaygroundLazy'
import { ThemesExplorerLazy } from './ThemesExplorerLazy'
import { readThemesManifest } from './themesManifest'
import { THEME_SCENARIO_IDS, THEME_SCENARIO_LABELS } from './themeScenarios'

const Markdown = MarkdownAsync as unknown as FC<{ children: string }>

type DocsSlug = string

type DocsPageConfig = {
  slug: DocsSlug
  url: string
  title: string
  description: string
  sourcePath: string
  toc: TOCItemType[]
  markdown: string
  special?: 'playground' | 'themes'
}

const GITHUB_BASE = 'https://github.com/sanjaymalladi/velox/blob/main'

const DOCS_NAV: Array<{
  slug: DocsSlug
  name: string
  description: string
  special?: 'playground' | 'themes'
}> = [
  {
    slug: '',
    name: 'Overview',
    description: 'What Velox is, how VML authoring works, and where to go next.',
  },
  {
    slug: 'getting-started',
    name: 'Getting Started',
    description: 'Install the CLI, author your first reel, lint, and render.',
  },
  {
    slug: 'themes',
    name: 'Themes',
    description: 'Built-in aesthetics — one attribute locks the whole look.',
    special: 'themes',
  },
  {
    slug: 'transitions',
    name: 'Transitions',
    description: 'Scene-to-scene motion: dissolve, wipe, zoom, and more.',
  },
  {
    slug: 'preview',
    name: 'Preview',
    description: 'Live studio preview for TypeScript and VML projects.',
  },
  {
    slug: 'rendering',
    name: 'Rendering',
    description: 'Native canvas export, formats, audio mux, and quality flags.',
  },
  {
    slug: 'cli',
    name: 'CLI',
    description: 'Command reference for lint, render, themes, and catalog blocks.',
  },
  {
    slug: 'markup-prompt',
    name: 'VML Prompt',
    description: 'System prompt for LLMs writing Velox Markup reels.',
  },
  {
    slug: 'playground',
    name: 'Playground',
    description: 'Paste VML markup and preview in the browser.',
    special: 'playground',
  },
]

function slugToUrl(slug: DocsSlug) {
  return slug === '' ? '/docs' : `/docs/${slug}`
}

function slugToFilename(slug: DocsSlug) {
  return slug === '' ? 'index' : slug
}

function slugifyHeading(title: string) {
  return title
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function extractToc(markdown: string): TOCItemType[] {
  const items: TOCItemType[] = []
  for (const line of markdown.split('\n')) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line)
    if (!match) continue
    const depth = match[1].length
    const title = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
    items.push({ title, url: `#${slugifyHeading(title)}`, depth })
  }
  return items
}

export function readMdx(slugOrIndex: string): string {
  const filename = slugOrIndex === '' ? 'index' : slugOrIndex
  const filepath = path.join(process.cwd(), 'content', 'docs', `${filename}.mdx`)
  try {
    const raw = fs.readFileSync(filepath, 'utf-8')
    return raw.replace(/^---[\s\S]*?---\n/, '')
  } catch {
    return ''
  }
}

function readFrontmatterDescription(slug: DocsSlug): string | undefined {
  const filepath = path.join(process.cwd(), 'content', 'docs', `${slugToFilename(slug)}.mdx`)
  try {
    const raw = fs.readFileSync(filepath, 'utf-8')
    const match = /^---[\s\S]*?description:\s*(.+?)\s*[\r\n]/m.exec(raw)
    return match?.[1]?.replace(/^['"]|['"]$/g, '')
  } catch {
    return undefined
  }
}

const THEME_SCENARIOS_TOC = [
  { title: 'Theme explorer', url: '#theme-explorer', depth: 2 },
  ...THEME_SCENARIO_IDS.map((id) => ({
    title: THEME_SCENARIO_LABELS[id],
    url: `#scenario-${id}`,
    depth: 3 as const,
  })),
]

function buildThemesToc(markdown: string): TOCItemType[] {
  return [...extractToc(markdown), ...THEME_SCENARIOS_TOC]
}

function buildDocsPages(): Record<DocsSlug, DocsPageConfig> {
  const pages: Record<DocsSlug, DocsPageConfig> = {}
  for (const item of DOCS_NAV) {
    const markdown = readMdx(item.slug)
    pages[item.slug] = {
      slug: item.slug,
      url: slugToUrl(item.slug),
      title: item.name,
      description: readFrontmatterDescription(item.slug) ?? item.description,
      sourcePath: `packages/site/content/docs/${slugToFilename(item.slug)}.mdx`,
      toc: item.slug === 'themes' ? buildThemesToc(markdown) : extractToc(markdown),
      markdown,
      special: item.special,
    }
  }
  return pages
}

const DOCS_PAGES = buildDocsPages()

export const DOCS_TREE = {
  type: 'root',
  name: 'Velox Docs',
  description: 'Author VML reels, pick a theme, render native MP4.',
  children: DOCS_NAV.map((item) => {
    if (item.slug === 'themes') {
      return {
        type: 'folder' as const,
        name: item.name,
        defaultOpen: true,
        index: {
          type: 'page' as const,
          name: 'Explorer',
          url: '/docs/themes',
          description: item.description,
        },
        children: THEME_SCENARIO_IDS.map((id) => ({
          type: 'page' as const,
          name: THEME_SCENARIO_LABELS[id],
          url: `/docs/themes#scenario-${id}`,
        })),
      }
    }
    return {
      type: 'page' as const,
      name: item.name,
      url: slugToUrl(item.slug),
      description: item.description,
    }
  }),
} satisfies PageTreeRoot

export function getDocsPage(slug: string[] = []): DocsPageConfig | undefined {
  const key = slug.join('/') || ''
  return DOCS_PAGES[key]
}

export function getDocsPages() {
  return Object.values(DOCS_PAGES)
}

export function getMarkdownUrl(page: DocsPageConfig) {
  return page.url === '/docs' ? '/llms.mdx/docs' : `/llms.mdx${page.url}`
}

export function getGithubUrl(page: DocsPageConfig) {
  return `${GITHUB_BASE}/${page.sourcePath}`
}

export function getDocsMarkdown(slug: string[] = []): string {
  const page = getDocsPage(slug)
  if (!page) return ''
  return page.markdown
}

export function getStaticParams() {
  return [
    { slug: [] as string[] },
    ...getDocsPages()
    .filter((page) => page.slug !== '')
      .map((page) => ({ slug: [page.slug] })),
  ]
}

export function DocsSite({ slug }: { slug: string[] }) {
  const page = getDocsPage(slug)
  if (!page) notFound()

  return (
    <DocsLayout
      tree={DOCS_TREE}
      githubUrl="https://github.com/sanjaymalladi/velox"
      nav={{ title: <VeloxWordmark compact />, url: '/docs', transparentMode: 'none' }}
      searchToggle={{ enabled: false }}
      sidebar={{ defaultOpenLevel: 1 }}
    >
      <DocsPage
        full={page.special !== 'themes'}
        className={page.special === 'themes' ? 'docs-themes-page' : undefined}
        toc={page.toc}
      >
        <DocsPageShell page={page} />
      </DocsPage>
    </DocsLayout>
  )
}

function DocsPageShell({ page }: { page: DocsPageConfig }) {
  const markdownUrl = getMarkdownUrl(page)

  return (
    <>
      <div className="docs-page-actions">
        <MarkdownCopyButton markdownUrl={markdownUrl}>Copy as Markdown</MarkdownCopyButton>
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={getGithubUrl(page)}>
          Open with
        </ViewOptionsPopover>
      </div>
      <DocsTitle>{page.title}</DocsTitle>
      {page.special !== 'themes' && <DocsDescription>{page.description}</DocsDescription>}
      {page.special === 'playground' ? (
        <div className="docs-playground-fullbleed">
          <PlaygroundLazy />
        </div>
      ) : page.special === 'themes' ? (
        <>
          <DocsBody className="docs-themes-intro">
            {page.markdown ? <Markdown>{page.markdown}</Markdown> : null}
          </DocsBody>
          <ThemesExplorerLazy themes={readThemesManifest()} />
        </>
      ) : (
        <DocsBody>
          {page.markdown ? <Markdown>{page.markdown}</Markdown> : <p>Content not found.</p>}
        </DocsBody>
      )}
    </>
  )
}
