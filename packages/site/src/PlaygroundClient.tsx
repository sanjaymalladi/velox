'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  createVideo, scene, text, shape, themes, resolveTheme,
  drawFrame, getTotalFrames,
} from '@velox-video/core'
import type { VeloxVideo } from '@velox-video/core'

// ─── Examples ────────────────────────────────────────────────────────────────

const EXAMPLES = [
  {
    name: 'Text Reveal',
    code: `createVideo({
  size: '720p',
  fps: 30,
  background: '#0a0a0f',
  scenes: [
    scene(4)
      .background(shape.gradient('135deg', '#0a0a0f', '#1a0a2e'))
      .add(
        shape.particles(30, { color: '#7c3aed', speed: 0.3 }).opacity(0.4),
        text('VELOX')
          .center({ offsetY: -30 })
          .size(120).weight(900).color('#ffffff')
          .in('slideUp', 0.8),
        text('Motion Graphics Engine')
          .center({ offsetY: 60 })
          .size(32).color('#a78bfa')
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
  background: '#050510',
  scenes: [
    scene(5)
      .background('#050510')
      .add(
        shape.circle(300).center().color('#6C63FF').opacity(0.12).in('zoomIn', 1.0),
        shape.circle(200).center().color('#FF6584').opacity(0.18).in('zoomIn', 0.8, { delay: 0.2 }),
        shape.circle(90).center().color('#ffffff').in('bounceIn', 0.6, { delay: 0.4 }),
        text('GEOMETRY')
          .center({ offsetY: 200 })
          .size(48).weight(700).color('#ffffff').letterSpacing(8)
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
  background: '#0f0f1a',
  scenes: [
    scene(5)
      .background('#0f0f1a')
      .add(
        text('Q4 Revenue')
          .center({ offsetY: -200 })
          .size(48).weight(700).color('#ffffff')
          .in('slideDown', 0.5),
        shape.barChart({
          data: [
            { label: 'Jan', value: 65, color: '#6C63FF' },
            { label: 'Feb', value: 80, color: '#7c3aed' },
            { label: 'Mar', value: 55, color: '#8b5cf6' },
            { label: 'Apr', value: 95, color: '#a78bfa' },
          ],
          showLabels: true,
          showValues: true,
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
  background: '#030303',
  scenes: [
    scene(5)
      .background('#030303')
      .add(
        text('MAKE')
          .center({ offsetX: -250, offsetY: -20 }).size(90).weight(900).color('#ffffff')
          .in('slideRight', 0.5),
        text('IT')
          .center({ offsetX: 0, offsetY: -20 }).size(90).weight(900).color('#7c3aed')
          .in('zoomIn', 0.4, { delay: 0.3 }),
        text('MOVE')
          .center({ offsetX: 250, offsetY: -20 }).size(90).weight(900).color('#ffffff')
          .in('slideLeft', 0.5, { delay: 0.5 }),
        text('velox motion graphics')
          .center({ offsetY: 100 }).size(24).color('#555').letterSpacing(4).uppercase()
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
  background: '#0a0a0f',
  scenes: [
    scene(4)
      .background('#0a0a0f')
      .add(
        text('Loading...').center({ offsetY: -60 }).size(40).weight(600).color('#ffffff').in('fadeIn', 0.4),
        shape.progressBar(100, { color: '#7c3aed', trackColor: 'rgba(124,58,237,0.15)' })
          .center({ offsetY: 20 }).size(500, 10)
          .in('expandX', 2.5, { delay: 0.5 }),
        text('Complete').center({ offsetY: 90 }).size(28).color('#7c3aed').in('fadeIn', 0.4, { delay: 3.0 }),
      ),
  ],
})`,
  },
]

// ─── Evaluator ───────────────────────────────────────────────────────────────

function evalVeloxCode(code: string): VeloxVideo {
  const cleaned = code
    .split('\n')
    .filter(line => !line.trim().startsWith('import '))
    .join('\n')
    .replace(/export\s+default\s+/, '')
    .trim()

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'createVideo', 'scene', 'text', 'shape', 'themes', 'resolveTheme',
    `"use strict"; return (${cleaned})`
  )
  return fn(createVideo, scene, text, shape, themes, resolveTheme)
}

