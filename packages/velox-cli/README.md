# velox-video

CLI for previewing and rendering Velox motion graphics.

Use it with `@velox-video/core` to build deterministic Canvas videos, preview them locally, and export MP4/GIF/PNG sequence output without Chrome, Puppeteer, or FFmpeg.

## Install

```bash
npm install -D velox-video @velox-video/core
```

Or run directly:

```bash
npx velox-video preview video.ts
# or author pure markup on disk:
npx velox-video preview reel.vml
```

## Commands

```bash
# Preview with hot reload
velox preview video.ts
velox preview reel.vml

# Render MP4
velox render video.ts --output result.mp4
velox render reel.vml --output reel.mp4

# Validate + discover themes
velox lint reel.vml
velox list themes

# Render GIF
velox render video.ts --format gif --output result.gif

# Render PNG sequence
velox render video.ts --format png-sequence --output frames
```

## Example

```ts
import { createVideoFromMarkup } from '@velox-video/core'

export default createVideoFromMarkup(`
<video size="portrait" fps="60" theme="creamChecks" background="creamGrid" motionQuality="premium">
  <scene duration="4.8" template="topTextBottomVisual" camera="slowPush" mood="editorial" transition="blurDissolve">
    <announcement slot="top" title="Launch reels from markup" subtitle="Templates, captions, assets, cards, and beats." badge="NEW" motion="heroCinematic" />
    <asset slot="visual" name="phone-frame" width="360" height="640" motion="driftIn" />
    <captions slot="caption" text="Launch reels from markup with safe VML." style="karaoke" />
  </scene>
</video>
`)
```

Pure `.vml` files are supported too:

```xml
<video size="portrait" fps="60" theme="creamChecks" background="creamGrid" motionQuality="premium">
  <scene duration="5.5" template="headlineThenProof" background="warmPaper" camera="slowPush" mood="editorial">
    <breakingNews slot="top" headline="No-key media starts free-first" ticker="Generated fallback, local, Wikipedia, Unsplash Source, OpenBrand metadata." tone="warning" />
    <githubRepo slot="visual" owner="sanjaymalladi" repo="velox" motion="driftIn" />
    <icon slot="overlay" name="github" size="104" motion="magneticPop" />
    <captions slot="caption" text="Generated cards render before export and cache locally." style="highlightKeywords" />
  </scene>
</video>
```

## Notes

The CLI executes local video files as code. Only preview or render files you trust.

### VML (`*.vml`)

Pass a `.vml` file containing `<video>...</video>` markup directly to `preview` / `render` with no ES module boilerplate.

### Remote placeholders

`velox-stock:`, `velox-card:`, and `velox-web:` URLs emitted by `<stock/>`, `<githubRepo/>`, etc. resolve to cached assets under `.velox/cache/media` before rendering (offline SVG tiles for repo/npm/brand/site placeholders; Wikipedia / Unsplash-source attempt fetches).

### Audio timeline metadata

Music, `<audio/>`, `<sfx/>`, and `<beat/>` compile into config metadata. Final MP4 audio mux remains **planned** (silent export today — no FFmpeg bundled).

## License

MIT
