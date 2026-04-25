# Velox ⚡

An ultra-fast, zero-dependency motion graphics engine for Node.js and the Browser.

Velox allows you to define complex 2D animations, charts, text effects, and particle systems in code, and export them directly to H.264 MP4 without requiring heavy dependencies like Chrome, Puppeteer, or FFmpeg. 

It is designed to run anywhere — locally, on Vercel, or AWS Lambda.

## Quick Start

Create a new project instantly:

```bash
npx velox-video new my-video
cd my-video
```

### Live Preview

Velox features an ultra-fast Hot Module Replacement (HMR) Studio. Start the preview server:

```bash
npx velox-video preview video.ts
```

### Native Export

Compile your video to a highly-optimized H.264 MP4:

```bash
npx velox-video render video.ts --output result.mp4
```

## Features

- **Zero System Dependencies:** Uses a pre-compiled Rust Skia canvas and a WASM H.264 encoder. No more browser installations.
- **Physics-Based Engine:** Real spring math, true bezier curves, and deterministic physics.
- **Aesthetic First:** Beautiful built-in gradients, typography layouts, glassmorphism, and particle emitters.
- **React-Free:** Built using entirely vanilla TypeScript and math primitives. Zero bundling overhead.

## Example

```ts
import { createVideo, scene, text, shape } from '@velox-video/core'

export default createVideo({
  size: '1080p',
  fps: 30,
  background: '#06060f',
  scenes: [
    scene(4)
      .background(shape.gradient('160deg', '#0f0c29', '#302b63', '#24243e'))
      .add(
        text('Velox')
          .center()
          .size(84)
          .weight(800)
          .gradient('#ffffff', '#a78bfa')
          .in('slideUp', 0.6),
      ),
  ],
})
```

## LLM-First Example

```ts
import { createExplainerVideo } from '@velox-video/core'

export default createExplainerVideo({
  title: 'How AI Agents Work',
  duration: 60,
  aspectRatio: '9:16',
  theme: 'tech',
  sections: [
    { type: 'hook', heading: 'From Prompt to Workflow' },
    { type: 'problem', heading: 'Teams Lose Time', points: ['Manual work', 'Context switching'] },
    { type: 'process', heading: 'The Loop', steps: ['Input', 'Plan', 'Execute', 'Review'] },
    { type: 'stats', heading: 'Impact', stats: [{ label: 'Time Saved', value: '68%' }] },
    { type: 'cta', heading: 'Start With Structure' },
  ],
})
```

This layer is designed for small local models: short structured input, automatic scene pacing, reusable shots, aspect-ratio presets, and built-in cards/diagram helpers.

## Architecture

The engine is split into two packages:
- `@velox-video/core`: The pure math and generic canvas 2D frame calculator.
- `velox-video`: The CLI, Native MP4/GIF renderer, and Preview Studio.

## Website

The docs and landing page live in `packages/site` and are built around Fumadocs.

## License

MIT
