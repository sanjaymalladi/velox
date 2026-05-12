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
```

## Commands

```bash
# Preview with hot reload
velox preview video.ts

# Render MP4
velox render video.ts --output result.mp4

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
  <scene duration="5" camera="slowPush" mood="editorial" transition="blurDissolve">
    <center motion="heroCinematic">
      <hero kicker="CASE STUDY" title="Fluid video generation" subtitle="VML keeps LLM output reliable." />
    </center>
  </scene>
</video>
`)
```

## Notes

The CLI executes local video files as code. Only preview or render files you trust.

## License

MIT
