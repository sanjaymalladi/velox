#!/usr/bin/env tsx
/**
 * Sync DESIGN.md sources from getdesign.md (awesome-design-md) + HyperFrames frame.md,
 * then emit parsed/*.json and parsed/index.ts for the aesthetics registry.
 */
import fs from 'fs'
import path from 'path'
import { parseDesignMd } from '../packages/velox-core/src/aesthetics/parseDesignMd'

const ROOT = path.join(__dirname, '..', 'packages', 'velox-core')
const SOURCES = path.join(ROOT, 'aesthetics', 'sources')
const PARSED = path.join(ROOT, 'src', 'aesthetics', 'parsed')

const GETDESIGN_BASE =
  'https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md'

/** Repo folder slug → Velox theme id */
const GETDESIGN_SOURCES: { repoSlug: string; id: string }[] = [
  { repoSlug: 'apple', id: 'apple' },
  { repoSlug: 'notion', id: 'notion' },
  { repoSlug: 'dell-1996', id: 'dell-1996' },
  { repoSlug: 'stripe', id: 'stripe' },
  { repoSlug: 'linear.app', id: 'linear' },
  { repoSlug: 'vercel', id: 'vercel' },
  { repoSlug: 'spotify', id: 'spotify' },
  { repoSlug: 'supabase', id: 'supabase' },
  { repoSlug: 'claude', id: 'claude' },
  { repoSlug: 'figma', id: 'figma' },
  { repoSlug: 'sentry', id: 'sentry' },
  { repoSlug: 'runwayml', id: 'runway' },
  { repoSlug: 'shopify', id: 'shopify' },
  { repoSlug: 'cursor', id: 'cursor' },
  { repoSlug: 'raycast', id: 'raycast' },
  { repoSlug: 'framer', id: 'framer' },
  { repoSlug: 'voltagent', id: 'voltagent' },
  { repoSlug: 'wise', id: 'wise' },
  { repoSlug: 'tesla', id: 'tesla' },
]

/** HyperFrames frame.md gallery — metadata from hyperframes.dev design chunk */
const HF_FRAME_PALETTES: Record<
  string,
  { canvas: string; scene: string; primary: string; accent: string; ink: string; muted: string }
> = {
  'biennale-yellow': {
    canvas: '#F5F0E6',
    scene: '#FAF6EE',
    primary: '#F4C430',
    accent: '#F4C430',
    ink: '#1E2A5A',
    muted: '#6B6580',
  },
  blockframe: {
    canvas: '#FFFDF5',
    scene: '#FFFDF5',
    primary: '#111111',
    accent: '#FF4D6D',
    ink: '#111111',
    muted: '#444444',
  },
  'blue-professional': {
    canvas: '#F6F9FC',
    scene: '#FFFFFF',
    primary: '#0047AB',
    accent: '#2563EB',
    ink: '#0F172A',
    muted: '#64748B',
  },
  'bold-poster': {
    canvas: '#FDF6E3',
    scene: '#FDF6E3',
    primary: '#C1121F',
    accent: '#E63946',
    ink: '#1A1A1A',
    muted: '#5C5C5C',
  },
  broadside: {
    canvas: '#F5F0E8',
    scene: '#F5F0E8',
    primary: '#111111',
    accent: '#E85D04',
    ink: '#111111',
    muted: '#6B6B6B',
  },
  capsule: {
    canvas: '#FFF8F0',
    scene: '#FFF8F0',
    primary: '#7C3AED',
    accent: '#FF6B9D',
    ink: '#1F2937',
    muted: '#6B7280',
  },
  cartesian: {
    canvas: '#F7F3ED',
    scene: '#F7F3ED',
    primary: '#2C2C2C',
    accent: '#8B7355',
    ink: '#2C2C2C',
    muted: '#78716C',
  },
  'cobalt-grid': {
    canvas: '#FAF7F2',
    scene: '#FAF7F2',
    primary: '#0047AB',
    accent: '#1D4ED8',
    ink: '#0C1222',
    muted: '#64748B',
  },
  coral: {
    canvas: '#FFF5EE',
    scene: '#FFF5EE',
    primary: '#FF6F61',
    accent: '#FF6F61',
    ink: '#1A1A1A',
    muted: '#6B6B6B',
  },
  'creative-mode': {
    canvas: '#FFFBF5',
    scene: '#FFFBF5',
    primary: '#111111',
    accent: '#FF2D95',
    ink: '#111111',
    muted: '#555555',
  },
  'daisy-days': {
    canvas: '#FFF9E6',
    scene: '#FFF9E6',
    primary: '#2D3436',
    accent: '#FF7675',
    ink: '#2D3436',
    muted: '#636E72',
  },
  'editorial-forest': {
    canvas: '#F5F5F0',
    scene: '#F5F5F0',
    primary: '#1B4332',
    accent: '#E07A9F',
    ink: '#1B4332',
    muted: '#52796F',
  },
}

