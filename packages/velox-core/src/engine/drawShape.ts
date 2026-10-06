/**
 * Shape drawing engine.
 * Uses standard Canvas 2D API — works in Node (@napi-rs/canvas) and browser.
 */
import type { ShapeElementConfig, ShapeConfig, VeloxGradient, ChartDataPoint } from '../types'
import type { PieArcDatum } from 'd3'
import type { AnimationState } from './animations'
import { setCanvasFilter, supportsCanvasFilter, applyElementBlur } from './canvasFilter'
import { lerp } from './easing'
import { colors as colorUtils } from '../color'
import { getD3, getFlubber, preloadHeavyDeps } from './lazyDeps'

type Ctx = CanvasRenderingContext2D

// ─── Gradient Fill ────────────────────────────────────────────────────────────

function makeGradient(
  ctx: Ctx, gradient: VeloxGradient,
  x: number, y: number, w: number, h: number
): CanvasGradient {
  // CSS convention: 0deg points up (to top), 90deg points right.
  const rad = (parseFloat(gradient.angle ?? '0') * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const len = Math.sqrt(w * w + h * h)
  const cx = x + w / 2, cy = y + h / 2
  const grad = ctx.createLinearGradient(
    cx - (dx * len) / 2, cy - (dy * len) / 2,
    cx + (dx * len) / 2, cy + (dy * len) / 2
  )
  const stops = gradient.stops
  if (stops.length === 0) {
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
  } else if (stops.length === 1) {
    grad.addColorStop(0, stops[0])
    grad.addColorStop(1, stops[0])
  } else {
    stops.forEach((stop, i) => { grad.addColorStop(i / (stops.length - 1), stop) })
  }
  return grad
}

// ─── Rounded Rect ─────────────────────────────────────────────────────────────

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number = 0): void {
  ctx.beginPath()
  if (r === 0) { ctx.rect(x, y, w, h); return }
  const rad = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + rad, y)
  ctx.lineTo(x + w - rad, y)
  ctx.arcTo(x + w, y, x + w, y + rad, rad)
  ctx.lineTo(x + w, y + h - rad)
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad)
  ctx.lineTo(x + rad, y + h)
  ctx.arcTo(x, y + h, x, y + h - rad, rad)
  ctx.lineTo(x, y + rad)
  ctx.arcTo(x, y, x + rad, y, rad)
  ctx.closePath()
}

// ─── Chart theme helpers ──────────────────────────────────────────────────────

function chartInk(series: { color?: string }[]): { grid: string; label: string; plot: string; onLight: boolean } {
  const hasDarkInk = series.some((s) => s.color && !colorUtils.isLight(s.color))
  const onLight = hasDarkInk || series.length === 0
  return onLight
    ? { onLight: true, grid: 'rgba(0,0,0,0.12)', label: 'rgba(0,0,0,0.55)', plot: 'rgba(0,0,0,0.06)' }
    : { onLight: false, grid: 'rgba(255,255,255,0.14)', label: 'rgba(255,255,255,0.7)', plot: 'rgba(255,255,255,0.08)' }
}

// ─── Shape Drawers ────────────────────────────────────────────────────────────

// Lightweight scale fallbacks used when d3 hasn't been lazy-loaded yet.
function linScale(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const dd = d1 - d0 || 1
  return (v: number) => r0 + ((v - d0) / dd) * (r1 - r0)
}
function bandScale(count: number, r0: number, r1: number, padding = 0.3) {
  const step = (r1 - r0) / Math.max(1, count)
  const inner = step * (1 - padding)
  return {
    bandwidth: () => inner,
    pos: (i: number) => r0 + step * i + (step - inner) / 2,
  }
}
function niceTicks(min: number, max: number, count: number): number[] {
  const step = (max - min || 1) / Math.max(1, count)
  const ticks: number[] = []
  for (let i = 0; i <= count; i++) ticks.push(Math.round((min + step * i) * 100) / 100)
  return ticks
}
function maxVal<T>(arr: T[], sel: (t: T) => number): number {
  return arr.reduce((m, d) => Math.max(m, sel(d)), -Infinity)
}
function minVal<T>(arr: T[], sel: (t: T) => number): number {
  return arr.reduce((m, d) => Math.min(m, sel(d)), Infinity)
}
const FALLBACK_PALETTE = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
]

