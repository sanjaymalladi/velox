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
import type { ReactNode } from 'react'
import { Markdown } from 'fumadocs-core/content/md'

type DocsSlug = '' | 'getting-started' | 'preview' | 'rendering' | 'cli' | 'templates' | 'prompt' | 'playground'

type DocsPageConfig = {
  slug: DocsSlug
  url: string
  title: string
  description: string
  sourcePath: string
  markdown: string
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
    markdown: `---
title: Overview
description: A docs-first introduction to Velox, the workflow, and the surrounding mental model.
---

# Velox Docs

Velox is a code-first motion graphics workflow for teams that want to build reusable video templates in React, keep the composition model typed, and keep the preview/render loop close to source control.

## What Velox is

- A way to express motion graphics in TypeScript and React.
- A thin layer around Remotion compositions, preview, and rendering.
- A docs-driven workflow where the code, configuration, and output pipeline stay explicit.

## What it is not

- It is not a timeline editor.
- It is not a visual authoring environment that hides the code.
- It is not a black box around rendering flags, dimensions, or composition registration.

## Core workflow

1. Create a template composition.
2. Preview the result locally.
3. Tune timing, text, and layout.
4. Render the final media artifact.

## Project anatomy

- Composition code lives in React modules.
- Shared motion tokens and theme values stay in one place.
- Preview and render commands operate on the same source of truth.
- Documentation explains the primitives before you use them.

## Docs map

- Getting Started: install, bootstrap, and run the first project.
- Preview: understand the browser-based loop and the controls.
- Rendering: understand how outputs are encoded.
- CLI: reference the commands and practical flags.

## Working conventions

- Keep each scene small and composable.
- Prefer typed props instead of implicit runtime options.
- Treat dimensions, fps, and output format as explicit inputs.
- Write docs and templates together so new contributors can orient quickly.`,
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
    markdown: `---
title: Getting Started
description: Install the toolchain, understand the template structure, and run the first composition.
---

# Getting Started

Before you build scenes, install the project, confirm the runtime environment, and make sure your composition registration is explicit.

## Prerequisites

- Node.js 18 or newer.
- pnpm.
- A clean working directory for the template project.
- A Remotion-ready composition entrypoint.

## Install

Create a project and install dependencies:

\`\`\`bash
pnpm create velox-video@latest
cd my-video
pnpm install
\`\`\`

## Project structure

- Keep composition files small.
- Move scenes into their own modules.
- Keep theme tokens and constants in a shared file.
- Keep command entrypoints separate from UI scene code.

## First template

Your first composition should prove the loop end to end:

1. Register a composition.
2. Render a scene with text and layered shapes.
3. Preview it locally.
4. Export a final file.

## Preview

Run the local studio against a video file or template module:

\`\`\`bash
pnpm velox preview video.ts
\`\`\`

The preview stage is where you validate layout, spacing, and text contrast.

## Render

Export the project to a file only after the scene is stable:

\`\`\`bash
pnpm velox render video.ts --output result.mp4
\`\`\`

## Common mistakes

- Registering the composition with the wrong dimensions.
- Leaving hard-coded timing in more than one place.
- Mixing preview-only assumptions into the render path.
- Skipping a shared theme file and duplicating palette values.`,
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
    markdown: `---
title: Preview
description: Learn how the preview studio works, what it watches, and how to use it efficiently.
---

# Preview

The preview studio is the fastest feedback loop in the system. It watches your source, serves the composition locally, and updates the timeline while you edit.

## What preview does

- Serves the composition config over HTTP.
- Pushes source updates through a local channel.
- Synchronizes the canvas, controls, and timeline.
- Makes frame-by-frame changes visible immediately.

## How it works

The preview experience should stay close to the final render path:

1. Load the same composition registration used for export.
2. Resolve props through the same template code.
3. Reflect source edits without rebuilding the whole project.

## Shortcuts

- Space: play or pause.
- ArrowLeft and ArrowRight: move through frames.
- Shift plus arrows: move faster through the timeline.
- E: export the current frame range when the studio supports it.

## Debugging the loop

- If the canvas looks wrong, check the composition dimensions first.
- If text is clipped, review line-height, overflow, and font loading.
- If motion feels off, compare the current frame to the previous sequence boundary.
- If the preview does not reload, confirm the source file is watched by the project command.

## When to use it

Use preview whenever you are adjusting:

- copy length,
- scene spacing,
- entry and exit timing,
- contrast and readability,
- or template variants for different outputs.

Only switch to render once the composition is stable enough to produce a deliverable.`,
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
    markdown: `---
title: Rendering
description: Understand how Velox exports media and how to keep output deterministic.
---

# Rendering

Rendering converts the composition timeline into a finished artifact. Keep the render inputs explicit so the same source always produces the same result.

## Render pipeline

1. Resolve the composition.
2. Walk the timeline frame by frame.
3. Encode the frames into the selected output format.
4. Write the artifact to disk.

## Inputs

- Composition id.
- Final width and height.
- Frame rate.
- Output path.
- Format and quality settings.

## Output formats

- mp4 for delivery and sharing.
- webm for browser-friendly playback.
- gif for quick previews and chat tools.

## Quality

Use explicit quality settings when the encoder exposes them. If output size matters, adjust dimensions before you rely on compression alone.

## Determinism

- Keep the render command isolated from editor-only state.
- Use the same props in preview and render.
- Avoid time-dependent side effects in the scene code.

## Troubleshooting

- If the result looks stretched, verify width and height.
- If the render is slower than expected, reduce complexity or export a shorter range.
- If text differs from preview, check font loading and fallback fonts.
- If the output path is wrong, pin it in the command instead of relying on ambient defaults.`,
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
    markdown: `---
title: CLI
description: Reference for the top-level commands, practical flags, and common template workflows.
---

# CLI

The CLI is intentionally small. It should help you create a project, preview it, and render it without hiding what happens next.

## Commands

- \`velox new <name>\` scaffolds a new project.
- \`velox preview <file>\` opens the preview studio.
- \`velox render <file>\` exports the animation.

## Templates

Velox ships with starter templates for:

- news intros,
- product launches,
- social cuts,
- data stories,
- and lower-thirds.

## Useful flags

- Use an explicit output path for deterministic file placement.
- Use explicit dimensions when rendering templates for multiple channels.
- Keep the input module path short and stable.

## Environment

- Keep secrets and deployment-specific values outside the composition module.
- Use environment variables for automation integrations when needed.
- Prefer a single config file for shared theme values.

## Workflow recipes

1. Bootstrap a new project.
2. Confirm the preview opens.
3. Adjust the template in React.
4. Render the final output.

## What to avoid

- Duplicating render settings in multiple scripts.
- Hiding dimensions inside ad hoc constants.
- Treating the CLI as a replacement for composition structure.`,
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
    markdown: `---
title: Templates
description: Pre-made templates to jumpstart your Velox projects.
---

# Templates

Velox includes a library of pre-made templates that you can use to get started quickly. These templates demonstrate common patterns and best practices for creating motion graphics.

## Available Templates

### 1. Intro Video (\`intro-video\`)

Animated title sequence perfect for opening intros and product reveals.

**Features:**
- Animated title and subtitle
- Background effects
- Smooth transitions
- Configurable colors and timing

**Use Cases:**
- YouTube video intros
- Product launch videos
- Presentation openings

**Template Code:**
\`\`\`typescript
import { canvas, rect, color, animate, text, group } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  duration: 5.0,
  children: [
    group({
      children: [
        rect({
          width: 1920,
          height: 1080,
          fill: color('#0f0f0f'),
        }),
        text({
          content: 'Your Title Here',
          font: 'bold 120px sans-serif',
          fill: color('white'),
          x: animate({ from: 1920, to: 960, duration: 1.0, delay: 0.5 }),
          y: animate({ from: 540, to: 540, duration: 1.0 }),
          opacity: animate({ from: 0, to: 1, duration: 0.5 }),
        }),
        text({
          content: 'Your Subtitle',
          font: 'bold 48px sans-serif',
          fill: color('white'),
          x: animate({ from: -500, to: 960, duration: 1.0, delay: 1.0 }),
          y: animate({ from: 700, to: 700, duration: 1.0 }),
        }),
      ],
    }),
  ],
})
\`\`\`

### 2. Data Story (\`data-story\`)

Chart and data visualization template for infographics and analytics reports.

**Features:**
- Animated bars and charts
- Progress indicators
- Number counters
- Stat displays

**Use Cases:**
- Business analytics videos
- Data presentations
- Infographics

**Template Code:**
\`\`\`typescript
import { canvas, rect, color, animate, text, group } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  duration: 10.0,
  children: [
    group({
      children: [
        rect({ width: 100, height: 200, fill: color('blue'), x: 200, y: 880 }),
        rect({
          width: 100,
          height: animate({ from: 200, to: 600, duration: 2.0 }),
          fill: color('blue'),
          x: 350,
          y: animate({ from: 880, to: 280, duration: 2.0 }),
        }),
      ],
    }),
  ],
})
\`\`\`

### 3. Kinetic Typography (\`text-kinetic\`)

Dynamic text animations for explainer videos and quotes.

**Features:**
- Word-by-word animations
- Character-level effects
- Position and scale transitions

**Use Cases:**
- Quote animations
- Explainer video text
- Social media text posts

**Template Code:**
\`\`\`typescript
import { canvas, text, color, animate, group } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  duration: 8.0,
  children: [
    group({
      children: [
        text({
          content: 'Kinetic',
          font: 'bold 150px sans-serif',
          fill: color('cyan'),
          x: animate({ from: -500, to: 960, duration: 1.0 }),
          y: 540,
        }),
        text({
          content: 'Typography',
          font: 'bold 150px sans-serif',
          fill: color('magenta'),
          x: animate({ from: 2420, to: 960, duration: 1.0 }),
          y: 720,
        }),
      ],
    }),
  ],
})
\`\`\`

### 4. Particle System (\`particle-system\`)

Generative particle effects for backgrounds and ambient animations.

**Features:**
- Floating particles
- Color gradients
- Size variations
- Movement patterns

**Use Cases:**
- Video backgrounds
- Ambient effects
- Loading screens

**Template Code:**
\`\`\`typescript
import { canvas, circle, color, animate, group } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  duration: 10.0,
  children: [
    group({
      children: Array.from({ length: 50 }, (_, i) =>
        circle({
          radius: Math.random() * 5 + 2,
          fill: color(['cyan', 'magenta', 'yellow', 'lime'][i % 4]),
          x: animate({
            from: Math.random() * 1920,
            to: Math.random() * 1920,
            duration: Math.random() * 5 + 2,
          }),
          y: animate({
            from: Math.random() * 1080,
            to: Math.random() * 1080,
            duration: Math.random() * 5 + 2,
          }),
          opacity: animate({
            from: 0,
            to: 1,
            duration: 1.0,
          }),
        })
      ),
    }),
  ],
})
\`\`\`

### 5. Product Showcase (\`product-showcase\`)

Product feature highlight for marketing content and demos.

**Features:**
- Product spotlight
- Feature callouts
- Rotating showcase
- Text overlays

**Use Cases:**
- Product launch videos
- Feature demonstrations
- Marketing content

**Template Code:**
\`\`\`typescript
import { canvas, rect, color, animate, text, group } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  duration: 15.0,
  children: [
    group({
      children: [
        rect({
          width: 600,
          height: 600,
          fill: color('#1a1a2e'),
          x: 660,
          y: 240,
          rx: 20,
          ry: 20,
        }),
        text({
          content: 'Your Product',
          font: 'bold 60px sans-serif',
          fill: color('white'),
        }),
        text({
          content: 'Feature 1',
          font: 'bold 36px sans-serif',
          fill: color('cyan'),
          x: 200,
          y: 300,
        }),
        text({
          content: 'Feature 2',
          font: 'bold 36px sans-serif',
          fill: color('magenta'),
          x: 1720,
          y: 780,
        }),
      ],
    }),
  ],
})
\`\`\`

## Using Templates

### Create from Template

\`\`\`bash
npx velox-video new my-project --template intro-video
cd my-project
npx velox-video preview src/index.ts
\`\`\`

### Copy Template Manually

\`\`\`bash
cp node_modules/@velox-video/cli/templates/intro-video.ts src/index.ts
code src/index.ts
\`\`\`

## Customizing Templates

- **Change Colors**: Use \`color('red')\` for brand colors
- **Adjust Timing**: Modify \`duration\` values
- **Add Elements**: Add to \`children\` array
- **Resize Canvas**: Change \`width\` and \`height\`

## Template Best Practices

1. Start with basic templates, add complexity gradually
2. Change one thing at a time
3. Test frequently with \`velox-video preview\`
4. Keep original as reference
5. Combine elements from different templates

## Next Steps

- Try the [Playground](./playground) to experiment
- Learn [CLI commands](./cli) for running templates
- Explore the [Prompt](./prompt) for LLM customization
- Check [Getting Started](./getting-started) for basics`,
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
    markdown: `---
title: Prompt
description: System prompt template for LLM-assisted Velox code generation.
---

# Prompt

Use this comprehensive system prompt when working with AI assistants (like ChatGPT, Claude, or other LLMs) to generate Velox code. This prompt contains all the necessary information about the Velox library for accurate code generation.

## Complete System Prompt

Copy and paste this prompt to your LLM:

\`\`\`
You are an expert TypeScript developer specializing in the Velox motion graphics engine.
Velox is a code-first motion graphics library for creating 2D animations, charts, text effects,
and particle systems programmatically in TypeScript, then exporting to MP4, WebM, or GIF.

CORE CONCEPTS:
- Import everything from '@velox-video/core'
- Use canvas() as the root element to define a scene
- Animate properties with animate({ from, to, duration, delay, easing })
- Group elements with group() for organization
- Use shapes: rect(), circle(), text(), line(), etc.
- Use color() for all color values (accepts CSS colors, hex, rgb, named colors)
- Set canvas properties: width, height, fps, duration, background

ANIMATION PATTERNS:
1. Simple property animation:
   x: animate({ from: 0, to: 100, duration: 2.0 })

2. With easing:
   x: animate({ from: 0, to: 100, duration: 2.0, easing: 'easeInOut' })

3. With delay:
   x: animate({ from: 0, to: 100, duration: 2.0, delay: 1.0 })

4. Opacity:
   opacity: animate({ from: 0, to: 1, duration: 0.5 })

AVAILABLE SHAPES:
- rect({ width, height, fill, x, y, rx, ry })
- circle({ radius, fill, x, y })
- text({ content, font, fill, x, y, fontSize })
- line({ x1, y1, x2, y2, stroke, strokeWidth })
- polyline({ points, fill, stroke })

LAYOUT HELPERS:
- group({ children: [...] }) - Group elements together
- stack({ children: [...], direction: 'vertical' | 'horizontal' }) - Stack elements

COLORS:
Use color() function:
- color('red') / color('#ff0000') / color('rgb(255,0,0)')
- Named colors: 'cyan', 'magenta', 'yellow', 'lime', etc.

EXAMPLE STRUCTURE:
\`\`\`typescript
import { canvas, rect, color, animate, text, group } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 5.0,
  background: '#0f0f0f',
  children: [
    group({
      children: [
        rect({
          width: 200,
          height: 200,
          fill: color('red'),
          x: animate({ from: 0, to: 100, duration: 2.0 }),
          y: animate({ from: 0, to: 100, duration: 2.0 }),
        }),
        text({
          content: 'Hello Velox!',
          font: 'bold 48px sans-serif',
          fill: color('white'),
          x: animate({ from: 0, to: 200, duration: 1.0 }),
        }),
      ],
    }),
  ],
})
\`\`\`

IMPORTANT RULES:
1. Always export the canvas as default export
2. All animations must be inside animate() calls
3. Use proper TypeScript types
4. Error handling: wrap code in try-catch for production
5. Performance: avoid heavy computations in render loop

COMMON PATTERNS:

**Fade In:**
opacity: animate({ from: 0, to: 1, duration: 1.0 })

**Slide From Left:**
x: animate({ from: -500, to: 100, duration: 2.0, easing: 'easeOut' })

**Scale Up:**
width: animate({ from: 0, to: 200, duration: 1.0 }),
height: animate({ from: 0, to: 200, duration: 1.0 })

**Rotate (simulate):**
Use group with multiple elements rotated

Generate clean, efficient TypeScript code following these patterns.
\`\`\`

## Prompt Templates for Specific Use Cases

### For Creating Animations
\`\`\`
Create a [description] animation using Velox.

Requirements:
- Duration: [X] seconds
- Size: [width]x[height]
- Elements: [list elements]
- Animations: [describe movements/timings]
- Colors: [color scheme]

Use the Velox API patterns defined above.
\`\`\`

### For Data Visualizations
\`\`\`
Create a chart/animation showing [data] using Velox.

Include:
- Bar/pie/line chart elements
- Animated transitions
- Labels and titles
- Color scheme: [colors]
\`\`\`

### For Text Animations
\`\`\`
Create a kinetic typography animation with text: "[your text]"

Style:
- Font: [font description]
- Colors: [colors]
- Animation type: [slide/fade/scale/etc]
- Timing: [duration, delays]
\`\`\`

## Effective Prompting Tips

### 1. Be Specific
❌ "Make an animation"
✅ "Create a 5-second intro with animated title and subtitle, red background"

### 2. Include Technical Details
✅ "1920x1080 canvas, 30fps, 5 second duration, blue rectangle animating left to right"

### 3. Describe Visual Properties
✅ "Text 'Hello' in bold 72px white font, fading in over 1 second"

### 4. Specify Timing
✅ "Element 1 starts at 0s, Element 2 starts at 1s with 0.5s delay"

### 5. Request Structure
✅ "Use group() to organize elements, animate x and y properties"

## Common Mistakes to Avoid in Prompts

1. **Don't say**: "Use React components"
   **Do say**: "Use canvas, rect, and group from Velox"

2. **Don't say**: "CSS animations"
   **Do say**: "Use animate() function for all movements"

3. **Don't say**: "HTML tags"
   **Do say**: "Velox shapes: rect, circle, text"

4. **Don't be vague**: "Make it look nice"
   **Do be specific**: "Use cyan and magenta colors, easeInOut easing"

## Example Prompts

### Basic Prompt
\`\`\`
Create a Velox animation with a blue square that moves from left to right over 3 seconds.
Canvas: 1280x720, white background.
\`\`\`

### Detailed Prompt
\`\`\`
Create a product intro animation for a smartphone using Velox:

Canvas: 1920x1080, black background, 5 seconds duration.

Elements:
1. Rectangle (phone shape): 300x600, rounded corners, animated entrance from bottom
2. Title text: "New Smartphone", white, 72px, fades in at 1 second
3. Subtitle: "Amazing features", cyan, 36px, slides in at 2 seconds

All animations should use easeOut easing.
\`\`\`

### Data Prompt
\`\`\`
Create a bar chart animation showing 3 bars growing from bottom:
- Bar 1: blue, value 100
- Bar 2: green, value 150
- Bar 3: red, value 80

Bar width 80px, spacing 40px. Animate height from 0 to value over 2 seconds each, staggered by 0.5s.
\`\`\`

## Testing Generated Code

After receiving code from an LLM:

1. **Review for Velox patterns**: Check for \`animate()\`, \`color()\`, proper structure
2. **Validate TypeScript**: Ensure proper types and exports
3. **Test incrementally**: Start with preview mode
4. **Check performance**: Watch for heavy computations in render loop
5. **Verify output**: Render a short test video to confirm

## Troubleshooting Prompt Issues

| Issue | Solution |
|-------|----------|
| LLM uses wrong API | Re-send system prompt, emphasize Velox patterns |
| Code has errors | Ask LLM to fix specific error messages |
| Animation looks wrong | Request timing adjustments or easing changes |
| Missing imports | Ask to add missing Velox imports |
| Performance issues | Request optimization suggestions |

## Advanced: Custom System Prompts

Create your own system prompt variations:

**For complex scenes:**
\`\`\`
You are a senior motion graphics developer using Velox. Focus on performance optimization and clean code structure.
\`\`\`

**For quick prototypes:**
\`\`\`
You are a rapid prototyping expert. Generate minimal, working Velox code quickly.
\`\`\`

**For teaching:**
\`\`\`
You are a Velox instructor. Explain each part of the code and why it's written that way.
\`\`\`

## Next Steps

- Try the [Playground](./playground) to test code visually
- Browse [Templates](./templates) for reference patterns
- Learn [CLI commands](./cli) to run your generated code
- Check [Getting Started](./getting-started) for fundamentals`,
  },
  playground: {
    slug: 'playground',
    url: '/docs/playground',
    title: 'Playground',
    description: 'Interactive code playground to experiment with Velox animations.',
    sourcePath: 'packages/site/content/docs/playground.mdx',
    toc: [
      { title: 'How to Use the Playground', url: '#how-to-use-the-playground', depth: 2 },
      { title: 'Pre-defined Examples', url: '#pre-defined-examples', depth: 2 },
      { title: 'Interactive Challenges', url: '#interactive-challenges', depth: 2 },
      { title: 'Code Playground Tips', url: '#code-playground-tips', depth: 2 },
      { title: 'Code Snippets Library', url: '#code-snippets-library', depth: 2 },
      { title: 'Exporting Your Work', url: '#exporting-your-work', depth: 2 },
      { title: 'Inspiration Gallery', url: '#inspiration-gallery', depth: 2 },
      { title: 'Learn More', url: '#learn-more', depth: 2 },
    ],
    markdown: `---
title: Playground
description: Interactive code playground to experiment with Velox animations.
---

# Playground

Welcome to the Velox Playground! This is an interactive environment where you can write, test, and see the results of Velox code in real-time. Paste code, modify examples, and instantly preview your animations.

## How to Use the Playground

### 1. Write Your Code

Paste or type your Velox code in the code editor:

\`\`\`typescript
import { canvas, rect, color, animate } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 5.0,
  background: '#0f0f0f',
  children: [
    rect({
      width: 200,
      height: 200,
      fill: color('red'),
      x: animate({ from: 0, to: 100, duration: 2.0 }),
    }),
  ],
})
\`\`\`

### 2. Preview Output

The animation will render in real-time as you type (if HMR is available) or you can manually refresh to see changes.

### 3. Experiment

Try different variations:
- Change colors: \`color('blue')\` → \`color('cyan')\`
- Modify timing: \`duration: 2.0\` → \`duration: 1.0\`
- Add elements: Copy/paste rect blocks
- Adjust properties: Change \`width\`, \`height\`, positions

## Pre-defined Examples

### Example 1: Basic Movement

\`\`\`typescript
import { canvas, rect, color, animate } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  duration: 4.0,
  children: [
    rect({
      width: 150,
      height: 150,
      fill: color('blue'),
      x: animate({ from: 0, to: 500, duration: 3.0 }),
      y: animate({ from: 0, to: 200, duration: 2.0 }),
    }),
  ],
})
\`\`\`

**What it does:** A blue square moves diagonally across the canvas.

**Try modifying:**
- Change \`to: 500\` to larger/smaller values
- Add \`opacity: animate({ from: 0, to: 1, duration: 1.0 })\`
- Change fill color

---

### Example 2: Multiple Elements with Staggered Timing

\`\`\`typescript
import { canvas, circle, color, animate, group } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  children: [
    group({
      children: [
        circle({
          radius: 50,
          fill: color('red'),
          x: animate({ from: 100, to: 800, duration: 3.0 }),
        }),
        circle({
          radius: 50,
          fill: color('green'),
          x: animate({ from: 100, to: 800, duration: 3.0, delay: 0.5 }),
        }),
        circle({
          radius: 50,
          fill: color('blue'),
          x: animate({ from: 100, to: 800, duration: 3.0, delay: 1.0 }),
        }),
      ],
    }),
  ],
})
\`\`\`

**What it does:** Three circles move in sequence with delays.

**Try modifying:**
- Change colors to create a gradient effect
- Adjust delays to \`0.3\`, \`0.6\`, \`0.9\`
- Add vertical motion: \`y: animate({...})\`
- Increase number of circles

---

### Example 3: Opacity Fade

\`\`\`typescript
import { canvas, rect, color, animate, text } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  background: '#0f0f0f',
  duration: 4.0,
  children: [
    rect({
      width: 400,
      height: 200,
      fill: color('cyan'),
      opacity: animate({ from: 0, to: 1, duration: 2.0, delay: 0.5 }),
      x: animate({ from: 0, to: 760, duration: 4.0 }),
    }),
    text({
      content: 'Welcome to Velox',
      font: 'bold 60px sans-serif',
      fill: color('white'),
      x: 960,
      y: 540,
      opacity: animate({ from: 0, to: 1, duration: 1.0, delay: 2.0 }),
    }),
  ],
})
\`\`\`

**What it does:** A rectangle fades in and slides, text appears after delay.

**Try modifying:**
- Change text content
- Adjust fade timing
- Add more elements with different fade schedules

---

### Example 4: Easing Functions

\`\`\`typescript
import { canvas, rect, color, animate } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  duration: 6.0,
  children: [
    rect({
      width: 100,
      height: 100,
      fill: color('magenta'),
      x: animate({ from: 0, to: 1820, duration: 3.0, easing: 'easeInOut' }),
      y: 500,
    }),
  ],
})
\`\`\`

**Easing options:** \`linear\`, \`easeIn\`, \`easeOut\`, \`easeInOut\`, \`bounce\`, \`elastic\`

**Try modifying:**
- Change easing to \`'bounce'\` or \`'elastic'\`
- Try \`easeIn\` vs \`easeOut\`
- Combine with y animation

---

### Example 5: Text Animation

\`\`\`typescript
import { canvas, text, color, animate, group } from '@velox-video/core'

export default canvas({
  width: 1920,
  height: 1080,
  background: '#1a1a2e',
  children: [
    group({
      children: [
        text({
          content: 'VELOX',
          font: 'bold 180px sans-serif',
          fill: color('cyan'),
          x: animate({ from: -1000, to: 960, duration: 2.0, easing: 'easeOut' }),
          y: 400,
        }),
        text({
          content: 'Motion Graphics Engine',
          font: '48px sans-serif',
          fill: color('white'),
          x: animate({ from: 3000, to: 960, duration: 2.0, delay: 0.5, easing: 'easeOut' }),
          y: 550,
        }),
      ],
    }),
  ],
})
\`\`\`

**What it does:** Large title text slides in from both sides.

**Try modifying:**
- Change font sizes
- Add third text line
- Modify slide directions (from top, from bottom)
- Add opacity animations

## Interactive Challenges

Try to create these animations by modifying the examples above:

### Challenge 1: Loading Spinner
Create a rotating loading indicator using circles or rectangles arranged in a circle, rotating continuously.

### Challenge 2: Progress Bar
Animate a filled rectangle width from 0 to 100% over 5 seconds.

### Challenge 3: Bouncing Ball
Make a ball bounce with gravity effect (fast down, slow up).

### Challenge 4: Counter Animation
Display numbers counting from 0 to 100 over 3 seconds (hint: use text with animated opacity to reveal digits).

## Code Playground Tips

### Keyboard Shortcuts (if available)
- \`Ctrl+Enter\`: Run code
- \`Ctrl+S\`: Save example
- \`Ctrl+Z\`: Undo
- \`Ctrl+/\`: Comment/uncomment

### Best Practices
1. **Start Simple**: Begin with 1-2 elements and add gradually
2. **Test Often**: Preview after each change
3. **Use Comments**: Document your code for future reference
4. **Save Versions**: Keep a backup of working versions
5. **Copy & Modify**: Duplicate examples and customize

### Debugging in Playground

If your animation doesn't work:

1. **Check imports**: Ensure all Velox functions are imported
2. **Validate structure**: Must export \`default canvas({...})\`
3. **Check syntax**: Missing commas, brackets, braces
4. **Verify properties**: Valid animate parameters
5. **Test incrementally**: Build up from simplest working example

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "animate is not defined" | Missing import | \`import { animate } from '@velox-video/core'\` |
| "canvas is not a function" | Wrong import | Use \`import { canvas }\` |
| Animation doesn't move | Missing animate wrapper | Wrap property in \`animate({...})\` |
| Nothing renders | No children in canvas | Add \`children: [...]\` array |

### Performance Considerations

- Limit number of simultaneous animations (keep under 50 elements)
- Use \`group()\` to organize but avoid deep nesting (> 5 levels)
- Avoid heavy computations inside render loop
- Keep canvas dimensions appropriate for target output

## Code Snippets Library

Copy and paste these useful snippets:

### Fade In Effect
\`\`\`typescript
opacity: animate({ from: 0, to: 1, duration: 1.0 })
\`\`\`

### Slide From Left
\`\`\`typescript
x: animate({ from: -500, to: 100, duration: 2.0, easing: 'easeOut' })
\`\`\`

### Scale Up
\`\`\`typescript
width: animate({ from: 0, to: 200, duration: 1.0 }),
height: animate({ from: 0, to: 200, duration: 1.0 })
\`\`\`

### Color Change
\`\`\`typescript
fill: animate({ from: color('red'), to: color('blue'), duration: 2.0 })
\`\`\`

### Bounce Effect
\`\`\`typescript
y: animate({ from: 0, to: 100, duration: 1.0, easing: 'bounce' })
\`\`\`

## Exporting Your Work

Once you've created an animation you like:

1. **Save your code** to a file: \`src/my-animation.ts\`
2. **Render it**:
   \`\`\`bash
   npx velox-video render src/my-animation.ts --output my-video.mp4
   \`\`\`
3. **Share the code** or video output

## Inspiration Gallery

Not sure what to create? Try these ideas:

- Animated logo reveal
- Social media post animation
- Data chart with animated bars
- Quote animation for YouTube
- Particle background effect
- Loading screen animation
- Product feature showcase
- Text kinetic typography

## Learn More

- Browse [Templates](./templates) for complete examples
- Use the [Prompt](./prompt) for AI-assisted coding
- Check [CLI commands](./cli) for running code
- Review [Getting Started](./getting-started) for fundamentals
- See [Preview Studio](./preview) for development workflow`,
  },
}

