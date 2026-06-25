/**
 * Text drawing engine.
 * Uses standard Canvas 2D API — works in Node (@napi-rs/canvas) and browser.
 *
 * All text is word-wrapped by default: if `el.maxWidth` is not set, the renderer
 * falls back to `canvasWidth * 0.88` so text never overflows the safe zone.
 */
import type { TextElementConfig, TextListElementConfig, VeloxGradient } from '../types'
import type { AnimationState } from './animations'
import { setCanvasFilter, supportsCanvasFilter } from './canvasFilter'
import { colors as colorUtils } from '../color'

type Ctx = CanvasRenderingContext2D

function roundTextHighlight(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function primaryFontFamily(family: string): string {
  const first = family.split(',')[0]?.trim() ?? family
  return first.replace(/^['"]|['"]$/g, '')
}

function buildFont(
  size: number,
  weight: number = 400,
  family: string = 'Inter',
  italic: boolean = false
): string {
  const primary = primaryFontFamily(family)
  return `${italic ? 'italic ' : ''}${weight} ${size}px "${primary}"`
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
  canvasHeight: number,
  localFrame?: number,
  fps?: number,
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

  // Caption karaoke: dim inactive words, highlight active word
  if (el.caption && localFrame !== undefined && fps) {
    const t = localFrame / fps
    const { cueStartSec, wordStepSec, wordIndex, totalWords, style } = el.caption
    const relativeT = Math.max(0, t - cueStartSec)
    const activeIndex = Math.min(
      totalWords - 1,
      Math.max(0, Math.floor(relativeT / Math.max(wordStepSec, 0.08))),
    )
    const isActive = wordIndex === activeIndex
    if (style === 'slam' && relativeT > 0 && !isActive) return
    if (style === 'karaoke' || style === 'highlightKeywords') {
      if (isActive) {
        fontWeight = Math.max(fontWeight, 800)
      } else if (relativeT > 0) {
        fontWeight = 500
        color = colorUtils.dimCaption(color, 0.38)
      }
    } else if (style === 'wordPop' && !isActive && relativeT > 0) {
      color = colorUtils.dimCaption(color, 0.45)
    }
  }

  ctx.save()

  // Apply animation transform
  ctx.globalAlpha = Math.max(0, Math.min(1, state.opacity))
  setCanvasFilter(ctx, state.blur > 0 ? `blur(${state.blur}px)` : 'none')

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

  const anchorX = (() => {
    if (shouldCenterBlock || textAlign === 'left') return -maxWidth / 2
    if (textAlign === 'right') return maxWidth / 2
    return 0
  })()

  const clipLeft = -maxWidth / 2

  ctx.textAlign = textAlign as CanvasTextAlign
  ctx.textBaseline = 'middle'

  // Clip to maxHeight if specified
  if (maxHeight) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(clipLeft, -maxHeight / 2, maxWidth, maxHeight)
    ctx.clip()
  }

  // Vertical mask reveal (heroCinematic / maskRevealUp)
  if (state.clipRevealY !== undefined && state.clipRevealY < 1) {
    ctx.save()
    ctx.beginPath()
    const blockTop = -totalHeight / 2
    const revealH = totalHeight * state.clipRevealY
    ctx.rect(clipLeft, blockTop + totalHeight - revealH, maxWidth, revealH)
    ctx.clip()
  }

  lines.forEach((line, li) => {
    // Centre the block of lines vertically around the draw point
    const lineY = (li - (lines.length - 1) / 2) * lineH

    // Karaoke active-word pill behind text
    if (el.caption && localFrame !== undefined && fps) {
      const t = localFrame / fps
      const { cueStartSec, wordStepSec, wordIndex, style } = el.caption
      const relativeT = Math.max(0, t - cueStartSec)
      const activeIndex = Math.min(
        el.caption.totalWords - 1,
        Math.max(0, Math.floor(relativeT / Math.max(wordStepSec, 0.08))),
      )
      if ((style === 'karaoke' || style === 'highlightKeywords') && wordIndex === activeIndex && relativeT >= 0) {
        const measured = ctx.measureText(line)
        const w = measured.width + letterSpacing * Math.max(0, line.length - 1)
        const padX = 14
        const padY = 8
        const bx = anchorX + (textAlign === 'right' ? -w : textAlign === 'center' ? -w / 2 : 0) - padX
        const by = lineY - fontSize / 2 - padY
        ctx.save()
        ctx.fillStyle =
          style === 'highlightKeywords'
            ? colorUtils.alpha(color, 0.22)
            : colorUtils.dimCaption(color, 0.14)
        roundTextHighlight(ctx, bx, by, w + padX * 2, fontSize + padY * 2, 10)
        ctx.fill()
        ctx.restore()
      }
    }

    // Clip reveal (typewriter / revealLeft)
    if (state.clipReveal < 1) {
      const measured = ctx.measureText(line)
      const w = measured.width + letterSpacing * Math.max(0, line.length - 1)
      const clipW = w * state.clipReveal
      ctx.save()
      ctx.beginPath()
        const clipX = anchorX + (textAlign === 'right' ? -w : textAlign === 'center' ? -w / 2 : 0)
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
        ctx.fillText(ch, cx + anchorX, lineY)
        cx += ctx.measureText(ch).width + letterSpacing
      }
      ctx.restore()
    } else {
      ctx.fillText(line, anchorX, lineY)
    }

    if (state.clipReveal < 1) ctx.restore()
  })

  if (maxHeight) ctx.restore()
  if (state.clipRevealY !== undefined && state.clipRevealY < 1) ctx.restore()

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
