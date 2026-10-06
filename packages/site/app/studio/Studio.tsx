'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createVideoFromMarkup,
  drawFrame,
  configToMarkup,
  getTotalFrames,
  parseCaptionTracks,
  WebGLComposer,
  DEFAULT_FX,
  preloadAesthetics,
  preloadHeavyDeps,
  type VeloxVideoConfig,
  type VeloxPosition,
  type SceneConfig,
  type FxSettings,
  type CaptionStyle,
  type CaptionTrack,
} from '@velox-video/core'
import { captureCanvasToWebm, muxAudioInBrowser } from './browserAudioMux'

const CAPTION_STYLES: CaptionStyle[] = [
  'plain', 'pill', 'karaoke', 'wordPop', 'highlightKeywords', 'slam', 'clipWipe',
  'weightShift', 'neon', 'gradient', 'outline', 'typewriter', 'bounce', 'lowerThird',
]

const SAMPLE = `<video size="portrait" fps="30" theme="obsidian" motionQuality="premium">
  <scene duration="4.5" template="topTextBottomVisual" camera="slowPush" mood="cinematic" transition="blurDissolve" transitionDuration="0.4">
    <announcement slot="top" title="This Week in AI" subtitle="The global AI race is accelerating." badge="BRIEF" motion="heroCinematic" />
    <asset slot="visual" name="phone-frame" width="300" height="520" motion="driftIn" />
    <captions slot="caption" text="This week in AI was dominated by one theme: the global AI race is accelerating." style="karaoke" />
  </scene>
  <scene duration="5.5" template="headlineThenProof" camera="slowPush" mood="editorial" transition="wipe" transitionDuration="0.35">
    <breakingNews slot="top" headline="China to unveil major AI strategy" ticker="World AI Conference, Shanghai — Xi to outline global AI governance." tone="warning" />
    <asset slot="visual" name="star-burst" width="320" height="320" motion="magneticPop" />
    <captions slot="caption" text="China is preparing to unveil a major AI strategy at the World AI Conference in Shanghai, where President Xi is expected to outline the country's vision for global AI governance." style="karaoke" />
  </scene>
  <scene duration="5" template="topTextBottomVisual" camera="kenBurns" mood="cinematic" transition="blurDissolve" transitionDuration="0.4">
    <announcement slot="top" title="Huawei Atlas 950 SuperPoD" subtitle="A new AI cluster, built on domestic tech." badge="HARDWARE" motion="pop" />
    <asset slot="visual" name="highlight-ring" width="360" height="360" motion="driftIn" />
    <captions slot="caption" text="Huawei will introduce its Atlas 950 SuperPoD — a powerful new AI computing system built with domestic technology, reducing dependence on U.S. chips." style="karaoke" />
  </scene>
  <scene duration="5" template="headlineThenProof" camera="slowPush" mood="editorial" transition="wipe" transitionDuration="0.35">
    <breakingNews slot="top" headline="AI is now a geopolitical race" ticker="Whoever controls the compute shapes the next generation of AI." tone="warning" />
    <asset slot="visual" name="star-burst" width="320" height="320" motion="magneticPop" />
    <captions slot="caption" text="AI is no longer just about building bigger models. It is becoming a geopolitical competition over computing power and infrastructure." style="karaoke" />
  </scene>
  <scene duration="4.5" template="centerCard" background="mesh:violet" transition="wipe" transitionDuration="0.35">
    <announcement slot="center" title="AI Appreciation Day" subtitle="Safety, transparency, responsible AI." badge="TODAY" motion="softReveal" />
    <captions slot="caption" text="Today marks AI Appreciation Day — with a sharper focus on safety, transparency, and ensuring AI benefits society." style="karaoke" />
  </scene>
  <scene duration="4" template="topTextBottomVisual" camera="slowPush" mood="cinematic" transition="blurDissolve" transitionDuration="0.4">
    <announcement slot="top" title="The AI race enters its next phase" subtitle="And it's moving faster than ever." badge="WRAP" motion="heroCinematic" />
    <asset slot="visual" name="phone-frame" width="300" height="520" motion="driftIn" />
    <captions slot="caption" text="AI is becoming the foundation of economic growth and national security. The race is entering its next phase — and moving faster than ever." style="karaoke" />
  </scene>
</video>`

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function positionSummary(p?: VeloxPosition): string {
  if (!p) return 'default'
  if (p.type === 'absolute') return `abs ${Math.round(p.x)}, ${Math.round(p.y)}`
  if (p.type === 'center') return `center (${p.offsetX ?? 0}, ${p.offsetY ?? 0})`
  return `named ${p.name}`
}

