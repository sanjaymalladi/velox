/**
 * Shape drawing engine.
 * Uses standard Canvas 2D API — works in Node (@napi-rs/canvas) and browser.
 */
import type { ShapeElementConfig, ShapeConfig, VeloxGradient, ChartDataPoint } from '../types'
import type { AnimationState } from './animations'
import { lerp } from './easing'

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
    ctx.fillStyle = makeGradient(ctx, shape.gradient as any, x, y, w, h)
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

  const maxVal = Math.max(...data.map(d => d.value))
  const barW = (w - (data.length - 1) * 12) / data.length
  const labelFont = `500 14px "Inter"`

  data.forEach((d, i) => {
    const barH = (d.value / maxVal) * h * progress * 0.85
    const bx = x + i * (barW + 12)
    const by = y + h - barH - 30 // 30px for labels

    // Bar
    ctx.fillStyle = d.color ?? '#6C63FF'
    roundRect(ctx, bx, by, barW, barH, 4)
    ctx.fill()

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = labelFont
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(d.label, bx + barW / 2, y + h - 24)

    // Value
    if (progress > 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${d.value}%`, bx + barW / 2, by - 4)
    }
  })
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
    case 'progressBar':
      drawProgressBar(ctx, shape, -w / 2, -h / 2, w, h, state.clipReveal)
      break
  }

  ctx.restore()
}
