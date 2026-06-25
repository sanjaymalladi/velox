'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  createVideo, scene, text, shape, logo, image, group, themes, resolveTheme,
  drawFrame, getTotalFrames, createVideoFromSchema, createVideoFromCreativeSpec, isCreativeSpec, preloadImages,
  createVideoFromMarkup, isVeloxMarkup, setImageCache,
  layout, backdrops, typography, creativeCards, motion,
} from '@velox-video/core'
import type { VeloxVideo, LlmVideoSpec } from '@velox-video/core'

// ─── Examples ────────────────────────────────────────────────────────────────

const EXAMPLES = [
  {
    name: 'Reel Production VML',
    code: `<video size="portrait" fps="60" theme="creamChecks" background="creamGrid" motionQuality="premium" music="soundtrack.mp3" musicVolume="0.35">
  <scene duration="4.8" template="topTextBottomVisual" camera="slowPush" mood="editorial" transition="blurDissolve" transitionDuration="0.55" staggerStep="0.14">
    <announcement slot="top" title="Launch reels from markup" subtitle="Templates, captions, assets, stock refs, cards, charts, and beat metadata." badge="NEW" tone="success" motion="heroCinematic" />
    <asset slot="visual" name="phone-frame" width="360" height="640" motion="driftIn" delay="0.2" />
    <captions slot="caption" text="Launch reels from markup with safe VML." style="karaoke" />
    <sfx name="whoosh" at="0.35" volume="0.8" />
    <beat at="0.5" />
  </scene>

  <scene duration="5.4" template="splitLeftRight" background="aurora:ocean" camera="parallaxDrift" mood="cinematic" transition="zoomSmooth" staggerStep="0.12">
    <featureReveal slot="left" title="Production pieces included" caption="High-level tags instead of fragile offsets." motion="premiumSlide">
      <item>caption styles</item>
      <item>transparent SVG assets</item>
      <item>stock provider refs</item>
      <item>generated cards</item>
    </featureReveal>
    <stock slot="right" query="developer coding at night" provider="generated" width="440" height="620" radius="32" motion="driftIn" delay="0.2" />
    <captions slot="caption" text="Every block stays semantic for small models." style="wordPop" start="0.8" />
    <beat at="1.0" />
  </scene>

  <scene duration="5.2" template="centerCard" background="mesh:violet" camera="kenBurns" mood="cinematic" transition="blurDissolve">
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
    <captions slot="caption" text="Charts are VML too, powered by D3." style="pill" start="0.4" />
  </scene>

  <scene duration="5.5" template="headlineThenProof" background="warmPaper" camera="slowPush" mood="editorial" transition="zoomSmooth">
    <breakingNews slot="top" headline="No-key media starts free-first" ticker="Generated fallback, local, Wikipedia, Unsplash Source, OpenBrand metadata." tone="warning" motion="heroCinematic" />
    <githubRepo slot="visual" owner="sanjaymalladi" repo="velox" motion="driftIn" delay="0.25" />
    <icon slot="overlay" name="github" size="104" motion="magneticPop" delay="0.45" />
    <captions slot="caption" text="Generated cards render before export and cache locally." style="highlightKeywords" />
    <sfx name="pop" at="0.6" />
  </scene>

  <scene duration="4.4" template="centerCard" background="#050505" camera="handheld" mood="cinematic" vignette="0.32" grain="0.08">
    <finalCTA title="Paste VML. Render. Export." subtitle="The playground can now download your current custom video as WebM." cta="Try the export button" motion="magneticPop" />
    <captions slot="caption" text="Paste VML, preview it, export it." style="karaoke" />
  </scene>
</video>`,
  },
  {
    name: 'Premium Motion',
    code: `createVideo({
  size: '1080p',
  fps: 60,
  theme: 'linear',
  background: 'grid(rgba(255,255,255,0.03), 60)',
  scenes: [
    scene(4)
      .add(
        shape.circle(800).center().color('#5e6ad2').opacity(0.15).in('zoomInBlur', 1.5, { ease: 'tactile' }),
        text('VELOX ENGINE')
          .center({ offsetY: -40 })
          .size(104).weight(900).color('#f4f5f8').wrap(1200)
          .in('tactileIn', 1.0, { ease: 'jitter' }),
        text('PRODUCTION READY MOTION')
          .center({ offsetY: 60 })
          .size(32).color('#8892e0').letterSpacing(8)
          .in('slideUpBlur', 0.8, { delay: 0.3, ease: 'tactile' })
          .loop('breathing', { speed: 0.5 })
      )
      .transition('crossDissolve', 0.5),
    scene(4)
      .add(
        text('FLUID PHYSICS')
          .center({ offsetY: -100 })
          .size(90).weight(900).color('#f4f5f8')
          .in('maskRevealUp', 0.8, { ease: 'tactile' }),
        shape.rect(600, 300).center({ offsetY: 80 }).color('#26293d').radius(24)
          .in('tactileIn', 1.0, { delay: 0.2 }),
        text('Built-in tactile springs & motion blur')
          .center({ offsetY: 80 })
          .size(28).color('#8892e0')
          .in('fadeIn', 0.6, { delay: 0.6 })
      )
  ]
})`
  },
  {
    name: 'SVGL Logos',
    code: `createVideo({
  size: '720p',
  fps: 60,
  theme: 'geist',
  background: '#ffffff',
  scenes: [
    scene(5)
      .add(
        logo('github', 'light').center({ offsetX: -200, offsetY: -30 }).size(120).in('tactileIn', 1.0, { ease: 'jitter' }).loop('float', { distance: 15, speed: 0.8 }),
        logo('react', 'dark').center({ offsetX: 0, offsetY: -30 }).size(120).in('tactileIn', 1.0, { delay: 0.1, ease: 'jitter' }).loop('rotate', { speed: 0.2 }),
        logo('svelte', 'dark').center({ offsetX: 200, offsetY: -30 }).size(120).in('tactileIn', 1.0, { delay: 0.2, ease: 'jitter' }).loop('float', { distance: 10, speed: 1.2 }),
        text('INTEGRATED WITH SVGL')
          .center({ offsetY: 120 })
          .size(32).weight(600).color('#111').letterSpacing(4)
          .in('slideUpBlur', 0.8, { delay: 0.5 })
      )
  ]
})`
  },
  {
    name: 'OpenAI Intro',
    code: `createVideo({
  size: '1080p',
  fps: 60,
  theme: 'obsidian',
  background: '#050505',
  scenes: [
    scene(5)
      .add(
        ...logo.lockup('openai', 'OpenAI', 'light', {
          logoSize: 72,
          textSize: 112,
          gap: 26,
          color: '#ffffff',
          weight: 600,
          letterSpacing: 2
        })
      )
  ]
})`
  },
]

