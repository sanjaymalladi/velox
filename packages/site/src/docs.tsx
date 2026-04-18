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
import type { ReactNode, FC } from 'react'
import { Markdown as MarkdownAsync } from 'fumadocs-core/content/md'
import { PlaygroundClient } from './PlaygroundClient'

// fumadocs Markdown is an async server component — cast via unknown to satisfy React 19 JSX constraint
const Markdown = MarkdownAsync as unknown as FC<{ children: string }>

type DocsSlug = '' | 'getting-started' | 'preview' | 'rendering' | 'cli' | 'templates' | 'prompt' | 'playground'

type DocsPageConfig = {
  slug: DocsSlug
  url: string
  title: string
  description: string
  sourcePath: string
  toc: TOCItemType[]
}

const GITHUB_BASE = 'https://github.com/sanjaymalladi/velox/blob/main'

export const DOCS_TREE = {
  type: 'root',
  name: 'Velox Docs',
  description: 'Guides and references for building motion graphics with code.',
  children: [
    { type: 'page', name: 'Overview', url: '/docs', description: 'What Velox is and how the docs are organized.' },
    { type: 'page', name: 'Getting Started', url: '/docs/getting-started', description: 'Install, bootstrap, and run your first project.' },
    { type: 'page', name: 'Preview', url: '/docs/preview', description: 'Learn the preview workflow and editor loop.' },
    { type: 'page', name: 'Rendering', url: '/docs/rendering', description: 'Understand how final output is generated.' },
    { type: 'page', name: 'CLI', url: '/docs/cli', description: 'Command reference and workflow guidance.' },
    { type: 'page', name: 'Templates', url: '/docs/templates', description: 'Pre-made templates to jumpstart your projects.' },
    { type: 'page', name: 'Prompt', url: '/docs/prompt', description: 'System prompt for LLM-assisted code generation.' },
    { type: 'page', name: 'Playground', url: '/docs/playground', description: 'Interactive code playground to experiment with animations.' },
  ],
} as const satisfies PageTreeRoot

