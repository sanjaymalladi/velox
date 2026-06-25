'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  createVideoFromMarkup,
  drawFrame,
  preloadImages,
  setImageCache,
} from '@velox-video/core'
import type { VeloxVideoConfig } from '@velox-video/core'
import type { ThemeEntry } from './themesManifest.shared'
import { categoryLabel } from './themesManifest.shared'
import { CopyButton } from './CopyButton'

/** Half-scale portrait — enough for layout fidelity without 9× full-res draws. */
const RENDER_W = 360
const RENDER_H = 640
const PREVIEW_FPS = 30
const THEME_RENDER_DEBOUNCE_MS = 150

/** Serialize preview draws — shared image cache is global in drawFrame. */
let previewRenderQueue = Promise.resolve()

function enqueuePreviewRender(task: () => Promise<void>): Promise<void> {
  const run = previewRenderQueue.then(task)
  previewRenderQueue = run.catch(() => {})
  return run
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0)
    })
  })
}

function scenarioVml(theme: string, sceneAttrs: string, sceneBody: string): string {
  return `<video size="portrait" fps="${PREVIEW_FPS}" theme="${theme}" background="theme.canvas" motionQuality="standard">
  <scene duration="4" background="theme.canvas" ${sceneAttrs}>
${sceneBody}
  </scene>
</video>`
}

type Scenario = {
  id: string
  name: string
  description: string
  frame: number
  buildVml: (themeId: string) => string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'hero',
    name: 'Hero',
    description: 'Kicker, headline, subtitle — centerCard',
    frame: Math.round(1.8 * PREVIEW_FPS),
    buildVml: (theme) => scenarioVml(theme, 'template="centerCard" camera="none" mood="neutral"', `    <hero slot="center" kicker="INTRO" title="Ship the story." subtitle="Display type and accent from one token." motion="heroCinematic" />
    <captions slot="caption" text="Caption pill below." style="pill" start="0.4" />`),
  },
  {
    id: 'launch',
    name: 'Launch',
    description: 'Announcement badge + proof card',
    frame: Math.round(2 * PREVIEW_FPS),
    buildVml: (theme) => scenarioVml(theme, 'template="topTextBottomVisual" camera="none" mood="neutral"', `    <announcement slot="top" title="Nova Workspace" subtitle="One app. Every workflow." badge="NEW" tone="success" motion="heroCinematic" />
    <card slot="visual" width="440" height="480" radius="20" motion="softReveal">
      <column gap="12">
        <metricRow gap="10">
          <metric value="98%" label="Retention" motion="magneticPop" delay="0.1" />
          <metric value="4.9" label="Rating" motion="magneticPop" delay="0.18" />
        </metricRow>
        <text value="Card surfaces inherit theme tokens." size="17" color="theme.muted" wrap="380" />
      </column>
    </card>
    <captions slot="caption" text="Launch announcement layout." style="pill" start="0.25" />`),
  },
  {
    id: 'problem',
    name: 'Problem → Solution',
    description: 'Editorial two-beat narrative',
    frame: Math.round(2 * PREVIEW_FPS),
    buildVml: (theme) => scenarioVml(theme, 'template="centerCard" camera="none" mood="neutral"', `    <problemSolution slot="center" problem="Tabs everywhere. Context nowhere." solution="One canvas that follows your work." motion="softReveal" />
    <captions slot="caption" text="Problem solution block." style="highlightKeywords" start="0.35" />`),
  },
  {
    id: 'data',
    name: 'Data',
    description: 'Metrics + line chart',
    frame: Math.round(2.4 * PREVIEW_FPS),
    buildVml: (theme) => scenarioVml(theme, 'template="centerCard" camera="none" mood="neutral"', `    <column slot="center" gap="12">
      <kicker>TRACTION</kicker>
      <text value="Signups compounding." size="34" weight="900" color="theme.text" wrap="420" />
      <metricRow gap="10">
        <metric value="10×" label="Velocity" motion="magneticPop" delay="0.1" />
        <metric value="2.4s" label="Render" motion="magneticPop" delay="0.18" />
      </metricRow>
      <lineChart width="400" height="130" curve="smooth" motion="drawIn">
        <series label="Growth" values="10,22,38,62,88" color="theme.accent" />
      </lineChart>
    </column>
    <captions slot="caption" text="Charts use theme.accent." style="pill" start="0.3" />`),
  },
  {
    id: 'features',
    name: 'Features',
    description: 'Three-beat feature list',
    frame: Math.round(2.2 * PREVIEW_FPS),
    buildVml: (theme) => scenarioVml(theme, 'template="threeBeatReveal" camera="none" mood="neutral" staggerStep="0.12"', `    <featureReveal slot="center" title="Why teams switch" caption="Three reasons." motion="premiumSlide">
      <item>Unified inbox and docs</item>
      <item>AI summaries on demand</item>
      <item>Offline-first sync</item>
    </featureReveal>
    <captions slot="caption" text="Feature list styling." style="wordPop" start="0.5" />`),
  },
  {
    id: 'ranking',
    name: 'Ranking',
    description: 'Numbered list card',
    frame: Math.round(2 * PREVIEW_FPS),
    buildVml: (theme) => scenarioVml(theme, 'template="centerCard" camera="none" mood="neutral"', `    <ranking slot="center" title="Launch highlights" motion="premiumSlide">
      <item>Private beta to 500 teams</item>
      <item>SOC 2 certified</item>
      <item>Mobile ships day one</item>
    </ranking>
    <captions slot="caption" text="Ranking rows and accents." style="plain" start="0.4" />`),
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'Social proof card',
    frame: Math.round(1.6 * PREVIEW_FPS),
    buildVml: (theme) => scenarioVml(theme, 'template="centerCard" camera="none" mood="neutral"', `    <quoteCard slot="center" quote="This theme makes every scene feel intentional." motion="softReveal" />
    <captions slot="caption" text="Quote card surface." style="plain" start="0.35" />`),
  },
  {
    id: 'captions',
    name: 'Captions',
    description: 'Karaoke word highlight',
    frame: Math.round(2 * PREVIEW_FPS),
    buildVml: (theme) => scenarioVml(theme, 'template="centerCard" camera="none" mood="neutral"', `    <hero slot="center" kicker="CAPTIONS" title="Readable on mobile." subtitle="Bar color follows theme." motion="softReveal" />
    <captions slot="caption" text="Word by word energy here." style="karaoke" start="0.3" />`),
  },
  {
    id: 'cta',
    name: 'Final CTA',
    description: 'Closing call to action',
    frame: Math.round(1.4 * PREVIEW_FPS),
    buildVml: (theme) => scenarioVml(theme, 'template="centerCard" camera="none" mood="neutral"', `    <finalCTA slot="center" title="Ready to ship?" subtitle="One theme for the whole reel." cta="Get started" motion="magneticPop" />
    <captions slot="caption" text="CTA button uses accent." style="karaoke" start="0.4" />`),
  },
]

