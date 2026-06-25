---
name: velox-reel-authoring
description: Author Velox VML product reels for native canvas render. Use when writing .vml files, velox render/lint, reel scenes, captions, themes, or motion graphics for LLM-generated video.
---

# Velox Reel Authoring

Velox renders **deterministic MP4** from **VML markup** (not HTML). Small models should prefer high-level tags over raw coordinates.

## Workflow (always)

1. Pick `theme="…"` on `<video>` (locks colors, cards, captions).
2. Use `<scene template="…" duration="…">` with **slots** (`slot="top|visual|caption|center"`).
3. Prefer semantic components: `<hero>`, `<announcement>`, `<problemSolution>`, `<featureReveal>`, `<metricRow>`, `<ranking>`, `<finalCTA>`.
4. Run `velox lint reel.vml` before `velox render reel.vml`.
5. Use `velox add <block>` for catalog snippets (code-typing, stat-counter, etc.).

## Minimal reel skeleton

```xml
<video size="portrait" fps="30" theme="apple" motionQuality="premium">
  <scene duration="6" template="centerCard" camera="slowPush" mood="neutral">
    <hero slot="center" kicker="INTRO" title="Your headline." subtitle="One line of proof." motion="heroCinematic" />
    <captions slot="caption" text="Short caption line." style="pill" start="0.5" />
  </scene>
</video>
```

## Themes (`theme="…"`)

Set **one** `theme` on `<video>`. Do not invent hex when a theme is set — use `color="theme.text"` / `theme.muted` / `theme.accent`.

- Browse interactively: `/docs/themes` — dropdown updates 9 scenario previews (shadcn-style)
- Share a look: `/docs/themes?theme=stripe`
- CLI: `velox list themes`
- Common starters: `apple`, `notion`, `stripe`, `linear`, `glassmorphism`, `biennale-yellow`, `blockframe`

Do **not** use `frame.md` or paste external design files — themes are built into Velox.

## Scene templates

| Template | Layout |
|----------|--------|
| `centerCard` | Hero/content centered (most scenes) |
| `topTextBottomVisual` | Announcement top + stock/visual below |
| `splitLeftRight` | Two columns (launch + visual) |
| `threeBeatReveal` | Feature list center |
| `headlineThenProof` | Headline top, proof bottom |

Always set `slot="…"` on children when using a template.

## Captions (`<captions>`)

```xml
<captions slot="caption" text="Word by word energy." style="pill" start="0.5" />
```

| Style | Effect |
|-------|--------|
| `pill` | Black/colored bar, tight word row |
| `karaoke` | Active word highlight |
| `wordPop` | Uppercase pop per word |
| `highlightKeywords` | Emphasize short tokens |
| `slam` | One fullscreen word at a time |
| `clipWipe` | Left-to-right word reveal |
| `weightShift` | Alternating light/bold weights |
| `plain` | Simple fade |

Keep caption text **short** (under ~8 words) for portrait reels.

## Variables

```xml
<hero title="{{productName}}" … />
```

Set `VELOX_PRODUCTNAME=Nova` env var or pass variables at compile time.

## Scene transitions

Set on the **outgoing** scene (how the next scene enters):

```xml
<scene duration="6" transition="blurDissolve" transitionDuration="0.6">…</scene>
<scene duration="5" transition="wipe" transitionDuration="0.4">…</scene>
```

| Type | Best for |
|------|----------|
| `blurDissolve` | SaaS / product reels |
| `zoomSmooth` | Launch energy |
| `wipe` | Hard scene change |
| `crossDissolve` | Editorial calm |

`transitionDuration` must be **less than** scene `duration`. See docs for full list (`glitch`, `flash`, `slide`, `zoom`).

## Audio

```xml
<video music="track.mp3" musicVolume="0.35">
  <scene …>
    <sfx name="whoosh" at="0.4" volume="0.7" />
  </scene>
</video>
```

Place `sfx/whoosh.mp3` beside the VML. Velox muxes with ffmpeg (bundled static binary — no system install required).

## Common mistakes

- **Missing `slot`** → elements overlap at center incorrectly.
- **No `template`** on dense scenes → too much empty vertical space; use `centerCard` and fill slots.
- **Long caption strings** → words spread awkwardly; shorten copy.
- **Skipping lint** → wasted render time on typos.
- **Mixing themes** → one `theme` per `<video>` only.

## CLI

```bash
velox lint reel.vml
velox lint reel.vml --strict
velox render reel.vml -o out.mp4
velox render reel.vml --draft          # fast preview
velox list themes
velox list blocks
velox add stat-counter
```

## Catalog blocks

Install with `velox add code-typing` etc., paste snippet inside a `<scene>`.

## Do not

- Use HTML, React, or GSAP — Velox is VML + native canvas.
- Set arbitrary pixel positions unless necessary — use templates + slots.
