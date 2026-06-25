# Velox

**Write VML. Render MP4. Built for agents.**

Velox is an LLM-friendly motion graphics engine: define portrait reels and explainers in VML or TypeScript, preview locally, and export H.264 MP4 with a **native Canvas renderer** — no Chrome, Puppeteer, or browser farm.

```bash
npx velox-video new my-reel
cd my-reel
npx velox-video lint reel.vml
npx velox-video render reel.vml -o reel.mp4
```

## Why Velox

| | Velox | Browser/HTML pipelines |
|---|--------|-------------------------|
| Authoring | **VML** + TypeScript | HTML + CSS + GSAP |
| Renderer | Native Canvas + WASM encoders | Headless Chrome |
| Design | **`theme="…"`** aesthetics | Per-project CSS |
| Agent surface | `velox lint`, skills, templates | Varies |

Same input, deterministic frames — suitable for CI, batch renders, and agent loops.

## Quick start

```xml
<video size="portrait" fps="30" theme="apple" motionQuality="premium">
  <scene duration="6" template="centerCard" camera="slowPush">
    <hero slot="center" kicker="INTRO" title="Ship the story." subtitle="One theme. Every scene." />
    <captions slot="caption" text="Short caption." style="pill" start="0.5" />
  </scene>
</video>
```

```bash
velox lint reel.vml
velox render reel.vml -o reel.mp4
velox render reel.vml --draft    # fast half-res preview
```

## Themes

**51 built-in aesthetics** — brand packs, frame presets, motion styles, and legacy color tokens.

```xml
<video theme="stripe">
```

Browse swatches on the docs site: **`/themes`** · [Themes guide](packages/site/content/docs/themes.mdx) · `velox list themes`

Themes control canvas background, typography, cards, caption bars, grain, and vignette. Use `color="theme.accent"` instead of raw hex.

```bash
pnpm sync:aesthetics              # refresh DESIGN.md sources
pnpm generate:theme-previews      # regenerate gallery PNGs
```

## Features

- **VML-first** — XML-like markup tuned for small LLMs (`<hero>`, `<scene template="…">`, slots)
- **Reel production** — templates, captions (pill, karaoke, slam, clipWipe), charts, stock refs, SFX metadata
- **Native export** — `@napi-rs/canvas`, in-process MP4/GIF; optional ffmpeg for audio mux
- **Motion** — scene cameras, blur dissolves, Popmotion easing, D3 charts, Flubber morphs
- **CLI** — `new`, `preview`, `render`, `lint`, `add`, `list themes|blocks`
- **Agent skill** — `packages/velox-cli/skills/velox-reel-authoring`

## Packages

| Package | Role |
|---------|------|
| `@velox-video/core` | Compiler, aesthetics, Canvas draw engine |
| `velox-video` (CLI) | Preview studio, native render, catalog blocks |
| `@velox-video/site` | Docs + playground (Fumadocs / Next.js) |
| `@velox-video/svgl` | Logo assets for `<icon>` / brand cards |

## Docs

Run the site locally:

```bash
pnpm site:dev
```

Open `http://localhost:3000/docs` · [Getting started](packages/site/content/docs/getting-started.mdx) · [CLI](packages/site/content/docs/cli.mdx) · [Themes gallery](/themes)

## Examples

Sample reels: [`reels/matrix/`](reels/matrix/) — lint and render any `.vml` file.

## Inspiration

Velox themes are vendored from public design-system sources and adapted for 9:16 video:

- **[getdesign.md](https://getdesign.md/)** / [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) — brand `DESIGN.md` packs (Stripe, Linear, Notion, Vercel, …)
- **[HyperFrames](https://github.com/heygen-com/hyperframes)** — [frame.md](https://hyperframes.dev/design) video-first presets (`biennale-yellow`, `blockframe`, `cobalt-grid`, …)

Velox uses VML + native Canvas rather than HTML composition; we borrowed the **aesthetic model**, not the renderer.

## Security

The CLI loads and executes local video files as code. Only run trusted projects with `velox preview` and `velox render`.

## License

MIT