const DOCS_PAGES: Record<DocsSlug, DocsPageConfig> = {
  '': {
    slug: '',
    url: '/docs',
    title: 'Overview',
    description: 'A docs-first introduction to Velox, the workflow, and the surrounding mental model.',
    sourcePath: 'packages/site/content/docs/index.mdx',
    toc: [
      { title: 'What Velox is', url: '#what-velox-is', depth: 2 },
      { title: 'What it is not', url: '#what-it-is-not', depth: 2 },
      { title: 'Core workflow', url: '#core-workflow', depth: 2 },
      { title: 'Project anatomy', url: '#project-anatomy', depth: 2 },
      { title: 'Docs map', url: '#docs-map', depth: 2 },
      { title: 'Working conventions', url: '#working-conventions', depth: 2 },
    ],
  },
  'getting-started': {
    slug: 'getting-started',
    url: '/docs/getting-started',
    title: 'Getting Started',
    description: 'Install the toolchain, understand the template structure, and run the first composition.',
    sourcePath: 'packages/site/content/docs/getting-started.mdx',
    toc: [
      { title: 'Prerequisites', url: '#prerequisites', depth: 2 },
      { title: 'Install', url: '#install', depth: 2 },
      { title: 'Project structure', url: '#project-structure', depth: 2 },
      { title: 'First template', url: '#first-template', depth: 2 },
      { title: 'Preview', url: '#preview', depth: 2 },
      { title: 'Render', url: '#render', depth: 2 },
      { title: 'Common mistakes', url: '#common-mistakes', depth: 2 },
    ],
  },
  preview: {
    slug: 'preview',
    url: '/docs/preview',
    title: 'Preview',
    description: 'Learn how the preview studio works, what it watches, and how to use it efficiently.',
    sourcePath: 'packages/site/content/docs/preview.mdx',
    toc: [
      { title: 'What preview does', url: '#what-preview-does', depth: 2 },
      { title: 'How it works', url: '#how-it-works', depth: 2 },
      { title: 'Shortcuts', url: '#shortcuts', depth: 2 },
      { title: 'Debugging the loop', url: '#debugging-the-loop', depth: 2 },
      { title: 'When to use it', url: '#when-to-use-it', depth: 2 },
    ],
  },
  rendering: {
    slug: 'rendering',
    url: '/docs/rendering',
    title: 'Rendering',
    description: 'Understand how Velox exports media and how to keep output deterministic.',
    sourcePath: 'packages/site/content/docs/rendering.mdx',
    toc: [
      { title: 'Render pipeline', url: '#render-pipeline', depth: 2 },
      { title: 'Inputs', url: '#inputs', depth: 2 },
      { title: 'Output formats', url: '#output-formats', depth: 2 },
      { title: 'Quality', url: '#quality', depth: 2 },
      { title: 'Determinism', url: '#determinism', depth: 2 },
      { title: 'Troubleshooting', url: '#troubleshooting', depth: 2 },
    ],
  },
  cli: {
    slug: 'cli',
    url: '/docs/cli',
    title: 'CLI',
    description: 'Reference for the top-level commands, practical flags, and common template workflows.',
    sourcePath: 'packages/site/content/docs/cli.mdx',
    toc: [
      { title: 'Commands', url: '#commands', depth: 2 },
      { title: 'Templates', url: '#templates', depth: 2 },
      { title: 'Useful flags', url: '#useful-flags', depth: 2 },
      { title: 'Environment', url: '#environment', depth: 2 },
      { title: 'Workflow recipes', url: '#workflow-recipes', depth: 2 },
      { title: 'What to avoid', url: '#what-to-avoid', depth: 2 },
    ],
  },
  templates: {
    slug: 'templates',
    url: '/docs/templates',
    title: 'Templates',
    description: 'Pre-made templates to jumpstart your Velox projects.',
    sourcePath: 'packages/site/content/docs/templates.mdx',
    toc: [
      { title: 'Available Templates', url: '#available-templates', depth: 2 },
      { title: 'Using Templates', url: '#using-templates', depth: 2 },
      { title: 'Customizing Templates', url: '#customizing-templates', depth: 2 },
      { title: 'Template Best Practices', url: '#template-best-practices', depth: 2 },
      { title: 'Next Steps', url: '#next-steps', depth: 2 },
    ],
  },
  prompt: {
    slug: 'prompt',
    url: '/docs/prompt',
    title: 'Prompt',
    description: 'System prompt template for LLM-assisted Velox code generation.',
    sourcePath: 'packages/site/content/docs/prompt.mdx',
    toc: [
      { title: 'Complete System Prompt', url: '#complete-system-prompt', depth: 2 },
      { title: 'Prompt Templates for Specific Use Cases', url: '#prompt-templates-for-specific-use-cases', depth: 2 },
      { title: 'Effective Prompting Tips', url: '#effective-prompting-tips', depth: 2 },
      { title: 'Common Mistakes to Avoid in Prompts', url: '#common-mistakes-to-avoid-in-prompts', depth: 2 },
      { title: 'Example Prompts', url: '#example-prompts', depth: 2 },
      { title: 'Testing Generated Code', url: '#testing-generated-code', depth: 2 },
      { title: 'Troubleshooting Prompt Issues', url: '#troubleshooting-prompt-issues', depth: 2 },
      { title: 'Advanced: Custom System Prompts', url: '#advanced-custom-system-prompts', depth: 2 },
      { title: 'Next Steps', url: '#next-steps', depth: 2 },
    ],
  },
  playground: {
    slug: 'playground',
    url: '/docs/playground',
    title: 'Playground',
    description: 'Interactive code playground to experiment with Velox animations.',
    sourcePath: 'packages/site/content/docs/playground.mdx',
    toc: [],
  },
}

// ─── Read an MDX file from the content directory ─────────────────────────────