type HfFrame = {
  slug: string
  name: string
  tagline: string
  scheme: string
  density: string
  fonts: { headline: string; body: string }
}

const HF_FRAMES: HfFrame[] = [
  {
    slug: 'biennale-yellow',
    name: 'Biennale Yellow',
    tagline:
      'Warm parchment + solar yellow bloom, Instrument Serif display, indigo ink, 1px hairline rules',
    scheme: 'light',
    density: 'medium',
    fonts: { headline: 'Instrument Serif', body: 'Archivo' },
  },
  {
    slug: 'blockframe',
    name: 'BlockFrame',
    tagline: 'Maximalist neobrutalist — thick black borders, hard offset shadows, candy accents',
    scheme: 'light',
    density: 'high',
    fonts: { headline: 'Inter', body: 'Space Grotesk' },
  },
  {
    slug: 'blue-professional',
    name: 'Blue Professional',
    tagline: 'Corporate parchment + cobalt primary, Space Grotesk display, Inter body',
    scheme: 'light',
    density: 'medium',
    fonts: { headline: 'Space Grotesk', body: 'Inter' },
  },
  {
    slug: 'bold-poster',
    name: 'Bold Poster',
    tagline: 'Shrikhand tilted display + red accent on cream — magazine cover energy',
    scheme: 'light',
    density: 'high',
    fonts: { headline: 'Shrikhand', body: 'Libre Baskerville' },
  },
  {
    slug: 'broadside',
    name: 'Broadside',
    tagline: 'Industrial newsprint poster — raw cream on ink, Barlow display, fire-orange register',
    scheme: 'light',
    density: 'high',
    fonts: { headline: 'Barlow', body: 'IBM Plex Mono' },
  },
  {
    slug: 'capsule',
    name: 'Capsule',
    tagline: 'Pill-shaped editorial — cream paper, candy palette, Bodoni Moda serif headlines',
    scheme: 'light',
    density: 'medium',
    fonts: { headline: 'Bodoni Moda', body: 'Space Grotesk' },
  },
  {
    slug: 'cartesian',
    name: 'Cartesian',
    tagline: 'Minimal sparse layout — warm parchment, ink display type, taupe accents, hairline rules',
    scheme: 'light',
    density: 'low',
    fonts: { headline: 'Playfair Display', body: 'Inter' },
  },
  {
    slug: 'cobalt-grid',
    name: 'Cobalt Grid',
    tagline: 'Editorial parchment + cobalt grid system, Newsreader display, Hanken Grotesk reading',
    scheme: 'light',
    density: 'medium',
    fonts: { headline: 'Newsreader', body: 'Hanken Grotesk' },
  },
  {
    slug: 'coral',
    name: 'Coral',
    tagline: 'Bebas Neue uppercase headlines + coral on cream, Inter reading',
    scheme: 'light',
    density: 'medium',
    fonts: { headline: 'Bebas Neue', body: 'Inter' },
  },
  {
    slug: 'creative-mode',
    name: 'Creative Mode',
    tagline: 'Cream + saturated candy accents, Archivo Black display, JetBrains Mono data',
    scheme: 'light',
    density: 'high',
    fonts: { headline: 'Archivo Black', body: 'Space Grotesk' },
  },
  {
    slug: 'daisy-days',
    name: 'Daisy Days',
    tagline: 'Sunny-garden pastels, 3px charcoal outlines, hard offset shadows, Fredoka + Quicksand',
    scheme: 'light',
    density: 'medium',
    fonts: { headline: 'Fredoka', body: 'Quicksand' },
  },
  {
    slug: 'editorial-forest',
    name: 'Editorial Forest',
    tagline:
      'Green/pink/cream editorial triad, Source Serif 4 display, JetBrains Mono chrome, hairline rules',
    scheme: 'light',
    density: 'medium',
    fonts: { headline: 'Source Serif 4', body: 'JetBrains Mono' },
  },
]

