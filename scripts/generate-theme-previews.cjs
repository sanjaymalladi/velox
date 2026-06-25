#!/usr/bin/env node
/**
 * Theme preview PNGs — one portrait frame per theme.
 *
 * Layout (inspired by shadcn/ui theme tiles + Material component cards):
 *   TOP  → announcement (headline typography)
 *   BODY → card with metrics + chart + body copy
 *   BOTTOM → caption pill
 *
 * No meta copy ("51 themes") — every label describes UI parts, not Velox itself.
 */
const fs = require('node:fs')
const path = require('node:path')
const { createCanvas } = require('@napi-rs/canvas')
const { aestheticIds, resolveAesthetic, createVideoFromMarkup, drawFrame } = require('../packages/velox-core/dist/index.js')

const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'packages', 'site', 'public', 'themes')
const W = 540
const H = 960
const FPS = 30
const PREVIEW_FRAME = Math.round(2.4 * FPS)

const FRAME_SLUGS = new Set([
  'biennale-yellow', 'blockframe', 'blue-professional', 'bold-poster', 'broadside', 'capsule',
  'cartesian', 'cobalt-grid', 'coral', 'creative-mode', 'daisy-days', 'editorial-forest',
])
const BUILTIN = new Set(['glassmorphism', 'brutalism', 'neubrutalism', 'cyberpunk', 'editorial'])

function category(id) {
  if (id.startsWith('style-')) return 'motion'
  if (BUILTIN.has(id)) return 'builtin'
  if (FRAME_SLUGS.has(id)) return 'frame'
  if (['apple', 'notion', 'dell-1996', 'stripe', 'linear', 'vercel', 'spotify', 'supabase', 'claude',
    'figma', 'sentry', 'runway', 'shopify', 'cursor', 'raycast', 'framer', 'voltagent', 'wise', 'tesla'].includes(id)) {
    return 'brand'
  }
  return 'legacy'
}

function previewMarkup(themeId) {
  return `<video size="portrait" fps="${FPS}" theme="${themeId}" motionQuality="premium">
  <scene duration="4" template="topTextBottomVisual" camera="none" mood="neutral">
    <announcement slot="top" title="Ship the story." subtitle="Headlines inherit display type and accent." badge="PREVIEW" tone="neutral" motion="heroCinematic" />
    <card slot="visual" width="460" height="520" radius="22" motion="softReveal" delay="0.1">
      <column gap="12">
        <metricRow gap="10">
          <metric value="98%" label="Retention" motion="magneticPop" delay="0.15" />
          <metric value="4.9" label="Rating" motion="magneticPop" delay="0.22" />
        </metricRow>
        <lineChart width="400" height="120" curve="smooth" motion="drawIn">
          <series label="Growth" values="10,24,38,62,88" color="theme.accent" />
        </lineChart>
        <text value="Card surfaces, borders, and body copy pull from the same theme tokens." size="16" color="theme.muted" wrap="380" />
      </column>
    </card>
    <captions slot="caption" text="Caption pill at the bottom." style="pill" start="0.2" />
  </scene>
</video>`
}

globalThis.Path2D = createCanvas.Path2D ?? createCanvas.Path
fs.mkdirSync(OUT_DIR, { recursive: true })

const manifest = []

for (const id of aestheticIds) {
  const aesthetic = resolveAesthetic(id)
  const label = aesthetic.name ?? id
  const config = createVideoFromMarkup(previewMarkup(id)).config
  const cv = createCanvas(W, H)
  drawFrame(cv.getContext('2d'), config, PREVIEW_FRAME, W, H)
  fs.writeFileSync(path.join(OUT_DIR, `${id}.png`), cv.toBuffer('image/png'))

  manifest.push({
    id,
    name: label,
    description: aesthetic.description ?? '',
    category: category(id),
    preview: `/themes/${id}.png`,
    colors: {
      canvas: aesthetic.video?.canvas ?? aesthetic.theme.background,
      accent: aesthetic.theme.accent ?? aesthetic.theme.primary,
      text: aesthetic.theme.text,
    },
  })
  console.log('✓', id)
}

manifest.sort((a, b) => a.id.localeCompare(b.id))
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`\n${manifest.length} previews → ${OUT_DIR}`)