// ─── Format time ─────────────────────────────────────────────────────────────

function fmtTime(frame: number, fps: number) {
  const s = Math.floor(frame / fps)
  const f = frame % fps
  return `${s}:${String(f).padStart(2, '0')}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlaygroundClient() {
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

      // Draw first frame then start loop
      drawCurrentFrame(0)
      setIsPlaying(true)
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
            <span className="pg-pane-title">video.ts</span>
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
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(124, 58, 237, 0.2);
          background: #0a0a0f;
          font-family: ui-monospace, 'Fira Code', monospace;
          margin: 0 -1rem;
        }

        /* Top bar */
        .pg-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: #111118;
          border-bottom: 1px solid rgba(124,58,237,0.15);
          flex-shrink: 0;
        }
        .pg-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pg-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.06em; font-family: inherit; }
        .pg-select {
          background: #1a1a2e;
          border: 1px solid rgba(124,58,237,0.3);
          color: #e2e8f0;
          border-radius: 6px;
          padding: 5px 10px;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          outline: none;
        }
        .pg-select:focus { border-color: #7c3aed; }
        .pg-render-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          border: none;
          color: white;
          border-radius: 8px;
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
          border-right: 1px solid rgba(124,58,237,0.15);
          overflow: hidden;
        }
        .pg-pane-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #111118;
          border-bottom: 1px solid rgba(124,58,237,0.1);
          flex-shrink: 0;
        }
        .pg-pane-dot { width: 10px; height: 10px; border-radius: 50%; }
        .pg-dot-red    { background: #ff5f57; }
        .pg-dot-yellow { background: #febc2e; }
        .pg-dot-green  { background: #28c840; }
        .pg-pane-title { font-size: 12px; color: #666; margin-left: 6px; }
        .pg-editor {
          flex: 1;
          width: 100%;
          background: #0d0d17;
          color: #c9d1d9;
          border: none;
          outline: none;
          resize: none;
          padding: 16px;
          font-size: 12.5px;
          line-height: 1.7;
          font-family: inherit;
          tab-size: 2;
        }
        .pg-editor::selection { background: rgba(124,58,237,0.3); }

        /* Preview pane */
        .pg-preview-pane {
          display: flex;
          flex-direction: column;
          width: 50%;
          overflow: hidden;
          background: #0a0a0f;
        }

        /* Tabs */
        .pg-tabs {
          display: flex;
          background: #111118;
          border-bottom: 1px solid rgba(124,58,237,0.15);
          flex-shrink: 0;
        }
        .pg-tab {
          padding: 8px 18px;
          font-size: 12px;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
        }
        .pg-tab:hover { color: #aaa; }
        .pg-tab--active { color: #e2e8f0; border-bottom-color: #7c3aed; }
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
          background: #060609;
        }
        .pg-canvas {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 4px;
          display: block;
        }
        .pg-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #444;
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
          background: #060609;
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
          background: #111118;
          border-top: 1px solid rgba(124,58,237,0.15);
          flex-shrink: 0;
        }
        .pg-ctrl-btn {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 6px;
          border-radius: 4px;
          transition: color 0.15s, background 0.15s;
          font-family: inherit;
        }
        .pg-ctrl-btn:hover { color: #e2e8f0; background: rgba(124,58,237,0.15); }
        .pg-ctrl-play { color: #a78bfa; font-size: 15px; }
        .pg-scrubber {
          flex: 1;
          appearance: none;
          height: 3px;
          border-radius: 2px;
          background: rgba(124,58,237,0.2);
          outline: none;
          cursor: pointer;
          accent-color: #7c3aed;
        }
        .pg-scrubber::-webkit-slider-thumb {
          appearance: none;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #7c3aed;
          cursor: pointer;
        }
        .pg-time {
          font-size: 11px;
          color: #555;
          white-space: nowrap;
          min-width: 72px;
          text-align: right;
        }
      `}</style>
    </div>
  )
}