/** HyperFrames visual-styles.md — video-tuned motion identities */
const HF_VISUAL_STYLES: {
  id: string
  name: string
  description: string
  colors: Record<string, string>
  fonts: { headline: string; body: string; displaySize: number; headlineWeight: number }
  dark: boolean
  neobrutal?: boolean
}[] = [
  {
    id: 'style-swiss-pulse',
    name: 'Swiss Pulse',
    description: 'Clinical grid-locked precision — Helvetica headlines, electric blue accent, data-forward.',
    colors: { primary: '#1a1a1a', 'on-primary': '#ffffff', accent: '#0066FF', canvas: '#ffffff', ink: '#1a1a1a', muted: '#64748b' },
    fonts: { headline: 'Helvetica Neue', body: 'Inter', displaySize: 56, headlineWeight: 700 },
    dark: false,
  },
  {
    id: 'style-velvet-standard',
    name: 'Velvet Standard',
    description: 'Premium enterprise luxury — wide-track uppercase, deep navy accent, slow glides.',
    colors: { primary: '#0a0a0a', 'on-primary': '#ffffff', accent: '#1a237e', canvas: '#0a0a0a', ink: '#f8fafc', muted: 'rgba(248,250,252,0.65)' },
    fonts: { headline: 'Inter', body: 'Inter', displaySize: 52, headlineWeight: 300 },
    dark: true,
  },
  {
    id: 'style-deconstructed',
    name: 'Deconstructed',
    description: 'Industrial punk energy — Space Grotesk slam, burnt orange accent, glitch-ready.',
    colors: { primary: '#1a1a1a', 'on-primary': '#f0f0f0', accent: '#D4501E', canvas: '#1a1a1a', ink: '#f0f0f0', muted: '#a3a3a3' },
    fonts: { headline: 'Space Grotesk', body: 'Space Mono', displaySize: 52, headlineWeight: 700 },
    dark: true,
    neobrutal: true,
  },
  {
    id: 'style-maximalist-type',
    name: 'Maximalist Type',
    description: 'Paula Scher poster energy — Anton display, red/yellow accents, kinetic launches.',
    colors: { primary: '#0a0a0a', 'on-primary': '#ffffff', accent: '#E63946', 'accent-yellow': '#FFD60A', canvas: '#0a0a0a', ink: '#ffffff', muted: '#d4d4d4' },
    fonts: { headline: 'Anton', body: 'Space Grotesk', displaySize: 64, headlineWeight: 400 },
    dark: true,
    neobrutal: true,
  },
  {
    id: 'style-data-drift',
    name: 'Data Drift',
    description: 'Refik Anadol futurism — thin Inter, purple/cyan accents, particle-field mood.',
    colors: { primary: '#0a0a0a', 'on-primary': '#e0e0e0', accent: '#7c3aed', 'accent-cyan': '#06b6d4', canvas: '#0a0a0a', ink: '#e0e0e0', muted: 'rgba(224,224,224,0.55)' },
    fonts: { headline: 'Inter', body: 'Inter', displaySize: 48, headlineWeight: 200 },
    dark: true,
  },
  {
    id: 'style-soft-signal',
    name: 'Soft Signal',
    description: 'Warm humanist editorial — Playfair italic headlines, amber/rose/sage accents.',
    colors: { primary: '#FFF8EC', 'on-primary': '#2a2a2a', accent: '#F5A623', canvas: '#FFF8EC', ink: '#2a2a2a', muted: '#78716c' },
    fonts: { headline: 'Playfair Display', body: 'Inter', displaySize: 50, headlineWeight: 400 },
    dark: false,
  },
  {
    id: 'style-folk-frequency',
    name: 'Folk Frequency',
    description: 'Cultural festive joy — Fredoka headlines, candy multi-accent, playful motion.',
    colors: { primary: '#ffffff', 'on-primary': '#1a1a1a', accent: '#FF1493', canvas: '#ffffff', ink: '#1a1a1a', muted: '#6b7280' },
    fonts: { headline: 'Fredoka One', body: 'Nunito', displaySize: 52, headlineWeight: 400 },
    dark: false,
  },
  {
    id: 'style-shadow-cut',
    name: 'Shadow Cut',
    description: 'Film noir cinematic — Oswald uppercase, blood-red accent, deep vignette.',
    colors: { primary: '#0a0a0a', 'on-primary': '#f0f0f0', surface: '#3a3a3a', accent: '#C1121F', canvas: '#0a0a0a', ink: '#f0f0f0', muted: '#a8a29e' },
    fonts: { headline: 'Oswald', body: 'Inter', displaySize: 52, headlineWeight: 700 },
    dark: true,
  },
]

function writeDesignMd(id: string, body: string) {
  const dir = path.join(SOURCES, id)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'DESIGN.md'), body, 'utf8')
}

