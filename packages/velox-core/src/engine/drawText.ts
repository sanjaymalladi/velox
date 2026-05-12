/**
 * Text drawing engine.
 * Uses standard Canvas 2D API — works in Node (@napi-rs/canvas) and browser.
 *
 * All text is word-wrapped by default: if `el.maxWidth` is not set, the renderer
 * falls back to `canvasWidth * 0.88` so text never overflows the safe zone.
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

// ─── Word-Wrap ────────────────────────────────────────────────────────────────

/**
 * Break `text` into lines that each fit within `maxWidth` pixels.
 * Respects explicit `\n` line breaks in the source string.
 */
function wrapLines(ctx: Ctx, text: string, maxWidth: number): string[] {
  const result: string[] = []

  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ')
    let line = ''

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate
      } else {
        if (line) result.push(line)
        // If a single word is wider than maxWidth, push it as-is (unavoidable)
        line = word
      }
    }
    if (line) result.push(line)
  }

  return result.length ? result : ['']
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
  let {
    content,
    fontSize = 48,
    fontWeight = 400,
    fontFamily = 'Inter',
    color = '#ffffff',
    gradient,
    letterSpacing = 0,
    lineHeight = 1.4,
    textTransform = 'none',
    fontStyle,
    textAlign = 'center',
    maxHeight,
  } = el

  // Safe-zone default: 88% of canvas width
  const maxWidth = el.maxWidth ?? Math.round(canvasWidth * 0.88)

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

  // Dynamic Font Scaler to prevent massive overflow
  let lines: string[] = []
  let lineH = 0
  let totalHeight = 0
  const maxAllowedHeight = maxHeight ?? (canvasHeight * 0.88)
  
  while (fontSize >= 18) { // Don't shrink below 18 to avoid cramped illegible text
    ctx.font = buildFont(fontSize, fontWeight, fontFamily, fontStyle === 'italic')
    lines = wrapLines(ctx, displayText, maxWidth)
    lineH = fontSize * lineHeight
    totalHeight = lines.length * lineH
    
    if (totalHeight <= maxAllowedHeight) {
      break
    }
    fontSize -= 2
  }

  const shouldCenterBlock = lines.length > 3 && textAlign === 'center'

  // Force left-align for massive blocks of code/text to avoid cramped centered strips
  if (shouldCenterBlock) {
    textAlign = 'left'
  }

  ctx.textAlign = textAlign as CanvasTextAlign
  ctx.textBaseline = 'middle'

  // Clip to maxHeight if specified
  if (maxHeight) {
    ctx.save()
    ctx.beginPath()
    const clipX = textAlign === 'center' || shouldCenterBlock ? -maxWidth / 2 : 0
    ctx.rect(clipX, -maxHeight / 2, maxWidth, maxHeight)
    ctx.clip()
  }

  lines.forEach((line, li) => {
    // Centre the block of lines vertically around the draw point
    const lineY = (li - (lines.length - 1) / 2) * lineH

    // Clip reveal (typewriter / revealLeft)
    if (state.clipReveal < 1) {
      const measured = ctx.measureText(line)
      const w = measured.width + letterSpacing * Math.max(0, line.length - 1)
      const clipW = w * state.clipReveal
      ctx.save()
      ctx.beginPath()
        const clipX = shouldCenterBlock ? -maxWidth / 2 : -w / 2
        ctx.rect(clipX, lineY - fontSize, clipW, fontSize * 2)
      ctx.clip()
    }

    // Gradient fill on text
    if (gradient) {
      const measured = ctx.measureText(line)
      const w = measured.width + letterSpacing * Math.max(0, line.length - 1)
      applyGradientFill(ctx, gradient, -w / 2, lineY - fontSize / 2, w, fontSize)
    } else {
      ctx.fillStyle = color
    }

    // Draw with letter spacing
    if (letterSpacing !== 0) {
      let cx = 0
      ctx.save()
      if (textAlign === 'center') {
        const total = line.split('').reduce((acc, ch) => acc + ctx.measureText(ch).width + letterSpacing, 0)
        // Subtract the extra trailing letterSpacing
        cx = -(total - letterSpacing) / 2
        ctx.textAlign = 'left' 
      }
      for (const ch of line) {
        ctx.fillText(ch, cx + (shouldCenterBlock ? -maxWidth / 2 : 0), lineY)
        cx += ctx.measureText(ch).width + letterSpacing
      }
      ctx.restore()
    } else {
      ctx.fillText(line, shouldCenterBlock ? -maxWidth / 2 : 0, lineY)
    }

    if (state.clipReveal < 1) ctx.restore()
  })

  if (maxHeight) ctx.restore()

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

  // Default max width: from drawX position to 6% right margin
  const maxWidth = el.maxWidth ?? Math.round(canvasWidth * 0.88) - drawX

  ctx.font = buildFont(fontSize, fontWeight, fontFamily)
  ctx.textBaseline = 'middle'

  let cursorY = drawY

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

    const prefix = bullet ? `${bullet} ` : ''
    const prefixWidth = ctx.measureText(prefix).width
    const textMaxWidth = Math.max(maxWidth - prefixWidth, 100)

    // Word-wrap each list item
    const wrappedLines = wrapLines(ctx, item, textMaxWidth)
    const lineH = fontSize * 1.3

    ctx.save()
    ctx.globalAlpha = opacity
    ctx.translate(0, offsetY)
    ctx.fillStyle = color
    ctx.textAlign = 'left'

    wrappedLines.forEach((line, li) => {
      const y = cursorY + li * lineH
      ctx.fillText((li === 0 ? prefix : '  ') + line, drawX, y)
    })

    ctx.restore()

    cursorY += wrappedLines.length * lineH + gap
  })
}
