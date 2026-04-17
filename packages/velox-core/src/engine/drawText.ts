/**
 * Text drawing engine.
 * Uses standard Canvas 2D API — works in Node (@napi-rs/canvas) and browser.
 */
import type { TextElementConfig, TextListElementConfig, VeloxGradient } from '../types'
import type { AnimationState } from './animations'

type Ctx = CanvasRenderingContext2D

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFont(
  size: number,
  weight: number = 400,
  family: string = 'Inter',
  italic: boolean = false
): string {
  return `${italic ? 'italic ' : ''}${weight} ${size}px "${family}"`
}

function applyGradientFill(
  ctx: Ctx,
  gradient: VeloxGradient,
  x: number, y: number,
  width: number, height: number
): void {
  const angle = (parseFloat(gradient.angle) * Math.PI) / 180
  const len = Math.sqrt(width * width + height * height)
  const cx = x + width / 2
  const cy = y + height / 2
  const gx1 = cx - (Math.cos(angle) * len) / 2
  const gy1 = cy - (Math.sin(angle) * len) / 2

  const grad = ctx.createLinearGradient(gx1, gy1, cx + (Math.cos(angle) * len) / 2, cy + (Math.sin(angle) * len) / 2)
  gradient.stops.forEach((stop, i) => {
    grad.addColorStop(i / (gradient.stops.length - 1), stop)
  })
  ctx.fillStyle = grad
}

// ─── Main Text Draw ───────────────────────────────────────────────────────────

export function drawText(
  ctx: Ctx,
  el: TextElementConfig,
  drawX: number,
  drawY: number,
  state: AnimationState,
  canvasWidth: number,
  canvasHeight: number
): void {
  const {
    content,
    fontSize = 48,
    fontWeight = 400,
    fontFamily = 'Inter',
    color = '#ffffff',
    gradient,
    letterSpacing = 0,
    lineHeight = 1.25,
    textTransform = 'none',
    fontStyle,
    textAlign = 'center',
  } = el

  const displayText = textTransform === 'uppercase' ? content.toUpperCase()
    : textTransform === 'lowercase' ? content.toLowerCase()
    : content

  ctx.save()

  // Apply animation transform
  ctx.globalAlpha = Math.max(0, Math.min(1, state.opacity))
  ctx.filter = state.blur > 0 ? `blur(${state.blur}px)` : 'none'

  // Position transform
  ctx.translate(drawX + state.x, drawY + state.y)
  if (state.scaleX !== 1 || state.scaleY !== 1) {
    ctx.scale(state.scaleX, state.scaleY)
  }
  if (state.rotation !== 0) {
    ctx.rotate((state.rotation * Math.PI) / 180)
  }

  ctx.font = buildFont(fontSize, fontWeight, fontFamily, fontStyle === 'italic')
  ctx.textAlign = textAlign as CanvasTextAlign
  ctx.textBaseline = 'middle'

  // Split lines
  const lines = displayText.split('\n')
  const lineH = fontSize * lineHeight

  lines.forEach((line, li) => {
    const lineY = (li - (lines.length - 1) / 2) * lineH

    // Clip reveal (typewriter / revealLeft)
    if (state.clipReveal < 1) {
      const measured = ctx.measureText(line)
      const w = measured.width + letterSpacing * (line.length - 1)
      const clipW = w * state.clipReveal
      ctx.save()
      ctx.beginPath()
      ctx.rect(-w / 2, lineY - fontSize, clipW, fontSize * 2)
      ctx.clip()
    }

    // Gradient fill on text
    if (gradient) {
      const measured = ctx.measureText(line)
      const w = measured.width
      applyGradientFill(ctx, gradient, -w / 2, lineY - fontSize / 2, w, fontSize)
    } else {
      ctx.fillStyle = color
    }

    // Draw with letter spacing
    if (letterSpacing !== 0) {
      let cx = 0
      if (textAlign === 'center') {
        const total = line.split('').reduce((acc, ch) => acc + ctx.measureText(ch).width + letterSpacing, 0)
        cx = -total / 2
      }
      for (const ch of line) {
        ctx.fillText(ch, cx, lineY)
        cx += ctx.measureText(ch).width + letterSpacing
      }
    } else {
      ctx.fillText(line, 0, lineY)
    }

    if (state.clipReveal < 1) ctx.restore()
  })

  ctx.restore()
}

// ─── Text List Draw ───────────────────────────────────────────────────────────

export function drawTextList(
  ctx: Ctx,
  el: TextListElementConfig,
  drawX: number,
  drawY: number,
  localFrame: number,
  fps: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const {
    items,
    fontSize = 28,
    fontWeight = 400,
    fontFamily = 'Inter',
    color = '#ffffff',
    gap = 20,
    bullet = '•',
    staggerAnimation,
    staggerInterval = 0.15,
  } = el

  ctx.font = buildFont(fontSize, fontWeight, fontFamily)
  ctx.textBaseline = 'middle'

  items.forEach((item, i) => {
    const itemDelay = i * staggerInterval * fps
    let opacity = 1
    let offsetY = 0

    if (staggerAnimation) {
      const progress = Math.max(0, Math.min(1, (localFrame - itemDelay) / (0.3 * fps)))
      if (progress <= 0) { opacity = 0 }
      else if (progress < 1) {
        opacity = progress
        if (staggerAnimation === 'slideUp') offsetY = (1 - progress) * 20
      }
    }

    const y = drawY + i * (fontSize + gap)
    const prefix = bullet ? `${bullet} ` : ''

    ctx.save()
    ctx.globalAlpha = opacity
    ctx.translate(0, offsetY)
    ctx.fillStyle = color
    ctx.textAlign = 'left'
    ctx.fillText(prefix + item, drawX, y)
    ctx.restore()
  })
}