function drawRect(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, opacity: number, revealX = 1
): void {
  ctx.globalAlpha = opacity
  if (shape.gradient) {
    ctx.fillStyle = makeGradient(ctx, shape.gradient, x, y, w, h)
  } else {
    ctx.fillStyle = shape.color ?? '#6C63FF'
  }
  if (shape.shadow) {
    ctx.shadowColor = shape.shadow.color ?? 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = shape.shadow.blur ?? 20
    ctx.shadowOffsetX = shape.shadow.offsetX ?? 0
    ctx.shadowOffsetY = shape.shadow.offsetY ?? 0
  }
  ctx.save()
  if (revealX < 1) {
    ctx.beginPath()
    ctx.rect(x, y, w * revealX, h)
    ctx.clip()
  }
  roundRect(ctx, x, y, w, h, shape.borderRadius ?? 0)
  ctx.fill()
  ctx.restore()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

function drawCircle(
  ctx: Ctx, shape: ShapeConfig,
  cx: number, cy: number, r: number, opacity: number
): void {
  ctx.globalAlpha = opacity
  ctx.fillStyle = shape.color ?? '#6C63FF'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawLine(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, len: number, progress: number, opacity: number
): void {
  ctx.globalAlpha = opacity
  ctx.strokeStyle = shape.color ?? '#6C63FF'
  ctx.lineWidth = shape.thickness ?? 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + len * progress, y)
  ctx.stroke()
}

function drawParticles(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, frame: number, opacity = 1
): void {
  const count = shape.count ?? 30
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random using index seed
    const seed = (i * 7919 + 13) % 1000
    const px = x + ((seed * 97) % 1000) / 1000 * w
    const speed = shape.speed ?? 0.5
    const baseY = ((seed * 43) % 1000) / 1000 * h
    const pyRel = (((baseY - frame * speed * ((seed % 3) + 0.5)) % h) + h) % h
    const pyWrapped = y + pyRel
    const r = 1.5 + (seed % 4)
    const alpha = (0.1 + (seed % 7) / 10) * opacity

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = shape.color ?? 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(px, pyWrapped, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawNoise(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number
): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = shape.color ?? 'rgba(255,255,255,0.08)'
  ctx.fillRect(x, y, w, h)
  const speckles = Math.min(600, Math.floor((w * h) / 240))
  for (let i = 0; i < speckles; i++) {
    const s = (i * 2654435761) >>> 0
    const nx = x + ((s % 1000) / 1000) * w
    const ny = y + (((s / 1000) | 0) % 1000) / 1000 * h
    const a = 0.03 + (s % 5) / 100 * 0.06
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.fillRect(nx, ny, 2, 2)
  }
  ctx.restore()
}

function drawBarChart(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, progress: number
): void {
  const data: ChartDataPoint[] = shape.data ?? []
  if (data.length === 0) return

  // Clip to the element box so bars/tooltips never overflow.
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()

  const d3m = getD3()
  if (!d3m) void preloadHeavyDeps()

  const maxVal = d3m ? (d3m.max(data, d => d.value) ?? 100) : Math.max(100, ...data.map(d => d.value))
  const yScaleD3 = d3m
    ? d3m.scaleLinear().domain([0, maxVal * 1.1]).range([y + h - 30, y + 20])
    : null
  const yScale = yScaleD3 ?? linScale(0, maxVal * 1.1, y + h - 30, y + 20)
  const ticks = yScaleD3 ? yScaleD3.ticks(4) : niceTicks(0, maxVal * 1.1, 4)

  let bxOf: (i: number) => number
  let bwOf: () => number
  if (d3m) {
    const xb = d3m.scaleBand().domain(data.map((d, i) => i.toString())).range([x + 30, x + w - 10]).padding(0.3)
    bxOf = (i: number) => xb(i.toString())!
    bwOf = () => xb.bandwidth()
  } else {
    const band = bandScale(data.length, x + 30, x + w - 10, 0.3)
    bxOf = (i: number) => band.pos(i)
    bwOf = () => band.bandwidth()
  }

  const labelFont = `500 13px "Inter"`
  const axisFont = `400 12px "Inter"`
  const ink = chartInk(data.map((d) => ({ color: d.color })))
  
  // 1. Draw Grid Lines (Y-Axis Ticks)
  ticks.forEach(tick => {
    const ty = yScale(tick)
    // Grid line
    ctx.beginPath()
    ctx.moveTo(x + 30, ty)
    ctx.lineTo(x + w - 10, ty)
    ctx.stroke()
    // Axis label
    ctx.fillText(tick.toString(), x + 20, ty)
  })
  ctx.restore()

  // 2. Draw Bars and Data Labels
  data.forEach((d, i) => {
    const bx = bxOf(i)
    const bw = bwOf()
    
    // Animate from bottom
    const bottomY = yScale(0)
    const targetY = yScale(d.value)
    
    // Stagger progress per bar
    const delay = (i / data.length) * 0.4
    const barProgress = Math.max(0, Math.min(1, (progress - delay) / 0.6))
    
    // Ease the bar progress (easeOutCubic)
    const easedP = 1 - Math.pow(1 - barProgress, 3)
    
    const by = bottomY - (bottomY - targetY) * easedP
    const barH = bottomY - by

    // Draw Bar
    if (barH > 0) {
      ctx.fillStyle = d.color ?? '#6C63FF'
      // Only round the top corners for bars
      ctx.beginPath()
      const rad = Math.min(bw / 2, barH, 6)
      ctx.moveTo(bx + rad, by)
      ctx.lineTo(bx + bw - rad, by)
      ctx.arcTo(bx + bw, by, bx + bw, by + rad, rad)
      ctx.lineTo(bx + bw, bottomY)
      ctx.lineTo(bx, bottomY)
      ctx.lineTo(bx, by + rad)
      ctx.arcTo(bx, by, bx + rad, by, rad)
      ctx.closePath()
      ctx.fill()
    }

    // X-Axis Label
    ctx.fillStyle = ink.label
    ctx.font = labelFont
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(d.label, bx + bw / 2, bottomY + 12)

    // Value Tooltip (pops in at end)
    if (barProgress > 0.8) {
      const tooltipP = (barProgress - 0.8) / 0.2
      ctx.fillStyle = `rgba(255,255,255,${tooltipP})`
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${d.value}%`, bx + bw / 2, by - 6)
    }
  })
  ctx.restore()
}

function drawLineChart(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, progress: number
): void {
  const series = shape.series ?? []
  if (series.length === 0) return

  // Clip to the element box so the plot never overflows.
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()

  const values = series.flatMap(s => s.values)
  const d3m = getD3()
  if (!d3m) void preloadHeavyDeps()
  const maxVal = d3m ? (d3m.max(values) ?? 100) : Math.max(100, ...values)
  const minVal = d3m ? (d3m.min(values) ?? 0) : Math.min(0, ...values)
  const maxLength = d3m ? (d3m.max(series, s => s.values.length) ?? 1) : Math.max(1, ...series.map(s => s.values.length))
  const xScale = d3m
    ? d3m.scaleLinear().domain([0, Math.max(1, maxLength - 1)]).range([x + 34, x + w - 18])
    : linScale(0, Math.max(1, maxLength - 1), x + 34, x + w - 18)
  const yScaleD3 = d3m
    ? d3m.scaleLinear().domain([Math.min(0, minVal), maxVal * 1.08]).range([y + h - 34, y + 22])
    : null
  const yScale = yScaleD3 ?? linScale(Math.min(0, minVal), maxVal * 1.08, y + h - 34, y + 22)
  const ink = chartInk(series)

  ctx.save()
  ctx.fillStyle = ink.onLight ? '#ececf0' : 'rgba(255,255,255,0.1)'
  ctx.fillRect(x + 34, y + 22, w - 52, h - 56)

  ctx.strokeStyle = ink.grid
  ctx.lineWidth = 1
  for (const tick of (yScaleD3 ? yScaleD3.ticks(4) : niceTicks(Math.min(0, minVal), maxVal * 1.08, 4))) {
    const ty = yScale(tick)
    ctx.beginPath()
    ctx.moveTo(x + 34, ty)
    ctx.lineTo(x + w - 18, ty)
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.rect(x + 34, y, (w - 52) * progress, h)
  ctx.clip()

  for (const [index, serie] of series.entries()) {
    const fallback = ink.onLight
      ? ['#e91d2a', '#111111', '#2563eb']
      : ['#ff6b6b', '#ffffff', '#93c5fd']
    ctx.strokeStyle = serie.color ?? fallback[index % fallback.length]
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Polyline fallback avoids @napi-rs/canvas Path2D stroke filling the plot area on some paths.
    const pts = serie.values.map((v, i) => [xScale(i), yScale(v)] as const)
    ctx.beginPath()
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)))
    ctx.stroke()
  }
  ctx.restore()
  ctx.restore()
}

function drawDonutChart(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, progress: number
): void {
  const data = shape.data ?? []
  if (data.length === 0) return
  const r = Math.min(w, h) / 2
  const inner = r * (shape.innerRadius ?? 0.58)
  const d3m = getD3()
  if (!d3m) void preloadHeavyDeps()

  ctx.save()
  ctx.translate(x, y)
  if (d3m) {
    const pie = d3m.pie<ChartDataPoint>().value(d => d.value).sort(null).endAngle(Math.PI * 2 * progress)
    const arc = d3m.arc<PieArcDatum<ChartDataPoint>>().innerRadius(inner).outerRadius(r)
    pie(data).forEach((slice, index) => {
      const path = arc(slice)
      if (!path) return
      ctx.fillStyle = slice.data.color ?? d3m.schemeTableau10[index % d3m.schemeTableau10.length]
      ctx.fill(new Path2D(path))
    })
  } else {
    // Manual wedge fallback (no d3).
    const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1
    let a0 = -Math.PI / 2
    data.forEach((d, index) => {
      const ang = ((d.value || 0) / total) * Math.PI * 2 * progress
      const a1 = a0 + ang
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, r, a0, a1)
      ctx.arc(0, 0, inner, a1, a0, true)
      ctx.closePath()
      ctx.fillStyle = d.color ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]
      ctx.fill()
      a0 = a1
    })
  }
  ctx.restore()
}

function drawMorphBlob(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, frame: number, opacity: number
): void {
  const paths = shape.paths ?? []
  if (paths.length === 0) return
  const index = Math.floor(frame / 90) % paths.length
  const next = (index + 1) % paths.length
  const t = (frame % 90) / 90
  const fl = getFlubber()
  if (!fl) void preloadHeavyDeps()
  const path = fl
    ? fl.interpolate(paths[index], paths[next], { maxSegmentLength: 8 })(t)
    : paths[index]

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.translate(x, y)
  ctx.scale(w / 100, h / 100)
  ctx.fillStyle = shape.color ?? '#a78bfa'
  ctx.fill(new Path2D(path))
  ctx.restore()
}

function drawProgressBar(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, progress: number
): void {
  const trackH = h || 8
  const value = (shape.value ?? 75) / 100

  // Track
  ctx.fillStyle = shape.trackColor ?? 'rgba(255,255,255,0.15)'
  roundRect(ctx, x, y, w, trackH, trackH / 2)
  ctx.fill()

  // Fill
  ctx.fillStyle = shape.color ?? '#6C63FF'
  roundRect(ctx, x, y, w * value * progress, trackH, trackH / 2)
  ctx.fill()
}

// ─── Master Dispatcher ───────────────────────────────────────────────────────

export function drawShape(
  ctx: Ctx,
  el: ShapeElementConfig,
  drawX: number,
  drawY: number,
  state: AnimationState,
  frame: number
): void {
  const { shape } = el
  const w = shape.width ?? 200
  const h = shape.height ?? 200
  const cx = drawX + state.x
  const cy = drawY + state.y

  const draw = (c: Ctx) => {
    c.save()
    c.globalAlpha = Math.max(0, Math.min(1, state.opacity))

    c.translate(cx, cy)
    if (shape.shapeType !== 'growUp' && (state.scaleX !== 1 || state.scaleY !== 1)) c.scale(state.scaleX, state.scaleY)
    if (state.rotation !== 0) c.rotate((state.rotation * Math.PI) / 180)

    if (state.clipRevealY !== undefined && state.clipRevealY < 1) {
      c.save()
      c.beginPath()
      c.rect(-w / 2, h / 2 - h * state.clipRevealY, w, h * state.clipRevealY)
      c.clip()
    }

    const p = state.scaleY // growUp progress comes through scaleY for shapes
    const progress = shape.shapeType === 'growUp' ? p : state.clipReveal

    switch (shape.shapeType) {
      case 'rect':
        drawRect(c, shape, -w / 2, -h / 2, w, h, state.opacity, state.clipReveal)
        break
      case 'circle':
        drawCircle(c, shape, 0, 0, (shape.width ?? 100) / 2, state.opacity)
        break
      case 'line':
        drawLine(c, shape, -(w / 2), 0, w, state.clipReveal, state.opacity)
        break
      case 'particles':
        drawParticles(c, shape, -w / 2, -h / 2, w, h, frame, state.opacity)
        break
      case 'noise':
        drawNoise(c, shape, -w / 2, -h / 2, w, h)
        break
      case 'growUp': {
        // Pivot at the bottom edge so the bar grows upward, not from center.
        c.save()
        c.translate(0, h / 2)
        c.scale(state.scaleX, state.scaleY)
        c.translate(0, -h / 2)
        drawRect(c, shape, -w / 2, -h / 2, w, h, state.opacity, 1)
        c.restore()
        break
      }
      case 'barChart':
        drawBarChart(c, shape, -w / 2, -h / 2, w, h, state.clipReveal)
        break
      case 'lineChart':
        drawLineChart(c, shape, -w / 2, -h / 2, w, h, state.clipReveal)
        break
      case 'donutChart':
        drawDonutChart(c, shape, 0, 0, w, h, state.clipReveal)
        break
      case 'morphBlob':
        drawMorphBlob(c, shape, -w / 2, -h / 2, w, h, frame, state.opacity)
        break
      case 'progressBar':
        drawProgressBar(c, shape, -w / 2, -h / 2, w, h, state.clipReveal)
        break
    }

    if (state.clipRevealY !== undefined && state.clipRevealY < 1) c.restore()

    c.restore()
  }

  if (state.blur > 0 && !supportsCanvasFilter) {
    const half = Math.max(w, h) / 2
    applyElementBlur(ctx, cx, cy, half, half, state.blur, draw)
  } else {
    if (supportsCanvasFilter && state.blur > 0) {
      ctx.save()
      setCanvasFilter(ctx, `blur(${state.blur}px)`)
    }
    draw(ctx)
    if (supportsCanvasFilter && state.blur > 0) ctx.restore()
  }
}