export default function Studio() {
  const [vml, setVml] = useState(SAMPLE)
  const [config, setConfig] = useState<VeloxVideoConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [selected, setSelected] = useState<{ scene: number; el: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'vml' | 'layers' | 'props' | 'captions'>('vml')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const composerRef = useRef<WebGLComposer | null>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTs = useRef(0)
  const dragRef = useRef<{ scene: number; el: number } | null>(null)
  const [fx, setFx] = useState<FxSettings>(DEFAULT_FX)
  const [selectedScenes, setSelectedScenes] = useState<number[]>([])
  const trimRef = useRef<{
    edge: 'l' | 'r'
    i: number
    startX: number
    startDur: number
    clipW: number
    prevDur: number
    sceneStart: number
    sceneEnd: number
  } | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)

  const SNAP_GRID = 0.5

  /** Snap an absolute timeline position to the nearest 0.5s grid line or beat (within 200ms). */
  const snapAbs = (abs: number): number => {
    const beats = config?.audioPlan?.beats ?? []
    let best = abs
    let bestD = Infinity
    const cands = [Math.round(abs / SNAP_GRID) * SNAP_GRID, ...beats]
    for (const c of cands) {
      const d = Math.abs(c - abs)
      if (d < bestD && d <= 0.2) {
        bestD = d
        best = c
      }
    }
    return best
  }

  /** Move a set of scene indices to sit before `target` (block move; order preserved). */
  const moveScenes = (indices: number[], target: number) => {
    const uniq = [...new Set(indices)]
    setConfig((prev) => {
      if (!prev) return prev
      const n = clone(prev)
      const sorted = [...uniq].sort((a, b) => a - b)
      const items = sorted.map((i) => n.scenes[i])
      for (let k = sorted.length - 1; k >= 0; k--) n.scenes.splice(sorted[k], 1)
      const before = sorted.filter((i) => i < target).length
      const insertAt = Math.max(0, Math.min(n.scenes.length, target - before))
      n.scenes.splice(insertAt, 0, ...items)
      return n
    })
    const sorted = [...uniq].sort((a, b) => a - b)
    const before = sorted.filter((i) => i < target).length
    const insertAt = Math.max(0, Math.min(scenes.length || 0, target - before))
    setSelectedScenes(sorted.map((_, k) => insertAt + k))
  }

  const onTrimDown = (e: React.PointerEvent, edge: 'l' | 'r', i: number) => {
    e.stopPropagation()
    const clip = (e.currentTarget as HTMLElement).parentElement
    const clipW = clip?.getBoundingClientRect().width ?? 1
    const start = cumulative[i]
    trimRef.current = {
      edge,
      i,
      startX: e.clientX,
      startDur: scenes[i].duration,
      clipW,
      prevDur: scenes[i - 1]?.duration ?? 0,
      sceneStart: start,
      sceneEnd: start + scenes[i].duration,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onTrimMove = (e: React.PointerEvent) => {
    const d = trimRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const pxPerSec = d.clipW / d.startDur
    const delta = dx / pxPerSec
    const MIN = 0.5
    const MAX = 30
    setConfig((prev) => {
      if (!prev) return prev
      const n = clone(prev)
      if (d.edge === 'r') {
        const absEnd = d.sceneStart + d.startDur + delta
        const nd = Math.max(MIN, Math.min(MAX, snapAbs(absEnd) - d.sceneStart))
        n.scenes[d.i].duration = nd
      } else {
        const absStart = d.sceneStart + delta
        const nd = Math.max(MIN, Math.min(MAX, d.sceneEnd - snapAbs(absStart)))
        if (d.i === 0) {
          n.scenes[0].duration = nd
        } else {
          const prevNew = d.prevDur + (d.startDur - nd)
          if (prevNew >= MIN) {
            n.scenes[d.i - 1].duration = prevNew
            n.scenes[d.i].duration = nd
          } else {
            n.scenes[d.i - 1].duration = MIN
            n.scenes[d.i].duration = Math.max(MIN, d.prevDur + d.startDur - MIN)
          }
        }
      }
      return n
    })
  }

  const onTrimUp = (e: React.PointerEvent) => {
    trimRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const addScene = (after: number) => {
    setConfig((prev) => {
      if (!prev) return prev
      const n = clone(prev)
      const base = n.scenes[after] ?? null
      const copy: SceneConfig = base
        ? clone(base)
        : {
            id: `scene_${Date.now()}`,
            duration: 3,
            elements: [
              {
                id: `el_${Date.now()}`,
                type: 'text',
                content: 'New scene',
                position: { type: 'center' },
              },
            ],
          }
      copy.id = `scene_${Date.now()}_${Math.floor(Math.random() * 1e4)}`
      copy.captions = undefined
      n.scenes.splice(after + 1, 0, copy)
      return n
    })
  }

  const deleteScenes = (indices: number[]) => {
    setConfig((prev) => {
      if (!prev) return prev
      const n = clone(prev)
      const sorted = [...new Set(indices)].sort((a, b) => b - a)
      for (const i of sorted) n.scenes.splice(i, 1)
      return n
    })
    setSelectedScenes([])
  }

  const onClipClick = (e: React.MouseEvent, i: number) => {
    if (e.metaKey || e.ctrlKey) {
      setSelectedScenes((sel) =>
        sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i],
      )
    } else {
      setSelectedScenes([i])
      seekToScene(i)
    }
  }

  // Initialise the WebGL post-FX composer once (falls back to Canvas2D if unavailable)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const comp = new WebGLComposer(canvas)
      composerRef.current = comp.ok ? comp : null
    } catch {
      composerRef.current = null
    }
  }, [])

  // Load the full (code-split) aesthetic catalog + heavy chart/morph deps.
  useEffect(() => {
    void preloadAesthetics()
    void preloadHeavyDeps()
  }, [])

  // Parse VML -> compiled config
  useEffect(() => {
    let cancelled = false
    void Promise.all([preloadAesthetics(), preloadHeavyDeps()]).then(() => {
      if (cancelled) return
      try {
        const v = createVideoFromMarkup(vml)
        setConfig(clone(v.config))
        setError(null)
        setFrame(0)
        setSelected(null)
        setSelectedScenes([])
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
    return () => { cancelled = true }
  }, [vml])

  const size = config?.size ?? [1080, 1920]
  const fps = config?.fps ?? 30
  const scenes = config?.scenes ?? []
  const sceneFrames = useMemo(
    () => scenes.map((s) => Math.max(1, Math.round(s.duration * fps))),
    [scenes, fps],
  )
  const totalFrames = config ? Math.max(1, getTotalFrames(config)) : 1

  const totalDur = totalFrames / fps
  const cumulative = useMemo(() => {
    const arr: number[] = []
    let accFrames = 0
    for (const s of scenes) {
      arr.push(accFrames / fps)
      const sceneFrames = Math.round(s.duration * fps)
      const transitionFrames = s.transition ? Math.round(s.transition.duration * fps) : 0
      accFrames += sceneFrames - transitionFrames
    }
    return arr
  }, [scenes, fps])
  const rulerTicks = useMemo(() => {
    const ticks: { t: number; beat: boolean }[] = []
    const beats = config?.audioPlan?.beats ?? []
    for (let t = 0; t <= totalDur + 1e-3; t += SNAP_GRID) ticks.push({ t, beat: false })
    for (const b of beats) if (b <= totalDur) ticks.push({ t: b, beat: true })
    return ticks
  }, [totalDur, config])

  const currentScene = useMemo(() => {
    for (let i = 0; i < scenes.length; i++) {
      const start = Math.round(cumulative[i] * fps)
      const end = start + sceneFrames[i]
      if (frame >= start && frame < end) return i
    }
    return Math.max(0, scenes.length - 1)
  }, [frame, cumulative, fps, sceneFrames, scenes.length])

  // Draw current frame (Canvas2D -> optional WebGL post-FX)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !config) return
    const comp = composerRef.current
    if (comp && comp.ok) {
      let off = offscreenRef.current
      if (!off) {
        off = document.createElement('canvas')
        offscreenRef.current = off
      }
      off.width = size[0]
      off.height = size[1]
      const octx = off.getContext('2d')
      if (!octx) return
      octx.clearRect(0, 0, size[0], size[1])
      try {
        drawFrame(octx, config, frame, size[0], size[1], { cpuFx: false })
      } catch {
        /* ignore transient draw errors while editing */
      }
      comp.setSize(size[0], size[1])
      const renderFx = config.fx ? { ...DEFAULT_FX, ...config.fx } : fx
      comp.draw(off, renderFx, frame / fps)
    } else {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, size[0], size[1])
      try {
        drawFrame(ctx, config, frame, size[0], size[1])
      } catch {
        /* ignore transient draw errors while editing */
      }
    }
  }, [config, frame, size, fx])

  // Playback loop
  useEffect(() => {
    if (!playing) return
    lastTs.current = performance.now()
    const tick = (ts: number) => {
      const dt = (ts - lastTs.current) / 1000
      lastTs.current = ts
      setFrame((f) => {
        const nf = f + Math.round(dt * fps)
        return nf >= totalFrames ? 0 : nf
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, fps, totalFrames])

  // Keyboard navigation / editing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.code === 'Space') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFrame((f) => Math.max(0, f - (e.shiftKey ? 10 : 1)))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFrame((f) => Math.min(totalFrames - 1, f + (e.shiftKey ? 10 : 1)))
      } else if (e.key === 'Home') {
        setFrame(0)
      } else if (e.key === 'End') {
        setFrame(totalFrames - 1)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedScenes.length) {
        e.preventDefault()
        deleteScenes(selectedScenes)
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setSelectedScenes(scenes.map((_, i) => i))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedScenes, totalFrames, scenes.length])

  // Pointer drag to move the selected element in the preview
  const onPointerDown = (e: React.PointerEvent) => {
    if (!selected || !canvasRef.current) return
    dragRef.current = selected
    canvasRef.current.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !canvasRef.current || !config) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * size[0]
    const y = ((e.clientY - rect.top) / rect.height) * size[1]
    const { scene, el } = dragRef.current
    setConfig((prev) => {
      if (!prev) return prev
      const n = clone(prev)
      n.scenes[scene].elements[el].position = { type: 'absolute', x, y }
      return n
    })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const updateEl = (sceneIdx: number, elIdx: number, patch: Record<string, unknown>) =>
    setConfig((prev) => {
      if (!prev) return prev
      const n = clone(prev)
      Object.assign(n.scenes[sceneIdx].elements[elIdx], patch)
      return n
    })

  const sel =
    selected && config ? config.scenes[selected.scene]?.elements[selected.el] : null

  const syncVml = () => {
    if (config) setVml(configToMarkup(config))
  }
  const downloadVml = () => {
    if (!config) return
    const blob = new Blob([configToMarkup(config)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reel.vml'
    a.click()
    URL.revokeObjectURL(url)
  }

  const seekToScene = (i: number) => {
    setPlaying(false)
    setFrame(Math.min(totalFrames - 1, Math.round((cumulative[i] ?? 0) * fps)))
  }

  const [exporting, setExporting] = useState(false)
  const exportMp4 = async () => {
    if (!canvasRef.current || !config || exporting) return
    setExporting(true)
    try {
      const dur = totalFrames / fps
      setPlaying(false)
      const canvas = canvasRef.current
      const off = offscreenRef.current ?? document.createElement('canvas')
      offscreenRef.current = off
      off.width = size[0]
      off.height = size[1]
      const ctx = off.getContext('2d')
      if (!ctx) throw new Error('Could not create export canvas')
      const comp = composerRef.current
      const renderFx = config.fx ? { ...DEFAULT_FX, ...config.fx } : fx
      const webm = await captureCanvasToWebm(canvas, dur, fps, (exportFrame) => {
        ctx.clearRect(0, 0, size[0], size[1])
        drawFrame(ctx, config, exportFrame, size[0], size[1], { cpuFx: false })
        if (comp?.ok) {
          comp.setSize(size[0], size[1])
          comp.draw(off, renderFx, exportFrame / fps)
        } else {
          const target = canvas.getContext('2d')
          if (!target) throw new Error('Canvas2D export is unavailable')
          target.clearRect(0, 0, size[0], size[1])
          drawFrame(target, config, exportFrame, size[0], size[1])
        }
      })
      const mp4 = await muxAudioInBrowser(webm, config)
      const url = URL.createObjectURL(mp4)
      const a = document.createElement('a')
      a.href = url
      a.download = 'reel.mp4'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[studio] export failed', e)
    } finally {
      setExporting(false)
      const canvas = canvasRef.current
      if (canvas && config) {
        const off = offscreenRef.current
        const ctx = off?.getContext('2d')
        const comp = composerRef.current
        if (off && ctx && comp?.ok) {
          ctx.clearRect(0, 0, size[0], size[1])
          drawFrame(ctx, config, frame, size[0], size[1], { cpuFx: false })
          comp.draw(off, config.fx ? { ...DEFAULT_FX, ...config.fx } : fx, frame / fps)
        } else if (!comp?.ok) {
          const target = canvas.getContext('2d')
          if (target) drawFrame(target, config, frame, size[0], size[1])
        }
      }
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="studio-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a0b',
        color: '#e5e5e5',
        fontFamily: 'var(--font-dm-sans, ui-sans-serif, system-ui, sans-serif)',
        contain: 'strict',
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          height: '40px',
          flexShrink: 0,
          padding: '0 12px',
          borderBottom: '1px solid #1e1e22',
          background: '#111114',
        }}
      >
        {/* Brand */}
        <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff', marginRight: '6px', letterSpacing: '0.02em' }}>
          Velox Studio
        </span>
        <span
          style={{
            fontSize: '10px',
            color: '#555',
            background: '#1a1a1f',
            border: '1px solid #2a2a30',
            borderRadius: '4px',
            padding: '1px 6px',
            marginRight: '8px',
          }}
        >
          NLE
        </span>

        {/* Error badge */}
        {error && (
          <span
            title={error}
            style={{
              maxWidth: '280px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '11px',
              color: '#f87171',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '4px',
              padding: '1px 7px',
            }}
          >
            ⚠ {error}
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Timecode */}
        <span
          style={{
            fontFamily: 'var(--font-jetbrains-mono, ui-monospace, monospace)',
            fontSize: '11px',
            color: '#888',
            marginRight: '4px',
          }}
        >
          {(frame / fps).toFixed(2)}s · {fps}fps · {frame}/{totalFrames}
        </span>

        {/* Play/Pause */}
        <Btn onClick={() => setPlaying((p) => !p)} accent={playing}>
          {playing ? '⏸' : '▶'} {playing ? 'Pause' : 'Play'}
        </Btn>

        <Btn onClick={syncVml}>↺ Sync</Btn>
        <Btn onClick={downloadVml} variant="sky">⬇ VML</Btn>

        {/* Open VML */}
        <label style={btnStyle()}>
          📂 Open
          <input
            type="file"
            accept=".vml,text/plain"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              void file.text().then((t) => {
                setVml(t)
                e.target.value = ''
              })
            }}
          />
        </label>

        <Btn
          onClick={exportMp4}
          disabled={exporting}
          variant="emerald"
        >
          {exporting ? '⏳ Exporting…' : '⬆ Export MP4'}
        </Btn>
      </header>

      {/* ── BODY (Preview + Right Panel) ───────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Preview area */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0d0d10',
            padding: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Constrain canvas to aspect ratio within available space */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={canvasRef}
              width={size[0]}
              height={size[1]}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                aspectRatio: `${size[0]} / ${size[1]}`,
                cursor: 'move',
                borderRadius: '6px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* Right panel — fixed 272px, internal scroll */}
        <aside
          style={{
            width: '272px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #1e1e22',
            background: '#111114',
            overflow: 'hidden',
          }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #1e1e22',
              flexShrink: 0,
            }}
          >
            {(['vml', 'layers', 'props', 'captions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '6px 2px',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: activeTab === tab ? '#e0e0e0' : '#555',
                  background: activeTab === tab ? '#1a1a1f' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #38bdf8' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                {tab === 'vml' ? 'VML' : tab === 'props' ? 'Prop' : tab.slice(0,3).charAt(0).toUpperCase() + tab.slice(0,3).slice(1)}
              </button>
            ))}
          </div>

          {/* Scrollable panel body */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

            {/* VML Tab */}
            {activeTab === 'vml' && (
              <div style={{ padding: '10px' }}>
                <Label>VML Markup</Label>
                <textarea
                  value={vml}
                  onChange={(e) => setVml(e.target.value)}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    height: '340px',
                    resize: 'none',
                    background: '#0d0d10',
                    border: '1px solid #2a2a30',
                    borderRadius: '6px',
                    padding: '8px',
                    fontFamily: 'var(--font-jetbrains-mono, ui-monospace, monospace)',
                    fontSize: '11px',
                    color: '#ccc',
                    outline: 'none',
                    lineHeight: '1.6',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                  <Btn onClick={syncVml} fullWidth>↺ Sync from Config</Btn>
                </div>
              </div>
            )}

            {/* Layers Tab */}
            {activeTab === 'layers' && (
              <div style={{ padding: '10px' }}>
                <Label>Scene {currentScene + 1} · Layers</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {scenes[currentScene]?.elements.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#555' }}>No elements in this scene.</p>
                  )}
                  {scenes[currentScene]?.elements.map((el, i) => {
                    const active = selected?.scene === currentScene && selected?.el === i
                    return (
                      <button
                        key={el.id}
                        onClick={() => {
                          setSelected({ scene: currentScene, el: i })
                          setActiveTab('props')
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          textAlign: 'left',
                          fontSize: '12px',
                          background: active ? 'rgba(56,189,248,0.12)' : 'transparent',
                          color: active ? '#93c5fd' : '#bbb',
                          border: `1px solid ${active ? 'rgba(56,189,248,0.3)' : 'transparent'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {el.type}
                          {el.type === 'text' ? ` · "${el.content?.slice(0, 16)}"` : ''}
                        </span>
                        <span style={{ marginLeft: '8px', flexShrink: 0, fontSize: '10px', color: '#555' }}>
                          {positionSummary(el.position)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Properties Tab */}
            {activeTab === 'props' && (
              <div style={{ padding: '10px' }}>
                <Label>Properties</Label>
                {!sel && <p style={{ fontSize: '12px', color: '#555' }}>Select a layer to edit.</p>}
                {sel && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#777', background: '#0d0d10', padding: '4px 8px', borderRadius: '4px', border: '1px solid #222' }}>
                      type: <strong style={{ color: '#aaa' }}>{sel.type}</strong>
                    </div>
                    {sel.type === 'text' && (
                      <div>
                        <FieldLabel>Content</FieldLabel>
                        <input
                          value={sel.content ?? ''}
                          onChange={(e) =>
                            updateEl(currentScene, selected!.el, { content: e.target.value })
                          }
                          style={inputStyle}
                        />
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <FieldLabel>X</FieldLabel>
                        <input
                          type="number"
                          value={sel.position?.type === 'absolute' ? Math.round(sel.position.x) : 0}
                          onChange={(e) =>
                            updateEl(currentScene, selected!.el, {
                              position: { type: 'absolute', x: Number(e.target.value), y: sel.position?.type === 'absolute' ? sel.position.y : size[1] / 2 },
                            })
                          }
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <FieldLabel>Y</FieldLabel>
                        <input
                          type="number"
                          value={sel.position?.type === 'absolute' ? Math.round(sel.position.y) : 0}
                          onChange={(e) =>
                            updateEl(currentScene, selected!.el, {
                              position: { type: 'absolute', x: sel.position?.type === 'absolute' ? sel.position.x : size[0] / 2, y: Number(e.target.value) },
                            })
                          }
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    <p style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>
                      Tip: drag on the preview to move the selected layer.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Captions Tab */}
            {activeTab === 'captions' && (
              <div style={{ padding: '10px' }}>
                <Label>Captions · Scene {currentScene + 1}</Label>
                <FieldLabel>Import .srt / .ass / .vtt</FieldLabel>
                <input
                  type="file"
                  accept=".srt,.ass,.vtt,text/plain"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const text = await file.text()
                    const cues = parseCaptionTracks(text)
                    if (!cues.length) return
                    setConfig((prev) => {
                      if (!prev) return prev
                      const n = clone(prev)
                      n.scenes[currentScene].captions = {
                        cues,
                        style: n.scenes[currentScene]?.captions?.style ?? 'karaoke',
                      }
                      return n
                    })
                  }}
                  style={{
                    width: '100%',
                    fontSize: '11px',
                    color: '#888',
                    marginTop: '4px',
                  }}
                />
                {scenes[currentScene]?.captions?.cues?.length ? (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
                      <span>{scenes[currentScene].captions!.cues.length} cues</span>
                      <button
                        onClick={() =>
                          setConfig((prev) => {
                            if (!prev) return prev
                            const n = clone(prev)
                            n.scenes[currentScene].captions = undefined
                            return n
                          })
                        }
                        style={{ ...btnStyle(), fontSize: '10px', padding: '2px 8px' }}
                      >
                        Clear
                      </button>
                    </div>
                    <div>
                      <FieldLabel>Style</FieldLabel>
                      <select
                        value={scenes[currentScene].captions!.style ?? 'karaoke'}
                        onChange={(e) =>
                          setConfig((prev) => {
                            if (!prev) return prev
                            const n = clone(prev)
                            if (n.scenes[currentScene].captions)
                              n.scenes[currentScene].captions!.style = e.target.value as CaptionStyle
                            return n
                          })
                        }
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {CAPTION_STYLES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <p style={{ marginTop: '8px', fontSize: '11px', color: '#444' }}>No captions on this scene.</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── TIMELINE ───────────────────────────────────────────────── */}
      <footer
        style={{
          height: '140px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderTop: '1px solid #1e1e22',
          background: '#0e0e11',
        }}
      >
        {/* Timeline toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            flexShrink: 0,
            borderBottom: '1px solid #1a1a1e',
          }}
        >
          <Btn
            onClick={() =>
              addScene(scenes.length ? selectedScenes[selectedScenes.length - 1] ?? currentScene : currentScene)
            }
          >
            + Insert
          </Btn>
          <Btn
            onClick={() => selectedScenes.length && deleteScenes(selectedScenes)}
            disabled={!selectedScenes.length}
          >
            ✕ Delete
          </Btn>
          <span style={{ fontSize: '10px', color: '#555' }}>
            {selectedScenes.length ? `${selectedScenes.length} selected` : 'no sel'}
          </span>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={frame}
              onChange={(e) => {
                setPlaying(false)
                setFrame(Number(e.target.value))
              }}
              style={{ flex: 1, accentColor: '#38bdf8', minWidth: 0 }}
            />
          </div>

          <span
            style={{
              flexShrink: 0,
              fontFamily: 'var(--font-jetbrains-mono, ui-monospace, monospace)',
              fontSize: '10px',
              color: '#666',
            }}
          >
            {(frame / fps).toFixed(2)}s
          </span>
        </div>

        {/* Ruler */}
        <div
          style={{
            position: 'relative',
            height: '12px',
            flexShrink: 0,
            borderBottom: '1px solid #1a1a1e',
            margin: '0 12px',
          }}
        >
          {rulerTicks.map((t) => (
            <div
              key={`${t.t}-${t.beat}`}
              title={`${t.t.toFixed(1)}s`}
              style={{
                position: 'absolute',
                top: 0,
                width: '1px',
                height: '100%',
                background: t.beat ? 'rgba(56,189,248,0.5)' : '#2a2a30',
                left: `${(t.t / totalDur) * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Clips track */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'stretch',
            gap: '2px',
            padding: '4px 12px',
            overflowX: 'auto',
            overflowY: 'hidden',
            overscrollBehavior: 'contain',
          }}
          onDragLeave={() => setDropTarget(null)}
        >
          {scenes.map((s, i) => {
            const active = i === currentScene
            const isSel = selectedScenes.includes(i)
            const isDrop = dropTarget === i
            return (
              <div
                key={s.id}
                data-clip
                draggable
                onDragStart={(e) => {
                  const idxs = selectedScenes.includes(i) ? selectedScenes : [i]
                  e.dataTransfer.setData('text/scenes', JSON.stringify(idxs))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDropTarget(i)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const raw = e.dataTransfer.getData('text/scenes')
                  const idxs: number[] = raw ? JSON.parse(raw) : [i]
                  moveScenes(idxs, dropTarget ?? i)
                  setDropTarget(null)
                }}
                onClick={(e) => onClipClick(e, i)}
                style={{
                  flexBasis: `${(sceneFrames[i] / totalFrames) * 100}%`,
                  minWidth: '80px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  border: `1px solid ${active ? '#38bdf8' : isSel ? 'rgba(56,189,248,0.5)' : '#2a2a30'}`,
                  background: active ? 'rgba(56,189,248,0.12)' : isSel ? '#1a1a20' : '#141418',
                  cursor: 'pointer',
                  fontSize: '10px',
                  contain: 'layout',
                  outline: isDrop ? '2px solid #34d399' : 'none',
                  outlineOffset: '1px',
                  userSelect: 'none',
                }}
              >
                {/* Trim handles */}
                <div
                  draggable={false}
                  onPointerDown={(e) => onTrimDown(e, 'l', i)}
                  onPointerMove={onTrimMove}
                  onPointerUp={onTrimUp}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '6px',
                    height: '100%',
                    cursor: 'ew-resize',
                    borderRadius: '4px 0 0 4px',
                    touchAction: 'none',
                  }}
                />
                <div
                  draggable={false}
                  onPointerDown={(e) => onTrimDown(e, 'r', i)}
                  onPointerMove={onTrimMove}
                  onPointerUp={onTrimUp}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: '6px',
                    height: '100%',
                    cursor: 'ew-resize',
                    borderRadius: '0 4px 4px 0',
                    touchAction: 'none',
                  }}
                />

                <div style={{ fontWeight: 600, color: active ? '#93c5fd' : '#bbb' }}>
                  S{i + 1}
                </div>
                <div style={{ color: '#555' }}>{s.duration.toFixed(1)}s</div>
              </div>
            )
          })}
        </div>
      </footer>
    </div>
  )
}

// ─── Mini UI primitives (inline styles, zero deps) ─────────────────────────

function btnStyle(opts: { variant?: 'sky' | 'emerald' | 'accent'; accent?: boolean } = {}): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 9px',
    borderRadius: '5px',
    border: '1px solid #2a2a30',
    background: '#1a1a1f',
    color: '#ccc',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    fontFamily: 'inherit',
  }
  if (opts.variant === 'sky') return { ...base, background: '#0c4a6e', border: '1px solid #0369a1', color: '#7dd3fc' }
  if (opts.variant === 'emerald') return { ...base, background: '#064e3b', border: '1px solid #065f46', color: '#6ee7b7' }
  if (opts.accent) return { ...base, background: '#1e3a5f', border: '1px solid #1d4ed8', color: '#93c5fd' }
  return base
}

function Btn({
  children,
  onClick,
  disabled,
  variant,
  accent,
  fullWidth,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'sky' | 'emerald' | 'accent'
  accent?: boolean
  fullWidth?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...btnStyle({ variant, accent }),
        ...(fullWidth ? { width: '100%', justifyContent: 'center' } : {}),
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {children}
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#555',
        marginBottom: '6px',
      }}
    >
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px' }}>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d0d10',
  border: '1px solid #2a2a30',
  borderRadius: '5px',
  padding: '5px 8px',
  color: '#ddd',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}