const configCache = new Map<string, VeloxVideoConfig>()

function getScenarioConfig(themeId: string, scenario: Scenario): VeloxVideoConfig {
  const key = `${themeId}:${scenario.id}`
  const hit = configCache.get(key)
  if (hit) return hit
  const config = createVideoFromMarkup(scenario.buildVml(themeId)).config
  configCache.set(key, config)
  if (configCache.size > 512) {
    const oldest = configCache.keys().next().value
    if (oldest) configCache.delete(oldest)
  }
  return config
}

function groupThemes(themes: ThemeEntry[]) {
  const order = ['brand', 'frame', 'motion', 'builtin', 'legacy']
  const groups = new Map<string, ThemeEntry[]>()
  for (const t of themes) {
    const list = groups.get(t.category) ?? []
    list.push(t)
    groups.set(t.category, list)
  }
  return order
    .filter((c) => groups.has(c))
    .map((c) => ({
      category: c,
      label: categoryLabel(c),
      items: (groups.get(c) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
    }))
}

const ScenarioCard = memo(function ScenarioCard({
  scenario,
  renderThemeId,
  canvasColor,
  renderGeneration,
}: {
  scenario: Scenario
  renderThemeId: string
  canvasColor: string
  renderGeneration: number
}) {
  const rootRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { rootMargin: '120px', threshold: 0.05 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) {
      setStatus('idle')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    const generation = renderGeneration
    setStatus('loading')

    const run = async () => {
      await enqueuePreviewRender(async () => {
        if (cancelled || generation !== renderGeneration) return
        await yieldToBrowser()
        if (cancelled || generation !== renderGeneration) return

        try {
          const config = getScenarioConfig(renderThemeId, scenario)
          canvas.width = RENDER_W
          canvas.height = RENDER_H
          const cache = await preloadImages(config)
          if (cancelled || generation !== renderGeneration) return
          setImageCache(cache)
          const ctx = canvas.getContext('2d', { alpha: false })
          if (!ctx) return
          drawFrame(ctx, config, scenario.frame, RENDER_W, RENDER_H)
          if (!cancelled && generation === renderGeneration) setStatus('ready')
        } catch {
          if (cancelled || generation !== renderGeneration) return
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = canvasColor
            ctx.fillRect(0, 0, RENDER_W, RENDER_H)
            ctx.fillStyle = '#f87171'
            ctx.font = '16px sans-serif'
            ctx.fillText('Preview failed', 16, 32)
          }
          setStatus('error')
        }
      })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [visible, renderThemeId, scenario, canvasColor, renderGeneration])

  return (
    <article ref={rootRef} id={`scenario-${scenario.id}`} className="theme-scenario-card">
      <div className="theme-scenario-meta">
        <h3>{scenario.name}</h3>
        <p>{scenario.description}</p>
      </div>
      <div className="theme-scenario-canvas-wrap" style={{ background: canvasColor }}>
        {status === 'loading' && <span className="theme-scenario-loading">Rendering…</span>}
        {status === 'idle' && visible === false && (
          <span className="theme-scenario-loading theme-scenario-loading--idle">Scroll to preview</span>
        )}
        <canvas ref={canvasRef} className="theme-scenario-canvas" />
      </div>
    </article>
  )
})

function themeFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('theme')
}

