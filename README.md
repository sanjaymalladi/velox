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
- **Reel production layer:** VML templates, semantic announcement components, captions, transparent asset/icon primitives, generated cards, and stock/media placeholders.
- **Free-first media workflow:** Local/generated fallbacks first, optional no-key provider refs, and CLI-side cache materialization under `.velox/cache/media`.
- **React-free core:** Plain TypeScript config and Canvas drawing primitives.

## VML Example

```ts
import { createVideoFromMarkup } from '@velox-video/core'

export default createVideoFromMarkup(`
<video size="portrait" fps="60" theme="creamChecks" background="creamGrid" motionQuality="premium">
  <scene duration="4.8" template="topTextBottomVisual" camera="slowPush" mood="editorial" transition="blurDissolve">
    <announcement slot="top" title="Launch reels from markup" subtitle="Templates, captions, assets, cards, and beats." badge="NEW" motion="heroCinematic" />
    <asset slot="visual" name="phone-frame" width="360" height="640" motion="driftIn" />
    <captions slot="caption" text="Launch reels from markup with safe VML." style="karaoke" />
    <sfx name="whoosh" at="0.35" />
  </scene>
  <scene duration="5.5" template="headlineThenProof" background="warmPaper" camera="slowPush" mood="editorial">
    <breakingNews slot="top" headline="No-key media starts free-first" ticker="Generated fallback, local, Wikipedia, Unsplash Source, OpenBrand metadata." tone="warning" />
    <githubRepo slot="visual" owner="sanjaymalladi" repo="velox" motion="driftIn" />
    <icon slot="overlay" name="github" size="104" motion="magneticPop" />
  </scene>
</video>
`)
```

The CLI also accepts pure `.vml` files:

```bash
npx velox-video preview reel.vml
npx velox-video render reel.vml --output reel.mp4
```

## Complex VML Example

This example uses the reel production surface: templates, slots, semantic components, captions, generated card placeholders, stock refs, chart tags, SFX, and beat metadata.

```xml
<video size="portrait" fps="60" theme="creamChecks" background="creamGrid" motionQuality="premium" music="soundtrack.mp3" musicVolume="0.35">
  <scene duration="4.8" template="topTextBottomVisual" camera="slowPush" mood="editorial" transition="blurDissolve" staggerStep="0.14">
    <announcement slot="top" title="Launch reels from markup" subtitle="Templates, captions, assets, stock refs, cards, charts, and beat metadata." badge="NEW" tone="success" motion="heroCinematic" />
    <asset slot="visual" name="phone-frame" width="360" height="640" motion="driftIn" delay="0.2" />
    <captions slot="caption" text="Launch reels from markup with safe VML." style="karaoke" />
    <sfx name="whoosh" at="0.35" volume="0.8" />
    <beat at="0.5" />
  </scene>

  <scene duration="5.4" template="splitLeftRight" background="aurora:ocean" camera="parallaxDrift" mood="cinematic" transition="zoomSmooth">
    <featureReveal slot="left" title="Production pieces included" caption="High-level tags instead of fragile offsets." motion="premiumSlide">
      <item>caption styles</item>
      <item>transparent SVG assets</item>
      <item>stock provider refs</item>
      <item>generated cards</item>
    </featureReveal>
    <stock slot="right" query="developer coding at night" provider="generated" width="440" height="620" radius="32" motion="driftIn" />
  </scene>

  <scene duration="5.2" template="centerCard" background="mesh:violet" camera="kenBurns" mood="cinematic">
    <card slot="visual" width="900" height="720" radius="40" motion="softReveal">
      <column gap="26">
        <kicker color="theme.accent">DATA STORY</kicker>
        <lineChart width="720" height="260" curve="smooth" motion="drawIn">
          <series label="Prompt" values="18,30,46,64,78" color="theme.accent" />
          <series label="Render" values="8,18,36,62,92" color="#22c55e" />
        </lineChart>
        <donutChart size="260" motion="growUp">
          <slice label="Layout" value="35" color="theme.accent" />
          <slice label="Media" value="25" color="#38bdf8" />
          <slice label="Motion" value="40" color="#22c55e" />
        </donutChart>
      </column>
    </card>
  </scene>

  <scene duration="5.5" template="headlineThenProof" background="warmPaper" camera="slowPush" mood="editorial">
    <breakingNews slot="top" headline="No-key media starts free-first" ticker="Generated fallback, local, Wikipedia, Unsplash Source, OpenBrand metadata." tone="warning" />
    <githubRepo slot="visual" owner="sanjaymalladi" repo="velox" motion="driftIn" delay="0.25" />
    <icon slot="overlay" name="github" size="104" motion="magneticPop" delay="0.45" />
  </scene>
</video>
```

## Reel Production Surface

- Scene templates: `topTextBottomVisual`, `topVisualBottomText`, `splitLeftRight`, `centerCard`, `fullBleedMedia`, `headlineThenProof`, `threeBeatReveal`.
- Slots: `top`, `bottom`, `visual`, `caption`, `overlay`, `left`, `right`, `center`, `full`.
- Components: `<announcement>`, `<launchCard>`, `<breakingNews>`, `<featureReveal>`, `<problemSolution>`, `<beforeAfter>`, `<quoteCard>`, `<ranking>`, `<countdown>`, `<finalCTA>`.
- Captions: `<captions text="..." style="karaoke|pill|wordPop|highlightKeywords" />` and timed `<caption at="..." dur="...">...</caption>` children.
- Assets: `<asset name="phone-frame|new-badge|arrow-right|highlight-ring|star-burst" />` and `<icon name="github|npm|rss|discord" />`.
- Cards/capture refs: `<githubRepo>`, `<npmPackage>`, `<brandCard>`, `<website>`.
- Audio metadata: root `music`, `<audio>`, `<sfx>`, and `<beat>` compile into timeline metadata. MP4 audio muxing is staged; current renderer warns and exports silent video.

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
