# Velox

LLM-friendly motion graphics for Node.js and the browser.

Velox lets you define 2D videos with VML or TypeScript, preview them locally, and export H.264 MP4/GIF/PNG sequences without Chrome, Puppeteer, or FFmpeg. The core renderer is deterministic Canvas, so the same config can power the docs playground, local preview, and native export.

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

- **VML-first LLM workflow:** XML-like markup for reliable generation without brittle TypeScript chains.
- **Native rendering:** Uses `@napi-rs/canvas` and WASM encoders instead of Chrome/Puppeteer.
- **Premium motion controls:** Scene cameras, blur dissolves, vignette/grain overlays, and Popmotion-backed easing presets.
- **Charts and organic motion:** D3-backed bar/line/donut charts plus Flubber-backed morph blobs.
- **Color and brand systems:** Theme tokens, Culori/Chroma color helpers, and bundled SVGL logo rendering.
- **React-free core:** Plain TypeScript config and Canvas drawing primitives.

## VML Example

```ts
import { createVideoFromMarkup } from '@velox-video/core'

export default createVideoFromMarkup(`
<video size="portrait" fps="60" theme="creamChecks" background="creamGrid" motionQuality="premium">
  <scene duration="5" camera="slowPush" mood="editorial" transition="blurDissolve">
    <center motion="heroCinematic">
      <hero kicker="CASE STUDY" title="Great visuals feel alive" subtitle="Depth, rhythm, and smooth timing." />
    </center>
  </scene>
  <scene duration="5" background="warmPaper">
    <column gap="32" placement="center">
      <kicker color="theme.accent">DATA</kicker>
      <lineChart width="700" height="320" curve="smooth">
        <series label="A" values="12,38,29,72" color="theme.accent" />
        <series label="B" values="20,26,48,88" color="#22c55e" />
      </lineChart>
    </column>
  </scene>
</video>
`)
```

## TypeScript Example

```ts
import { createVideo, scene, text, shape, backdrops, motion } from '@velox-video/core'

export default createVideo({
  size: 'portrait',
  fps: 60,
  theme: 'obsidian',
  motionQuality: 'premium',
  background: backdrops.grid('rgba(255,255,255,0.05)', 44),
  scenes: [
    scene(4)
      .camera('slowPush')
      .mood('cinematic')
      .background(backdrops.aurora({ mood: 'violet' }))
      .add(
        motion.heroCinematic(
          text('Velox').center().size(96).weight(900).color('#ffffff')
        ),
        shape.morphBlob([
          'M50,4 C78,4 98,24 96,52 C94,82 72,96 46,94 C20,92 4,72 6,46 C8,20 24,4 50,4 Z',
          'M52,6 C80,10 94,34 88,60 C82,86 56,98 30,88 C6,78 4,48 16,26 C28,4 42,2 52,6 Z',
        ], { color: '#a78bfa' }).center().size(360).opacity(0.35),
      ),
  ],
})
```

## Architecture

The repo is split into four packages:
- `@velox-video/core`: The pure math and generic canvas 2D frame calculator.
- `velox-video`: The CLI, Native MP4/GIF renderer, and Preview Studio.
- `@velox-video/svgl`: Logo path assets and build tooling for logo rendering.
- `@velox-video/site`: Next.js docs site and playground.

## Security Note

The CLI loads and executes local video files as code (`export default createVideo(...)`).
Only run trusted local files with `velox preview` and `velox render`.

## Website

The docs and landing page live in `packages/site` and are built around Fumadocs.

## License

MIT