// ─── Evaluator ───────────────────────────────────────────────────────────────

function looksLikeJsonSchema(code: string): boolean {
  const trimmed = code.trim()
  return trimmed.startsWith('{') && trimmed.includes('"sections"')
}

function looksLikeCreativeSpec(code: string): boolean {
  const trimmed = code.trim()
  return trimmed.startsWith('{') && trimmed.includes('"format"') && trimmed.includes('velox-creative-spec-v1')
}

function isValidExpressionSource(src: string): boolean {
  try {
    // eslint-disable-next-line no-new-func
    new Function('"use strict"; return (' + src + ')')
    return true
  } catch {
    return false
  }
}

function buildPlaygroundExecutorBody(cleaned: string): string {
  // Single-expression scripts: return ( createVideo({...}) )
  if (isValidExpressionSource(cleaned)) {
    return '"use strict"; return (' + cleaned + ');'
  }
  // Multi-line with const / let / statements: must end with return createVideo(...)
  return '"use strict";\n' + cleaned + '\n'
}

function evalVeloxCode(code: string): VeloxVideo {
  if (isVeloxMarkup(code)) {
    return createVideoFromMarkup(code)
  }
  if (looksLikeCreativeSpec(code)) {
    return createVideoFromCreativeSpec(JSON.parse(code))
  }
  if (looksLikeJsonSchema(code)) {
    const schema = JSON.parse(code) as LlmVideoSpec
    return createVideoFromSchema(schema)
  }

  const cleaned = code
    .split('\n')
    // Strip import lines: match `import ` and compact `import{`/`import*` (no space after keyword)
    .filter(line => !/^\s*import\b/.test(line))
    .join('\n')
    .replace(/export\s+default\s+/, '')
    .trim()

  const body = buildPlaygroundExecutorBody(cleaned)

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'createVideo', 'scene', 'text', 'shape', 'logo', 'image', 'group', 'themes', 'resolveTheme', 'createVideoFromSchema',
    'createVideoFromCreativeSpec', 'isCreativeSpec', 'createVideoFromMarkup', 'isVeloxMarkup',
    'layout', 'backdrops', 'typography', 'creativeCards', 'motion',
    body,
  )
  const video = fn(
    createVideo,
    scene,
    text,
    shape,
    logo,
    image,
    group,
    themes,
    resolveTheme,
    createVideoFromSchema,
    createVideoFromCreativeSpec,
    isCreativeSpec,
    createVideoFromMarkup,
    isVeloxMarkup,
    layout,
    backdrops,
    typography,
    creativeCards,
    motion,
  )
  if (
    video == null ||
    typeof video !== 'object' ||
    !('config' in video) ||
    !Array.isArray((video as VeloxVideo).config?.scenes)
  ) {
    throw new Error(
      'Your code must produce a Velox video. Use a single createVideo({ ... }) expression, ' +
        'or multi-line code with const/let that finishes with: return createVideo({ ... }).',
    )
  }
  return video as VeloxVideo
}

