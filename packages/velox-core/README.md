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
  <scene duration="4.8" template="topTextBottomVisual" camera="slowPush" mood="editorial" transition="blurDissolve">
    <announcement slot="top" title="Launch reels from markup" subtitle="Templates, captions, assets, cards, and beats." badge="NEW" motion="heroCinematic" />
    <asset slot="visual" name="phone-frame" width="360" height="640" motion="driftIn" />
    <captions slot="caption" text="Launch reels from markup with safe VML." style="karaoke" />
  </scene>
  <scene duration="5.5" template="headlineThenProof" background="warmPaper" camera="slowPush" mood="editorial">
    <breakingNews slot="top" headline="No-key media starts free-first" ticker="Generated fallback, local, Wikipedia, Unsplash Source, OpenBrand metadata." tone="warning" />
    <githubRepo slot="visual" owner="sanjaymalladi" repo="velox" motion="driftIn" />
    <icon slot="overlay" name="github" size="104" motion="magneticPop" />
  </scene>
</video>
`)
```

## Reel VML Surface

Core now includes a reel production layer designed for AI-generated shorts:

- Scene templates and slots: `template="topTextBottomVisual"` plus `slot="top|visual|caption|overlay|left|right"`.
- Semantic components: `<announcement>`, `<launchCard>`, `<breakingNews>`, `<featureReveal>`, `<problemSolution>`, `<beforeAfter>`, `<quoteCard>`, `<ranking>`, `<countdown>`, `<finalCTA>`.
- Captions: `<captions text="..." style="karaoke|pill|wordPop|highlightKeywords" />` and timed `<caption at="..." dur="...">...</caption>`.
- Built-in transparent SVG assets/icons: `<asset name="phone-frame" />`, `<asset name="new-badge" />`, `<icon name="github" />`.
- Media placeholders for CLI preprocessing: `<stock provider="wikipedia" query="..." />`, `<githubRepo />`, `<npmPackage />`, `<brandCard />`, `<website />`.
- Audio timeline metadata: root `music`, `<audio>`, `<sfx>`, and `<beat>` compile to `audioPlan` for future muxing; current MP4 export is silent.

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
- Reel templates, captions, semantic components, local transparent SVG assets, generated cards, and stock/media placeholder refs.

## Public Exports

Common exports include:

- `createVideo`, `scene`
- `text`, `shape`, `image`, `logo`, `group`, `layout`
- `backdrops`, `typography`, `creativeCards`, `motion`, `colors`
- `createVideoFromMarkup`, `isVeloxMarkup`
- `drawFrame`, `getTotalFrames`, `preloadImages`, `setImageCache`
- `encodeVeloxStockRef`, `encodeVeloxCardRef`, `decodeVeloxStockRef`, `decodeVeloxCardRef`
- `parseSrt`, `splitWords`, `buildCaptionWordSpans`

## License

MIT
