'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  createVideo, scene, text, shape, logo, image, group, themes, resolveTheme,
  drawFrame, getTotalFrames, createVideoFromSchema, createVideoFromCreativeSpec, isCreativeSpec, preloadImages,
  createVideoFromMarkup, isVeloxMarkup,
  layout, backdrops, typography, creativeCards, motion,
} from '@velox-video/core'
import type { VeloxVideo, LlmVideoSpec } from '@velox-video/core'

// ─── Examples ────────────────────────────────────────────────────────────────

const EXAMPLES = [
  {
    name: 'Text Reveal',
    code: `createVideo({
  size: '720p',
  fps: 30,
  theme: 'linear',
  background: 'grid(rgba(255,255,255,0.05), 40)',
  scenes: [
    scene(4)
      .add(
        shape.particles(30, { color: '#5e6ad2', speed: 0.3 }).opacity(0.4),
        text('VELOX')
          .center({ offsetY: -30 })
          .size(120).weight(900).color('#f4f5f8')
          .in('slideUp', 0.8),
        text('Motion Graphics Engine')
          .center({ offsetY: 60 })
          .size(32).color('#5e6ad2')
          .in('fadeIn', 0.6, { delay: 0.4 }),
      ),
  ],
})`,
  },
  {
    name: 'Geometric',
    code: `createVideo({
  size: '720p',
  fps: 30,
  theme: 'notion',
  background: '#ffffff',
  scenes: [
    scene(5)
      .add(
        shape.circle(300).center().color('#0f7b6c').opacity(0.12).in('zoomIn', 1.0),
        shape.circle(200).center().color('#e03e3e').opacity(0.18).in('zoomIn', 0.8, { delay: 0.2 }),
        shape.circle(90).center().color('#37352f').in('bounceIn', 0.6, { delay: 0.4 }),
        text('GEOMETRY')
          .center({ offsetY: 200 })
          .size(48).weight(700).color('#37352f').letterSpacing(8)
          .in('expandX', 0.6, { delay: 0.8 }),
      ),
  ],
})`,
  },
  {
    name: 'Bar Chart',
    code: `createVideo({
  size: '720p',
  fps: 30,
  theme: 'geist',
  background: 'grid(rgba(0,0,0,0.05), 40)',
  scenes: [
    scene(5)
      .add(
        text('Q4 Revenue')
          .center({ offsetY: -200 })
          .size(48).weight(700).color('#111')
          .in('slideDown', 0.5),
        shape.barChart({
          data: [
            { label: 'Jan', value: 65, color: '#111' },
            { label: 'Feb', value: 80, color: '#666' },
            { label: 'Mar', value: 55, color: '#333' },
            { label: 'Apr', value: 95, color: '#0070f3' },
          ]
        })
          .center({ offsetY: 50 }).size(800, 300)
          .in('growUp', 1.0, { delay: 0.4 }),
      ),
  ],
})`,
  },
  {
    name: 'Kinetic Text',
    code: `createVideo({
  size: '720p',
  fps: 30,
  theme: 'obsidian',
  background: 'grid(rgba(255,255,255,0.05), 30)',
  scenes: [
    scene(5)
      .add(
        text('MAKE')
          .center({ offsetX: -280, offsetY: -20 }).size(76).weight(900).color('#ffffff')
          .in('slideRight', 0.5),
        text('IT')
          .center({ offsetX: 0, offsetY: -20 }).size(76).weight(900).color('#a8a8a8')
          .in('zoomIn', 0.4, { delay: 0.3 }),
        text('MOVE')
          .center({ offsetX: 280, offsetY: -20 }).size(76).weight(900).color('#ffffff')
          .in('slideLeft', 0.5, { delay: 0.5 }),
        text('velox motion graphics')
          .center({ offsetY: 100 }).size(24).color('#888').letterSpacing(4).uppercase()
          .in('fadeIn', 0.8, { delay: 1.0 }),
      ),
  ],
})`,
  },
  {
    name: 'Progress Bar',
    code: `createVideo({
  size: '720p',
  fps: 30,
  theme: 'linear',
  background: '#0a0b10',
  scenes: [
    scene(4)
      .add(
        text('Loading...').center({ offsetY: -60 }).size(40).weight(600).color('#f4f5f8').in('fadeIn', 0.4),
        shape.progressBar(100, { color: '#5e6ad2', trackColor: 'rgba(244,245,248,0.1)' })
          .center({ offsetY: 20 }).size(500, 10)
          .in('expandX', 2.5, { delay: 0.5 }),
        text('Complete').center({ offsetY: 90 }).size(28).color('#5e6ad2').in('fadeIn', 0.4, { delay: 3.0 }),
      ),
  ],
})`,
  },
  {
    name: 'VML Motion',
    code: `<video size="portrait" fps="60" theme="obsidian" background="grid(rgba(255,255,255,0.04), 44)">
  <scene duration="4" background="aurora:violet">
    <center motion="cinematic">
      <hero kicker="AI SYSTEMS" title="From Prompt to Workflow" subtitle="Valid video without brittle chains" />
    </center>
  </scene>
  <scene duration="5" background="mesh:ocean">
    <column gap="32" placement="center">
      <kicker color="theme.accent">THE LOOP</kicker>
      <barChart width="700" height="320" motion="growUp">
        <bar label="Input" value="80" color="theme.accent" />
        <bar label="Plan" value="64" color="#38bdf8" />
        <bar label="Render" value="92" color="#22c55e" />
      </barChart>
    </column>
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

      preloadImages(cfg).then(() => {
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
        {isDev && <button className="pg-render-btn" style={{ background: 'blue' }} onClick={async () => {
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
          height: 620px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(196, 128, 44, 0.18);
          background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent), rgba(25, 17, 12, 0.84);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(18px);
          font-family: ui-monospace, 'Fira Code', monospace;
          margin: 0 -1rem;
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