function readMdx(slugOrIndex: string): string {
  const filename = slugOrIndex === '' ? 'index' : slugOrIndex
  const filepath = path.join(process.cwd(), 'content', 'docs', `${filename}.mdx`)
  try {
    const raw = fs.readFileSync(filepath, 'utf-8')
    // Strip YAML frontmatter
    return raw.replace(/^---[\s\S]*?---\n/, '')
  } catch {
    return ''
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function getDocsPage(slug: string[] = []): DocsPageConfig | undefined {
  const key = (slug.join('/') || '') as DocsSlug
  return DOCS_PAGES[key]
}

export function getDocsPages() {
  return Object.values(DOCS_PAGES)
}

export function getMarkdownUrl(page: DocsPageConfig) {
  const slug = page.slug === '' ? 'index' : page.slug
  return `/api/mdx?slug=${slug}`
}

export function getGithubUrl(page: DocsPageConfig) {
  return `${GITHUB_BASE}/${page.sourcePath}`
}

export function getStaticParams() {
  return [{ slug: [] as string[] }, ...getDocsPages()
    .filter((page) => page.slug !== '')
    .map((page) => ({ slug: [page.slug] }))]
}

// ─── Site shell ───────────────────────────────────────────────────────────────

export function DocsSite({ slug }: { slug: string[] }) {
  const page = getDocsPage(slug)

  if (!page) {
    notFound()
  }

  return (
    <DocsLayout
      tree={DOCS_TREE}
      githubUrl="https://github.com/sanjaymalladi/velox"
      nav={{ title: 'Velox', url: '/docs', transparentMode: 'none' }}
      searchToggle={{ enabled: false }}
      sidebar={{ defaultOpenLevel: 1 }}
    >
      <DocsPage full toc={page.toc}>
        <DocsPageShell page={page} />
      </DocsPage>
    </DocsLayout>
  )
}

function DocsPageShell({ page }: { page: DocsPageConfig }) {
  const markdownUrl = getMarkdownUrl(page)
  const isPlayground = page.slug === 'playground'

  return (
    <>
      <div className="docs-page-actions">
        <MarkdownCopyButton markdownUrl={markdownUrl}>Copy as Markdown</MarkdownCopyButton>
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={getGithubUrl(page)}>
          Open with
        </ViewOptionsPopover>
      </div>
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      {isPlayground
        ? <PlaygroundClient />
        : <DocsBody>{renderDocsBody(page.slug)}</DocsBody>
      }
    </>
  )
}

// ─── Body renderer ────────────────────────────────────────────────────────────

function renderDocsBody(slug: DocsSlug) {
  switch (slug) {
    case '':
      return (
        <>
          <SectionHeading id="what-velox-is">What Velox is</SectionHeading>
          <p>
            Velox is a code-first motion graphics workflow that keeps the composition model typed
            and the preview/render loop explicit. It is designed for teams that want reusable
            templates rather than one-off timelines.
          </p>
          <ul>
            <li>TypeScript-first composition code.</li>
            <li>React scene modules that can be reused across projects.</li>
            <li>A docs-led workflow that explains the moving parts before you use them.</li>
          </ul>

          <SectionHeading id="what-it-is-not">What it is not</SectionHeading>
          <p>
            Velox is not a drag-and-drop editor. It does not hide the composition model or the
            render pipeline. The code is the source of truth.
          </p>

          <SectionHeading id="core-workflow">Core workflow</SectionHeading>
          <ol>
            <li>Write the composition.</li>
            <li>Preview the result locally.</li>
            <li>Check timing, typography, and layout.</li>
            <li>Render the final media artifact.</li>
          </ol>
          <CodeBlock title="Composition.tsx">
            {`import { Composition } from 'remotion'
import { ProductAd } from './ProductAd'

export function Root() {
  return (
    <Composition
      id="ProductAd"
      component={ProductAd}
      durationInFrames={240}
      fps={30}
      width={1920}
      height={1080}
    />
  )
}`}
          </CodeBlock>

          <SectionHeading id="project-anatomy">Project anatomy</SectionHeading>
          <ul>
            <li>Composition registration lives in a small root module.</li>
            <li>Each scene should live in its own file when it can be reused.</li>
            <li>Shared tokens belong in a central theme or constants module.</li>
            <li>Command entrypoints should stay separate from scene rendering code.</li>
          </ul>

          <SectionHeading id="docs-map">Docs map</SectionHeading>
          <p>
            The docs are ordered so you can understand the product from first principles:
            installation, preview, rendering, and the CLI reference. Read them in that order if
            you are new to the project.
          </p>

          <SectionHeading id="working-conventions">Working conventions</SectionHeading>
          <ul>
            <li>Keep scene props narrow and typed.</li>
            <li>Keep dimensions and frame rate explicit.</li>
            <li>Prefer reusable scene components over deeply nested one-off markup.</li>
          </ul>
        </>
      )
    case 'getting-started':
      return (
        <>
          <SectionHeading id="prerequisites">Prerequisites</SectionHeading>
          <ul>
            <li>Node.js 18 or newer.</li>
            <li>pnpm.</li>
            <li>A workspace ready for a new composition or template.</li>
            <li>A willingness to keep runtime settings explicit.</li>
          </ul>

          <SectionHeading id="install">Install</SectionHeading>
          <p>
            Create the project and install dependencies before you change any template code.
          </p>
          <CodeBlock title="Terminal">
            {`pnpm create velox-video@latest\ncd my-video\npnpm install`}
          </CodeBlock>

          <SectionHeading id="project-structure">Project structure</SectionHeading>
          <p>
            A healthy Velox project stays small at the boundary and pushes complexity into scenes
            and shared utilities.
          </p>
          <ul>
            <li>Keep the root composition file lightweight.</li>
            <li>Move each reusable scene into a separate module.</li>
            <li>Store palette tokens, constants, and helper functions together.</li>
            <li>Keep preview and render commands pointed at the same source file.</li>
          </ul>

          <SectionHeading id="first-template">First template</SectionHeading>
          <p>
            Your first template should validate the whole loop rather than just one scene.
          </p>
          <ol>
            <li>Register a composition.</li>
            <li>Render one hero scene and one supporting scene.</li>
            <li>Preview the result locally.</li>
            <li>Render a file and confirm the export.</li>
          </ol>
          <CodeBlock title="Composition.tsx">
            {`import { Composition } from 'remotion'
import { ProductAd } from './ProductAd'

export function Root() {
  return (
    <Composition
      id="ProductAd"
      component={ProductAd}
      durationInFrames={240}
      fps={30}
      width={1920}
      height={1080}
    />
  )
}`}
          </CodeBlock>

          <SectionHeading id="preview">Preview</SectionHeading>
          <p>
            The preview loop is where you validate pacing, spacing, and text contrast.
          </p>
          <CodeBlock title="Preview">
            {`pnpm velox preview video.ts`}
          </CodeBlock>

          <SectionHeading id="render">Render</SectionHeading>
          <p>
            Only switch to render when the scene is stable.
          </p>
          <CodeBlock title="Render">
            {`pnpm velox render video.ts --output result.mp4`}
          </CodeBlock>

          <SectionHeading id="common-mistakes">Common mistakes</SectionHeading>
          <ul>
            <li>Registering the wrong dimensions.</li>
            <li>Moving timing values into more than one place.</li>
            <li>Letting preview-only assumptions leak into the render path.</li>
            <li>Skipping shared theme tokens and duplicating palette values.</li>
          </ul>
        </>
      )
    case 'preview':
      return (
        <>
          <SectionHeading id="what-preview-does">What preview does</SectionHeading>
          <ul>
            <li>Serves the current composition over HTTP.</li>
            <li>Pushes source changes into the browser studio.</li>
            <li>Keeps the canvas and timeline synchronized.</li>
            <li>Lets you validate motion without final encoding.</li>
          </ul>

          <SectionHeading id="how-it-works">How it works</SectionHeading>
          <ol>
            <li>Load the same composition entrypoint used for render.</li>
            <li>Resolve props from the template code.</li>
            <li>Watch the source file and update the player when it changes.</li>
            <li>Keep the preview path close to the final export path.</li>
          </ol>

          <SectionHeading id="shortcuts">Shortcuts</SectionHeading>
          <ul>
            <li><kbd>Space</kbd> play or pause.</li>
            <li><kbd>ArrowLeft</kbd> and <kbd>ArrowRight</kbd> move through frames.</li>
            <li><kbd>Shift</kbd> plus arrows moves faster through the timeline.</li>
            <li><kbd>E</kbd> exports the current frame range when supported.</li>
          </ul>
          <CodeBlock title="Preview workflow">
            {`pnpm velox preview video.ts`}
          </CodeBlock>

          <SectionHeading id="debugging-the-loop">Debugging the loop</SectionHeading>
          <ul>
            <li>If the canvas looks wrong, check dimensions first.</li>
            <li>If text is clipped, inspect font loading, line height, and overflow.</li>
            <li>If motion feels off, compare adjacent sequences and frame boundaries.</li>
            <li>If reload fails, confirm the watched file is the file you are editing.</li>
          </ul>

          <SectionHeading id="when-to-use-it">When to use it</SectionHeading>
          <p>
            Use preview while iterating on copy, spacing, animation timing, and contrast. Once the
            scene is stable, move to render.
          </p>
        </>
      )
    case 'rendering':
      return (
        <>
          <SectionHeading id="render-pipeline">Render pipeline</SectionHeading>
          <ol>
            <li>Resolve the composition.</li>
            <li>Walk the timeline frame by frame.</li>
            <li>Encode frames into the selected media format.</li>
            <li>Write the artifact to disk.</li>
          </ol>

          <SectionHeading id="inputs">Inputs</SectionHeading>
          <ul>
            <li>Composition id.</li>
            <li>Final width and height.</li>
            <li>Frame rate.</li>
            <li>Output path.</li>
            <li>Format and quality settings.</li>
          </ul>
          <CodeBlock title="Render request">
            {`await render({
  composition: 'ProductAd',
  format: 'mp4',
  fps: 30,
  width: 1920,
  height: 1080,
})`}
          </CodeBlock>

          <SectionHeading id="output-formats">Output formats</SectionHeading>
          <ul>
            <li>mp4 for delivery and sharing.</li>
            <li>webm for browser-friendly playback.</li>
            <li>gif for lightweight previews and chat.</li>
          </ul>

          <SectionHeading id="quality">Quality</SectionHeading>
          <p>
            Quality settings should be intentional. If the output size matters, adjust the
            dimensions and source quality together rather than relying on compression alone.
          </p>

          <SectionHeading id="determinism">Determinism</SectionHeading>
          <ul>
            <li>Keep preview and render using the same props.</li>
            <li>Avoid time-dependent side effects in scene code.</li>
            <li>Keep render configuration explicit and versionable.</li>
          </ul>

          <SectionHeading id="troubleshooting">Troubleshooting</SectionHeading>
          <ul>
            <li>If the output is stretched, verify width and height.</li>
            <li>If render time is high, reduce scene complexity or shorten the export range.</li>
            <li>If fonts differ from preview, check the loading path and fallbacks.</li>
            <li>If the output path is wrong, pin it in the command instead of relying on defaults.</li>
          </ul>
        </>
      )
    case 'cli':
      return (
        <>
          <SectionHeading id="commands">Commands</SectionHeading>
          <ul>
            <li>
              <code>velox new &lt;name&gt;</code> scaffolds a project.
            </li>
            <li>
              <code>velox preview &lt;file&gt;</code> opens the preview studio.
            </li>
            <li>
              <code>velox render &lt;file&gt;</code> exports the animation.
            </li>
          </ul>

          <SectionHeading id="templates">Templates</SectionHeading>
          <p>
            Template starters should cover the most common use cases so teams do not need to
            invent their own structure before they are productive.
          </p>
          <ul>
            <li>News intros.</li>
            <li>Product launches.</li>
            <li>Social cuts.</li>
            <li>Data stories.</li>
            <li>Lower-thirds.</li>
          </ul>

          <SectionHeading id="useful-flags">Useful flags</SectionHeading>
          <ul>
            <li>Use an explicit output path for deterministic placement.</li>
            <li>Use explicit dimensions when exporting to multiple channels.</li>
            <li>Keep the input module path short and stable.</li>
          </ul>
          <CodeBlock title="Commands">
            {`velox new my-video\nvelox preview video.ts\nvelox render video.ts --output result.mp4`}
          </CodeBlock>

          <SectionHeading id="environment">Environment</SectionHeading>
          <ul>
            <li>Keep secrets outside the composition module.</li>
            <li>Use environment variables for automation integration.</li>
            <li>Keep shared theme values in one file.</li>
          </ul>

          <SectionHeading id="workflow-recipes">Workflow recipes</SectionHeading>
          <ol>
            <li>Bootstrap a workspace.</li>
            <li>Verify preview works.</li>
            <li>Iterate in React.</li>
            <li>Render the final output.</li>
          </ol>

          <SectionHeading id="what-to-avoid">What to avoid</SectionHeading>
          <ul>
            <li>Duplicating render settings in multiple scripts.</li>
            <li>Hiding dimensions inside ad hoc constants.</li>
            <li>Treating the CLI as a replacement for composition structure.</li>
          </ul>
        </>
      )
    case 'templates':
    case 'prompt': {
      const content = readMdx(slug)
      return <Markdown>{content}</Markdown>
    }
    case 'playground':
      return null
  }
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return <h2 id={id}>{children}</h2>
}

function CodeBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="docs-code-block">
      <div className="docs-code-block-header">
        <span>{title}</span>
        <span>copy</span>
      </div>
      <pre>
        <code>{children}</code>
      </pre>
    </section>
  )
}