export function ThemesExplorer({ themes }: { themes: ThemeEntry[] }) {
  const sorted = useMemo(() => [...themes].sort((a, b) => a.id.localeCompare(b.id)), [themes])
  const groups = useMemo(() => groupThemes(sorted), [sorted])

  const [themeId, setThemeId] = useState(() => {
    const fromUrl = themeFromUrl()
    if (fromUrl && sorted.some((t) => t.id === fromUrl)) return fromUrl
    return sorted.find((t) => t.id === 'stripe')?.id ?? sorted[0]?.id ?? 'stripe'
  })
  const [renderThemeId, setRenderThemeId] = useState(themeId)
  const [renderGeneration, setRenderGeneration] = useState(0)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    )
  }, [sorted, filter])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('theme', themeId)
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`)
  }, [themeId])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setRenderGeneration((g) => g + 1)
      setRenderThemeId(themeId)
    }, THEME_RENDER_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [themeId])

  const active = sorted.find((t) => t.id === themeId) ?? sorted[0]
  const activeIndex = sorted.findIndex((t) => t.id === themeId)
  const snippet = `<video theme="${themeId}" size="portrait">`

  const pickTheme = (id: string) => {
    setThemeId(id)
    setFilter('')
  }

  const stepTheme = (delta: number) => {
    if (activeIndex < 0) return
    const next = sorted[(activeIndex + delta + sorted.length) % sorted.length]
    pickTheme(next.id)
  }

  return (
    <div className="theme-explorer" id="theme-explorer">
      <div className="theme-explorer-panel">
        <div className="theme-explorer-controls">
          <input
            id="theme-search"
            className="theme-explorer-search"
            type="search"
            placeholder="Search themes…"
            aria-label="Search themes"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="theme-explorer-select-row">
            <button type="button" className="theme-explorer-step" onClick={() => stepTheme(-1)} aria-label="Previous theme">
              ←
            </button>
            <select
              id="theme-select"
              className="theme-explorer-select"
              value={themeId}
              onChange={(e) => pickTheme(e.target.value)}
              aria-label="Select theme"
            >
              {filter
                ? filtered.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.name}
                    </option>
                  ))
                : groups.map((g) => (
                    <optgroup key={g.category} label={g.label}>
                      {g.items.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} — {t.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
            </select>
            <button type="button" className="theme-explorer-step" onClick={() => stepTheme(1)} aria-label="Next theme">
              →
            </button>
          </div>
        </div>

        {active && (
          <div className="theme-explorer-meta">
            <div className="theme-explorer-meta-head">
              <div className="theme-explorer-theme-id">{active.id}</div>
              <span className="theme-row-badge">{categoryLabel(active.category)}</span>
              <span className="theme-explorer-theme-name">{active.name}</span>
            </div>
            <p className="theme-explorer-desc">{active.description}</p>
            <div className="theme-explorer-swatches">
              {(
                [
                  ['canvas', active.colors.canvas],
                  ['accent', active.colors.accent],
                  ['text', active.colors.text],
                ] as const
              ).map(([label, hex]) => (
                <div key={label} className="theme-swatch">
                  <span className="theme-swatch-chip" style={{ background: hex }} />
                  <span className="theme-swatch-label">{label}</span>
                  <code className="theme-swatch-hex">{hex}</code>
                </div>
              ))}
            </div>
            <div className="theme-explorer-actions">
              <code className="theme-explorer-snippet">{snippet}</code>
              <CopyButton value={snippet} label="Copy VML" />
              <CopyButton value={themeId} label="Copy id" />
              <CopyButton value={`/docs/themes?theme=${themeId}`} label="Copy link" />
            </div>
          </div>
        )}
      </div>

      <p className="theme-explorer-hint">
        Previews render on scroll — change theme to update visible cards. Share{' '}
        <code>?theme={themeId}</code>
      </p>

      <div className="theme-scenario-grid">
        {SCENARIOS.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            renderThemeId={renderThemeId}
            canvasColor={active?.colors.canvas ?? '#07080a'}
            renderGeneration={renderGeneration}
          />
        ))}
      </div>
    </div>
  )
}