// ─── Format time ─────────────────────────────────────────────────────────────

function fmtTime(frame: number, fps: number) {
  const s = Math.floor(frame / fps)
  const f = frame % fps
  return `${s}:${String(f).padStart(2, '0')}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlaygroundClient() {
  const isDev = process.env.NODE_ENV === 'development'
  const [exampleIdx, setExampleIdx] = useState(0)
  const [code, setCode] = useState(EXAMPLES[0].code)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'preview' | 'output'>('preview')

  // Playback state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const configRef = useRef<VeloxVideo['config'] | null>(null)
  const frameRef = useRef(0)
  const totalFramesRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const [hasRendered, setHasRendered] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // ── Draw a frame onto the canvas ──────────────────────────────────────────
  const drawCurrentFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current
    const cfg = configRef.current
    if (!canvas || !cfg) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const [w, h] = cfg.size as [number, number]
    drawFrame(ctx, cfg, frame, w, h)
  }, [])

  // ── Animation loop ────────────────────────────────────────────────────────
  const animate = useCallback((timestamp: number) => {
    const cfg = configRef.current
    if (!cfg) return
    const fps = cfg.fps as number
    const total = totalFramesRef.current

    if (lastTimeRef.current === null) lastTimeRef.current = timestamp
    const elapsed = timestamp - lastTimeRef.current
    const frameDuration = 1000 / fps

    if (elapsed >= frameDuration) {
      lastTimeRef.current = timestamp - (elapsed % frameDuration)
      frameRef.current = (frameRef.current + 1) % total
      setCurrentFrame(frameRef.current)
      drawCurrentFrame(frameRef.current)
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [drawCurrentFrame])

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    lastTimeRef.current = null
  }, [])

  const startLoop = useCallback(() => {
    stopLoop()
    rafRef.current = requestAnimationFrame(animate)
  }, [animate, stopLoop])

  // ── Render button ─────────────────────────────────────────────────────────
  const handleRender = useCallback(() => {
    stopLoop()
    setError(null)
    try {
      const video = evalVeloxCode(code)
      const cfg = video.config
      configRef.current = cfg
      const total = getTotalFrames(cfg)
      totalFramesRef.current = total
      frameRef.current = 0
      setTotalFrames(total)
      setCurrentFrame(0)
      setHasRendered(true)
      setActiveTab('preview')

      // Set canvas dimensions
      const canvas = canvasRef.current
      if (canvas) {
        const [w, h] = cfg.size as [number, number]
        canvas.width = w
        canvas.height = h
      }

      preloadImages(cfg).then((cache) => {
        setImageCache(cache)
        // Draw first frame then start loop
        drawCurrentFrame(0)
        setIsPlaying(true)
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setActiveTab('output')
    }
  }, [code, stopLoop, drawCurrentFrame])

  // ── Sync playing state with loop ──────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      startLoop()
    } else {
      stopLoop()
    }
    return stopLoop
  }, [isPlaying, startLoop, stopLoop])

  // ── Auto-render the first example on mount ────────────────────────────────
  useEffect(() => {
    handleRender()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Scrubber change ───────────────────────────────────────────────────────
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Number(e.target.value)
    frameRef.current = f
    setCurrentFrame(f)
    drawCurrentFrame(f)
  }

  // ── Example switcher ──────────────────────────────────────────────────────
  const handleExampleChange = (idx: number) => {
    setExampleIdx(idx)
    setCode(EXAMPLES[idx].code)
  }

  const exportCurrentVideo = useCallback(async () => {
    stopLoop()
    setIsPlaying(false)
    setError(null)
    setIsExporting(true)

    try {
      const video = evalVeloxCode(code)
      const cfg = video.config
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Canvas is not ready.')
      if (!('captureStream' in canvas)) throw new Error('This browser cannot export canvas video.')
      if (typeof MediaRecorder === 'undefined') throw new Error('This browser does not support MediaRecorder export.')

      const [w, h] = cfg.size as [number, number]
      canvas.width = w
      canvas.height = h

      const cache = await preloadImages(cfg)
      setImageCache(cache)

      configRef.current = cfg
      const total = getTotalFrames(cfg)
      totalFramesRef.current = total
      setTotalFrames(total)
      setHasRendered(true)

      const stream = canvas.captureStream(cfg.fps || 30)
      const mimeType =
        MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      const done = new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error('Browser video export failed.'))
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
      })

      recorder.start()
      const frameDelay = 1000 / (cfg.fps || 30)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not create a canvas context.')
      for (let f = 0; f < total; f++) {
        frameRef.current = f
        setCurrentFrame(f)
        drawFrame(ctx, cfg, f, w, h)
        await new Promise(resolve => setTimeout(resolve, frameDelay))
      }
      recorder.stop()

      const blob = await done
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${isVeloxMarkup(code) ? 'velox-reel' : 'velox-video'}.webm`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setActiveTab('preview')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setActiveTab('output')
    } finally {
      setIsExporting(false)
    }
  }, [code, stopLoop])

  const fps = configRef.current?.fps ?? 30

  return (
    <div className="pg-root">
      {/* ── Top bar ── */}
      <div className="pg-topbar">
        <div className="pg-topbar-left">
          <span className="pg-label">Example</span>
          <select
            className="pg-select"
            value={exampleIdx}
            onChange={e => handleExampleChange(Number(e.target.value))}
          >
            {EXAMPLES.map((ex, i) => (
              <option key={ex.name} value={i}>{ex.name}</option>
            ))}
          </select>
        </div>
        {isDev && <button className="pg-render-btn pg-render-btn--secondary" onClick={async () => {
          for (let i = 0; i < EXAMPLES.length; i++) {
            const ex = EXAMPLES[i]
            setExampleIdx(i)
            setCode(ex.code)
            
            // Wait a tick for React to update
            await new Promise(r => setTimeout(r, 1000)) // Increased to 1s to ensure stability
            
            try {
              const video = evalVeloxCode(ex.code)
              const cfg = video.config
              const canvas = canvasRef.current!
              canvas.width = cfg.size[0]
              canvas.height = cfg.size[1]
              
              await preloadImages(cfg)
              
              const totalFrames = getTotalFrames(cfg)
              const stream = canvas.captureStream(cfg.fps || 30)
              const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
              const chunks: Blob[] = []
              
              recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
              
              const recordingPromise = new Promise<void>(resolve => {
                recorder.onstop = async () => {
                  const blob = new Blob(chunks, { type: 'video/webm' })
                  const fd = new FormData()
                  fd.append('video', blob)
                  fd.append('name', ex.name)
                  await fetch('/api/export', { method: 'POST', body: fd })
                  console.log('Saved', ex.name)
                  resolve()
                }
              })
              
              recorder.start()
              
              // Draw frames
              for (let f = 0; f < totalFrames; f++) {
                const ctx = canvas.getContext('2d')!
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                await drawFrame(ctx, cfg, f, canvas.width, canvas.height)
                await new Promise(r => setTimeout(r, 1000 / (cfg.fps || 30))) // real-time pace for stream
              }
              
              recorder.stop()
              await recordingPromise
            } catch(e) {
               console.error('Failed on', ex.name, e)
            }
          }
          alert('All 9 videos exported to /examples/')
        }}>
          <span className="pg-render-icon">🎬</span> Export All
        </button>}
        <button className="pg-render-btn pg-render-btn--secondary" onClick={exportCurrentVideo} disabled={isExporting}>
          <span className="pg-render-icon">⬇</span> {isExporting ? 'Exporting…' : 'Export WebM'}
        </button>
        <button className="pg-render-btn" onClick={handleRender}>
          <span className="pg-render-icon">▶</span> Render
        </button>
      </div>

      {/* ── Split pane ── */}
      <div className="pg-split">
        {/* Left: code editor */}
        <div className="pg-editor-pane">
          <div className="pg-pane-header">
            <span className="pg-pane-dot pg-dot-red" />
            <span className="pg-pane-dot pg-dot-yellow" />
            <span className="pg-pane-dot pg-dot-green" />
            <span className="pg-pane-title">{isVeloxMarkup(code) ? 'video.vml' : looksLikeJsonSchema(code) || looksLikeCreativeSpec(code) ? 'legacy-video.json' : 'video.ts'}</span>
          </div>
          <textarea
            className="pg-editor"
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>

        {/* Right: preview */}
        <div className="pg-preview-pane">
          {/* Tabs */}
          <div className="pg-tabs">
            <button
              className={`pg-tab ${activeTab === 'preview' ? 'pg-tab--active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >Preview</button>
            <button
              className={`pg-tab ${activeTab === 'output' ? 'pg-tab--active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              Output
              {error && <span className="pg-error-dot" />}
            </button>
          </div>

          {/* Preview canvas */}
          <div className="pg-canvas-wrap" style={{ display: activeTab === 'preview' ? 'flex' : 'none' }}>
            {!hasRendered && (
              <div className="pg-empty">
                <span className="pg-empty-icon">◎</span>
                <p>Hit <strong>Render</strong> to preview your animation</p>
              </div>
            )}
            <canvas ref={canvasRef} className="pg-canvas" />
          </div>

          {/* Output / error */}
          <div className="pg-output" style={{ display: activeTab === 'output' ? 'flex' : 'none' }}>
            {error
              ? <pre className="pg-error-text">{error}</pre>
              : <span className="pg-ok-text">✓ No errors</span>
            }
          </div>

          {/* Controls */}
          {hasRendered && (
            <div className="pg-controls">
              <button
                className="pg-ctrl-btn"
                onClick={() => {
                  frameRef.current = 0
                  setCurrentFrame(0)
                  drawCurrentFrame(0)
                }}
              >⏮</button>
              <button
                className="pg-ctrl-btn pg-ctrl-play"
                onClick={() => setIsPlaying(p => !p)}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                className="pg-ctrl-btn"
                onClick={() => {
                  const f = Math.min(frameRef.current + 1, totalFrames - 1)
                  frameRef.current = f
                  setCurrentFrame(f)
                  drawCurrentFrame(f)
                }}
              >⏭</button>

              <input
                type="range"
                className="pg-scrubber"
                min={0}
                max={totalFrames - 1}
                value={currentFrame}
                onChange={handleScrub}
              />

              <span className="pg-time">
                {fmtTime(currentFrame, fps)} / {fmtTime(totalFrames, fps)}
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .pg-root {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: min(920px, calc(100dvh - 10rem));
          min-height: 420px;
          border-radius: 0;
          overflow: hidden;
          border: 1px solid rgba(196, 128, 44, 0.18);
          border-left: none;
          border-right: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent), rgba(25, 17, 12, 0.84);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(18px);
          font-family: ui-monospace, 'Fira Code', monospace;
          margin: 0;
        }

        @media (min-width: 768px) {
          .pg-root {
            border-radius: 18px;
            border-left: 1px solid rgba(196, 128, 44, 0.18);
            border-right: 1px solid rgba(196, 128, 44, 0.18);
          }
        }

        @media (max-width: 900px) {
          .pg-split {
            flex-direction: column;
          }
          .pg-editor-pane,
          .pg-preview-pane {
            width: 100%;
            min-height: 0;
          }
          .pg-editor-pane {
            flex: 1.1;
            border-right: none;
            border-bottom: 1px solid rgba(196,128,44,0.12);
          }
          .pg-preview-pane {
            flex: 1;
          }
        }

        /* Top bar */
        .pg-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: rgba(35, 24, 16, 0.82);
          border-bottom: 1px solid rgba(196, 128, 44, 0.14);
          flex-shrink: 0;
        }
        .pg-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pg-label { font-size: 11px; color: rgba(235, 215, 194, 0.52); text-transform: uppercase; letter-spacing: 0.06em; font-family: inherit; }
        .pg-select {
          background: rgba(53, 37, 24, 0.88);
          border: 1px solid rgba(196,128,44,0.28);
          color: #f7ead7;
          border-radius: 10px;
          padding: 5px 10px;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          outline: none;
        }
        .pg-select:focus { border-color: #ffb14a; }
        .pg-render-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #ffbf66, #f08a3c);
          border: none;
          color: #24160d;
          border-radius: 999px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
          font-family: inherit;
        }
        .pg-render-btn:hover { opacity: 0.88; }
        .pg-render-btn:disabled { opacity: 0.55; cursor: wait; }
        .pg-render-btn--secondary {
          background: rgba(53, 37, 24, 0.88);
          border: 1px solid rgba(196,128,44,0.28);
          color: #f7ead7;
        }
        .pg-render-icon { font-size: 10px; }

        /* Split */
        .pg-split {
          display: flex;
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }

        /* Editor pane */
        .pg-editor-pane {
          display: flex;
          flex-direction: column;
          width: 50%;
          border-right: 1px solid rgba(196,128,44,0.12);
          overflow: hidden;
        }
        .pg-pane-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(35, 24, 16, 0.76);
          border-bottom: 1px solid rgba(196,128,44,0.1);
          flex-shrink: 0;
        }
        .pg-pane-dot { width: 10px; height: 10px; border-radius: 50%; }
        .pg-dot-red    { background: #ff5f57; }
        .pg-dot-yellow { background: #febc2e; }
        .pg-dot-green  { background: #28c840; }
        .pg-pane-title { font-size: 12px; color: rgba(235, 215, 194, 0.52); margin-left: 6px; }
        .pg-editor {
          flex: 1;
          width: 100%;
          background: rgba(20, 14, 10, 0.95);
          color: #f1e2cf;
          border: none;
          outline: none;
          resize: none;
          padding: 16px;
          font-size: 12.5px;
          line-height: 1.7;
          font-family: inherit;
          tab-size: 2;
        }
        .pg-editor::selection { background: rgba(240,138,60,0.28); }

        /* Preview pane */
        .pg-preview-pane {
          display: flex;
          flex-direction: column;
          width: 50%;
          overflow: hidden;
          background: rgba(24, 16, 11, 0.92);
        }

        /* Tabs */
        .pg-tabs {
          display: flex;
          background: rgba(35, 24, 16, 0.82);
          border-bottom: 1px solid rgba(196,128,44,0.14);
          flex-shrink: 0;
        }
        .pg-tab {
          padding: 8px 18px;
          font-size: 12px;
          background: none;
          border: none;
          color: rgba(235, 215, 194, 0.52);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
        }
        .pg-tab:hover { color: #f3e4d0; }
        .pg-tab--active { color: #fff7ef; border-bottom-color: #ffb14a; }
        .pg-error-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #ef4444; display: inline-block;
        }

        /* Canvas */
        .pg-canvas-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 12px;
          background: radial-gradient(circle at top, rgba(255,190,92,0.08), transparent 30%), rgba(14, 10, 7, 0.96);
        }
        .pg-canvas {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 10px;
          display: block;
        }
        .pg-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: rgba(235, 215, 194, 0.44);
          font-size: 13px;
          font-family: ui-sans-serif, system-ui, sans-serif;
          position: absolute;
        }
        .pg-empty-icon { font-size: 32px; }

        /* Output */
        .pg-output {
          flex: 1;
          padding: 16px;
          overflow: auto;
          background: rgba(14, 10, 7, 0.96);
          align-items: flex-start;
        }
        .pg-error-text {
          color: #f87171;
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;
          font-family: inherit;
        }
        .pg-ok-text {
          color: #4ade80;
          font-size: 13px;
          font-family: inherit;
        }

        /* Controls */
        .pg-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(35, 24, 16, 0.82);
          border-top: 1px solid rgba(196,128,44,0.14);
          flex-shrink: 0;
        }
        .pg-ctrl-btn {
          background: none;
          border: none;
          color: rgba(235, 215, 194, 0.64);
          cursor: pointer;
          font-size: 14px;
          padding: 4px 6px;
          border-radius: 4px;
          transition: color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .pg-ctrl-btn:hover { color: #fff7ef; background: rgba(240,138,60,0.16); }
        .pg-ctrl-play { color: #ffb14a; font-size: 15px; }
        .pg-scrubber {
          flex: 1;
          appearance: none;
          height: 3px;
          border-radius: 2px;
          background: rgba(240,138,60,0.22);
          outline: none;
          cursor: pointer;
          accent-color: #ffb14a;
        }
        .pg-scrubber::-webkit-slider-thumb {
          appearance: none;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #ffb14a;
          cursor: pointer;
        }
        .pg-time {
          font-size: 11px;
          color: rgba(235, 215, 194, 0.48);
          white-space: nowrap;
          min-width: 72px;
          text-align: right;
        }
      `}</style>
    </div>
  )
}
