/**
 * Shape drawing engine.
 * Uses standard Canvas 2D API — works in Node (@napi-rs/canvas) and browser.
 */
import type { ShapeElementConfig, ShapeConfig, VeloxGradient, ChartDataPoint } from '../types'
import type { AnimationState } from './animations'
import { lerp } from './easing'
import * as d3 from 'd3'
import { interpolate as interpolatePath } from 'flubber'

type Ctx = CanvasRenderingContext2D

// ─── Gradient Fill ────────────────────────────────────────────────────────────

function makeGradient(
  ctx: Ctx, gradient: VeloxGradient,
  x: number, y: number, w: number, h: number
): CanvasGradient {
  const angle = (parseFloat(gradient.angle) * Math.PI) / 180
  const len = Math.sqrt(w * w + h * h)
  const cx = x + w / 2, cy = y + h / 2
  const grad = ctx.createLinearGradient(
    cx - Math.cos(angle) * len / 2, cy - Math.sin(angle) * len / 2,
    cx + Math.cos(angle) * len / 2, cy + Math.sin(angle) * len / 2
  )
  gradient.stops.forEach((stop, i) => { grad.addColorStop(i / (gradient.stops.length - 1), stop) })
  return grad
}

// ─── Rounded Rect ─────────────────────────────────────────────────────────────

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number = 0): void {
  if (r === 0) { ctx.rect(x, y, w, h); return }
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
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

// ─── Shape Drawers ────────────────────────────────────────────────────────────

function drawRect(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, opacity: number, progress: number
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
  roundRect(ctx, x, y, w, h * progress, shape.borderRadius ?? 0)
  ctx.fill()
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
  x: number, y: number, w: number, h: number, frame: number
): void {
  const count = shape.count ?? 30
  ctx.fillStyle = shape.color ?? 'rgba(255,255,255,0.6)'
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random using index seed
    const seed = (i * 7919 + 13) % 1000
    const px = x + ((seed * 97) % 1000) / 1000 * w
    const speed = shape.speed ?? 0.5
    const py = ((y + ((seed * 43) % 1000) / 1000 * h) - frame * speed * ((seed % 3) + 0.5)) % (y + h)
    const pyWrapped = py < y ? py + h : py
    const r = 1.5 + (seed % 4)
    const alpha = 0.1 + (seed % 7) / 10

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(px, pyWrapped, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawBarChart(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, progress: number
): void {
  const data: ChartDataPoint[] = shape.data ?? []
  if (data.length === 0) return

  // Premium D3 Scales
  const xScale = d3.scaleBand()
    .domain(data.map((d, i) => i.toString()))
    .range([x + 30, x + w - 10]) // Left padding for Y axis
    .padding(0.3)

  const maxVal = d3.max(data, d => d.value) ?? 100
  const yScale = d3.scaleLinear()
    .domain([0, maxVal * 1.1]) // 10% headroom
    .range([y + h - 30, y + 20]) // Bottom padding for labels

  const labelFont = `500 13px "Inter"`
  const axisFont = `400 12px "Inter"`
  
  // 1. Draw Grid Lines (Y-Axis Ticks)
  const ticks = yScale.ticks(4)
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)' // Subtle grid
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = 1
  ctx.font = axisFont
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  
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
    const bx = xScale(i.toString())!
    const bw = xScale.bandwidth()
    
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
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
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
}

function drawLineChart(
  ctx: Ctx, shape: ShapeConfig,
  x: number, y: number, w: number, h: number, progress: number
): void {
  const series = shape.series ?? []
  if (series.length === 0) return

  const values = series.flatMap(s => s.values)
  const maxVal = d3.max(values) ?? 100
  const minVal = d3.min(values) ?? 0
  const maxLength = d3.max(series, s => s.values.length) ?? 1
  const xScale = d3.scaleLinear().domain([0, Math.max(1, maxLength - 1)]).range([x + 34, x + w - 18])
  const yScale = d3.scaleLinear().domain([Math.min(0, minVal), maxVal * 1.08]).range([y + h - 34, y + 22])
  const curve = shape.curve === 'step' ? d3.curveStepAfter : shape.curve === 'linear' ? d3.curveLinear : d3.curveCatmullRom.alpha(0.5)
  const line = d3.line<number>().x((_, i) => xScale(i)).y(v => yScale(v)).curve(curve)

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'
  ctx.lineWidth = 1
  for (const tick of yScale.ticks(4)) {
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
    const path = line(serie.values)
    if (!path) continue
    ctx.strokeStyle = serie.color ?? d3.schemeTableau10[index % d3.schemeTableau10.length]
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke(new Path2D(path))
  }
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
  const pie = d3.pie<ChartDataPoint>().value(d => d.value).sort(null).endAngle(Math.PI * 2 * progress)
  const arc = d3.arc<d3.PieArcDatum<ChartDataPoint>>().innerRadius(inner).outerRadius(r)

  ctx.save()
  ctx.translate(x, y)
  pie(data).forEach((slice, index) => {
    const path = arc(slice)
    if (!path) return
    ctx.fillStyle = slice.data.color ?? d3.schemeTableau10[index % d3.schemeTableau10.length]
    ctx.fill(new Path2D(path))
  })
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
  const path = interpolatePath(paths[index], paths[next], { maxSegmentLength: 8 })(t)

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

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, state.opacity))
  ctx.filter = state.blur > 0 ? `blur(${state.blur}px)` : 'none'

  ctx.translate(drawX + state.x, drawY + state.y)
  if (state.scaleX !== 1 || state.scaleY !== 1) ctx.scale(state.scaleX, state.scaleY)
  if (state.rotation !== 0) ctx.rotate((state.rotation * Math.PI) / 180)

  const p = state.scaleY // growUp progress comes through scaleY for shapes
  const progress = shape.shapeType === 'growUp' ? p : state.clipReveal

  switch (shape.shapeType) {
    case 'rect':
      drawRect(ctx, shape, -w / 2, -h / 2, w, h, 1, state.clipReveal)
      break
    case 'circle':
      drawCircle(ctx, shape, 0, 0, (shape.width ?? 100) / 2, 1)
      break
    case 'line':
      drawLine(ctx, shape, -(w / 2), 0, w, state.clipReveal, 1)
      break
    case 'particles':
      drawParticles(ctx, shape, -w / 2, -h / 2, w, h, frame)
      break
    case 'barChart':
      drawBarChart(ctx, shape, -w / 2, -h / 2, w, h, state.clipReveal)
      break
    case 'lineChart':
      drawLineChart(ctx, shape, -w / 2, -h / 2, w, h, state.clipReveal)
      break
    case 'donutChart':
      drawDonutChart(ctx, shape, 0, 0, w, h, state.clipReveal)
      break
    case 'morphBlob':
      drawMorphBlob(ctx, shape, -w / 2, -h / 2, w, h, frame, state.opacity)
      break
    case 'progressBar':
      drawProgressBar(ctx, shape, -w / 2, -h / 2, w, h, state.clipReveal)
      break
  }

  ctx.restore()
}