export function getDocsPage(slug: string[] = []): DocsPageConfig | undefined {
  const key = (slug.join('/') || '') as DocsSlug
  return DOCS_PAGES[key]
}

export function getDocsPages() {
  return Object.values(DOCS_PAGES)
}

export function getMarkdownUrl(page: DocsPageConfig) {
  return `${page.url}.mdx`
}

export function getGithubUrl(page: DocsPageConfig) {
  return `${GITHUB_BASE}/${page.sourcePath}`
}

export function getStaticParams() {
  return [{ slug: [] as string[] }, ...getDocsPages()
    .filter((page) => page.slug !== '')
    .map((page) => ({ slug: [page.slug] }))]
}

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
      <DocsBody>{renderDocsBody(page.slug)}</DocsBody>
    </>
  )
}

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
            {`pnpm create velox-video@latest
cd my-video
pnpm install`}
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
            The preview loop is where you validate pacing, spacing, and text contrast. It should
            be fast enough that changing copy is not a disruptive task.
          </p>
          <CodeBlock title="Preview">
            {`pnpm velox preview video.ts`}
          </CodeBlock>

          <SectionHeading id="render">Render</SectionHeading>
          <p>
            Only switch to render when the scene is stable. Rendering should be repeatable and
            deterministic.
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
            <li>
              <kbd>Space</kbd> play or pause.
            </li>
            <li>
              <kbd>ArrowLeft</kbd> and <kbd>ArrowRight</kbd> move through frames.
            </li>
            <li>
              <kbd>Shift</kbd> plus arrows moves faster through the timeline.
            </li>
            <li>
              <kbd>E</kbd> exports the current frame range when supported.
            </li>
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
            {`velox new my-video
velox preview video.ts
velox render video.ts --output result.mp4`}
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
    case 'prompt':
    case 'playground':
      const page = DOCS_PAGES[slug as 'templates' | 'prompt' | 'playground']
      return <Markdown>{page.markdown}</Markdown>
  }
}

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