function frameToDesignMd(frame: HfFrame): string {
  const pal = HF_FRAME_PALETTES[frame.slug]!
  const displayWeight = frame.density === 'high' ? 800 : frame.slug === 'cartesian' ? 400 : 700
  return `---
version: alpha
name: ${frame.name}
description: HyperFrames frame.md preset — ${frame.tagline}

colors:
  canvas: "${pal.canvas}"
  canvas-soft: "${pal.scene}"
  primary: "${pal.primary}"
  accent: "${pal.accent}"
  ink: "${pal.ink}"
  body: "${pal.ink}"
  body-muted: "${pal.muted}"
  on-primary: "#ffffff"
  hairline: "rgba(15,23,42,0.12)"

typography:
  hero-display:
    fontFamily: "${frame.fonts.headline}"
    fontSize: 56px
    fontWeight: ${displayWeight}
    lineHeight: 1.05
    letterSpacing: -0.5px
  display-lg:
    fontFamily: "${frame.fonts.headline}"
    fontSize: 44px
    fontWeight: ${displayWeight}
    lineHeight: 1.08
    letterSpacing: -0.3px
  subtitle:
    fontFamily: "${frame.fonts.body}"
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  body:
    fontFamily: "${frame.fonts.body}"
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  caption:
    fontFamily: "${frame.fonts.body}"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: 0
  caption-strong:
    fontFamily: "${frame.fonts.body}"
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 2px
`
}

function visualStyleToDesignMd(style: (typeof HF_VISUAL_STYLES)[number]): string {
  const canvas = style.colors.canvas ?? (style.dark ? '#0a0a0a' : '#ffffff')
  const ink = style.colors.ink ?? (style.dark ? '#f0f0f0' : '#111111')
  return `---
version: alpha
name: ${style.name}
description: ${style.description}

colors:
${Object.entries(style.colors)
  .map(([k, v]) => `  ${k}: "${v}"`)
  .join('\n')}

typography:
  hero-display:
    fontFamily: "${style.fonts.headline}"
    fontSize: ${style.fonts.displaySize}px
    fontWeight: ${style.fonts.headlineWeight}
    lineHeight: 1.06
    letterSpacing: -0.4px
  display-lg:
    fontFamily: "${style.fonts.headline}"
    fontSize: ${Math.round(style.fonts.displaySize * 0.78)}px
    fontWeight: ${style.fonts.headlineWeight}
    lineHeight: 1.1
    letterSpacing: -0.3px
  subtitle:
    fontFamily: "${style.fonts.body}"
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  body:
    fontFamily: "${style.fonts.body}"
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  caption:
    fontFamily: "${style.fonts.body}"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: 0
  caption-strong:
    fontFamily: "${style.fonts.body}"
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 2px
`
}

async function fetchGetdesign(repoSlug: string, id: string) {
  const url = `${GETDESIGN_BASE}/${repoSlug}/DESIGN.md`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`)
  const md = await res.text()
  writeDesignMd(id, md)
  console.log(`fetched getdesign ${id}`)
}

function emitParsed(ids: string[]) {
  fs.mkdirSync(PARSED, { recursive: true })
  const valid: string[] = []
  for (const id of ids) {
    const mdPath = path.join(SOURCES, id, 'DESIGN.md')
    if (!fs.existsSync(mdPath)) {
      console.warn(`skip parse — missing ${id}`)
      continue
    }
    const parsed = parseDesignMd(fs.readFileSync(mdPath, 'utf8'))
    if (Object.keys(parsed.colors).length < 2) {
      console.warn(`skip parse — weak colors for ${id}`)
      continue
    }
    fs.writeFileSync(path.join(PARSED, `${id}.json`), `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')
    valid.push(id)
    console.log(`parsed ${id} (${Object.keys(parsed.colors).length} colors)`)
  }

  const imports = valid.map((id) => `import ${safeVar(id)} from './${id}.json'`).join('\n')
  const entries = valid.map((id) => `  '${id}': ${safeVar(id)},`).join('\n')
  const indexTs = `/** Auto-generated by scripts/sync-aesthetics.ts — do not edit. */\n${imports}\n\nexport const parsedDesignSources = {\n${entries}\n} as const\n\nexport type ParsedDesignId = keyof typeof parsedDesignSources\n`
  fs.writeFileSync(path.join(PARSED, 'index.ts'), indexTs, 'utf8')
  console.log(`wrote parsed/index.ts (${valid.length} themes)`)
}

function safeVar(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_')
}

async function main() {
  for (const { repoSlug, id } of GETDESIGN_SOURCES) {
    try {
      await fetchGetdesign(repoSlug, id)
    } catch (e) {
      console.error(`getdesign ${id}:`, (e as Error).message)
    }
  }

  for (const frame of HF_FRAMES) {
    writeDesignMd(frame.slug, frameToDesignMd(frame))
    console.log(`wrote hyperframes frame ${frame.slug}`)
  }

  for (const style of HF_VISUAL_STYLES) {
    writeDesignMd(style.id, visualStyleToDesignMd(style))
    console.log(`wrote hyperframes style ${style.id}`)
  }

  const allIds = [
    ...GETDESIGN_SOURCES.map((s) => s.id),
    ...HF_FRAMES.map((f) => f.slug),
    ...HF_VISUAL_STYLES.map((s) => s.id),
  ]
  emitParsed([...new Set(allIds)])
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
