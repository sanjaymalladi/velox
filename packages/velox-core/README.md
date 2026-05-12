# @velox-video/core

LLM-friendly motion graphics primitives for deterministic Canvas video rendering.

Velox Core powers the `velox-video` CLI and playground. It defines videos as serializable TypeScript configs, renders with Canvas in browser/Node, and exposes a VML compiler so small LLMs can produce reliable motion graphics without inventing brittle method chains.

## Install

```bash
npm install @velox-video/core
```

For rendering and previewing from the command line, install the CLI:

```bash
npm install -D velox-video
```

## VML First

VML is the recommended LLM format:

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

## TypeScript API

```ts
import { createVideo, scene, text, shape, backdrops, motion } from '@velox-video/core'

export default createVideo({
  size: 'portrait',
  fps: 60,
  theme: 'obsidian',
  motionQuality: 'premium',
  background: backdrops.grid('rgba(255,255,255,0.05)', 44),
  scenes: [
    scene(5)
      .camera('slowPush')
      .mood('cinematic')
      .background(backdrops.aurora({ mood: 'violet' }))
      .add(
        motion.heroCinematic(
          text('Velox').center().size(96).weight(900).color('#fff')
        ),
        shape.donutChart({
          data: [
            { label: 'Design', value: 45, color: '#a78bfa' },
            { label: 'Code', value: 55, color: '#38bdf8' },
          ],
        }).center({ offsetY: 260 }).size(320),
      ),
  ],
})
```

## Highlights

- Deterministic Canvas rendering for browser preview and native export.
- VML compiler for LLM-safe video generation.
- Scene-level camera controls: `slowPush`, `parallaxDrift`, `handheld`, `kenBurns`.
- Premium motion presets powered by Popmotion easing.
- D3-backed charts: bar, line, and donut charts.
- Flubber-backed morph blobs for organic motion accents.
- Color helpers powered by Culori and Chroma.
- Bundled SVGL logo path rendering through `@velox-video/svgl`.

## Public Exports

Common exports include:

- `createVideo`, `scene`
- `text`, `shape`, `image`, `logo`, `group`, `layout`
- `backdrops`, `typography`, `creativeCards`, `motion`, `colors`
- `createVideoFromMarkup`, `isVeloxMarkup`
- `drawFrame`, `getTotalFrames`, `preloadImages`

## License

MIT
