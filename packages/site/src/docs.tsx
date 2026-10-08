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
import remarkGfm from 'remark-gfm'
import { VeloxWordmark } from './VeloxBrand'
import { PlaygroundLazy } from './PlaygroundLazy'
import { ThemeIndex } from './ThemeIndex'
import { readThemesManifest } from './themesManifest'

const Markdown = MarkdownAsync as unknown as FC<{
  children: string
  remarkPlugins?: unknown[]
}>

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
  section?: string
  special?: 'playground' | 'themes'
  sidebar?: boolean
}> = [
  {
    slug: '',
    name: 'Overview',
    description: 'What Velox is, and the three places to go next.',
    section: 'Start',
  },
  {
    slug: 'getting-started',
    name: 'Your first reel',
    description: 'Install the CLI, author a reel, lint, and render.',
    section: 'Start',
  },
  {
    slug: 'themes',
    name: 'Themes',
    description: 'Set one theme attribute. Look up ids without loading previews.',
    section: 'Guides',
    special: 'themes',
  },
  {
    slug: 'transitions',
    name: 'Transitions',
    description: 'Scene-to-scene motion: dissolve, wipe, zoom, and more.',
    section: 'Guides',
  },
  {
    slug: 'preview',
    name: 'Preview',
    description: 'Live studio preview for TypeScript and VML projects.',
    section: 'Guides',
  },
  {
    slug: 'rendering',
    name: 'Render and audio',
    description: 'Native canvas export, formats, audio mux, and quality flags.',
    section: 'Guides',
  },
  {
    slug: 'cli',
    name: 'CLI',
    description: 'Command reference for lint, render, themes, and catalog blocks.',
    section: 'Reference',
  },
  {
    slug: 'vml',
    name: 'VML tags',
    description: 'Attribute reference for scenes, text, media, charts, and reel blocks.',
    section: 'Reference',
  },
  {
    slug: 'markup-prompt',
    name: 'VML system prompt',
    description: 'Copy-paste prompt for LLMs writing Velox Markup.',
    section: 'For agents',
  },
  {
    slug: 'playground',
    name: 'Playground',
    description: 'Paste VML and render one preview when you ask for it.',
    special: 'playground',
    sidebar: false,
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
      toc: item.special === 'playground' ? [] : extractToc(markdown),
      markdown,
      special: item.special,
    }
  }
  return pages
}

const DOCS_PAGES = buildDocsPages()


function buildDocsTree(): PageTreeRoot {
  const children: PageTreeRoot['children'] = []
  let section = ''
  for (const item of DOCS_NAV) {
    if (item.sidebar === false) continue
    if (item.section && item.section !== section) {
      section = item.section
      children.push({ type: 'separator', name: section })
    }
    children.push({
      type: 'page',
      name: item.name,
      url: slugToUrl(item.slug),
      description: item.description,
    })
  }
  return {
    name: 'Velox Docs',
    description: 'Author VML reels, pick a theme, render native MP4.',
    children,
  }
}

export const DOCS_TREE = buildDocsTree()

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
      links={[
        { text: 'Themes', url: '/docs/themes' },
        { text: 'Playground', url: '/docs/playground' },
      ]}
      searchToggle={{ enabled: false }}
      sidebar={{ defaultOpenLevel: 0 }}
    >
      <DocsPage full={false} toc={page.toc}>
        <DocsPageShell page={page} />
      </DocsPage>
    </DocsLayout>
  )
}

function DocsPageShell({ page }: { page: DocsPageConfig }) {
  const markdownUrl = getMarkdownUrl(page)

  const isPlayground = page.special === 'playground'

  return (
    <>
      <div className={isPlayground ? 'docs-playground-page' : undefined}>
        <div className="docs-page-actions">
          <MarkdownCopyButton markdownUrl={markdownUrl}>Copy as Markdown</MarkdownCopyButton>
          <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={getGithubUrl(page)}>
            Open with
          </ViewOptionsPopover>
        </div>
        <DocsTitle>{page.title}</DocsTitle>
        <DocsDescription>{page.description}</DocsDescription>
        {isPlayground ? (
          <div className="docs-playground-panel">
            <PlaygroundLazy />
          </div>
        ) : null}
      </div>
      {isPlayground ? null : (
        <DocsBody>
          {page.markdown ? (
            <Markdown remarkPlugins={[remarkGfm]}>{page.markdown}</Markdown>
          ) : (
            <p>Content not found.</p>
          )}
          {page.special === 'themes' ? (
            <ThemeIndex
              themes={readThemesManifest().map(({ id, category, colors }) => ({ id, category, colors }))}
            />
          ) : null}
        </DocsBody>
      )}
    </>
  )
}
