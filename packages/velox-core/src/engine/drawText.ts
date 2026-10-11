/**
 * Text drawing engine.
 * Uses standard Canvas 2D API — works in Node (@napi-rs/canvas) and browser.
 *
 * All text is word-wrapped by default: if `el.maxWidth` is not set, the renderer
 * falls back to `canvasWidth * 0.88` so text never overflows the safe zone.
 */
import type { TextElementConfig, TextListElementConfig, VeloxGradient } from '../types'
import type { AnimationState } from './animations'
import { buildCaptionWordSpans } from '../captions'
import type { CaptionTrack } from '../types'
import { setCanvasFilter, supportsCanvasFilter, applyElementBlur } from './canvasFilter'
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
  const angle = (parseFloat(gradient.angle ?? '0') * Math.PI) / 180
  const len = Math.sqrt(width * width + height * height)
  const cx = x + width / 2
  const cy = y + height / 2
  const gx1 = cx - (Math.cos(angle) * len) / 2
  const gy1 = cy - (Math.sin(angle) * len) / 2

  const grad = ctx.createLinearGradient(gx1, gy1, cx + (Math.cos(angle) * len) / 2, cy + (Math.sin(angle) * len) / 2)
  if (gradient.stops.length === 0) {
    ctx.fillStyle = 'transparent'
    return
  }
  if (gradient.stops.length === 1) {
    grad.addColorStop(0, gradient.stops[0])
    grad.addColorStop(1, gradient.stops[0])
  } else {
    gradient.stops.forEach((stop, i) => {
      grad.addColorStop(i / (gradient.stops.length - 1), stop)
    })
  }
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

  // Dynamic Font Scaler to prevent massive overflow (measured against the real ctx)
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

  const drawInto = (c: Ctx) => {
    c.save()
    c.globalAlpha = Math.max(0, Math.min(1, state.opacity))

    // Position transform
    c.translate(drawX + state.x, drawY + state.y)
    if (state.scaleX !== 1 || state.scaleY !== 1) {
      c.scale(state.scaleX, state.scaleY)
    }
    if (state.rotation !== 0) {
      c.rotate((state.rotation * Math.PI) / 180)
    }

    c.textAlign = textAlign as CanvasTextAlign
    c.textBaseline = 'middle'

    // Clip to maxHeight if specified
    if (maxHeight) {
      c.save()
      c.beginPath()
      c.rect(clipLeft, -maxHeight / 2, maxWidth, maxHeight)
      c.clip()
    }

    // Vertical mask reveal (heroCinematic / maskRevealUp)
    if (state.clipRevealY !== undefined && state.clipRevealY < 1) {
      c.save()
      c.beginPath()
      const blockTop = -totalHeight / 2
      const revealH = totalHeight * state.clipRevealY
      c.rect(clipLeft, blockTop + totalHeight - revealH, maxWidth, revealH)
      c.clip()
    }

    const capStyle = el.caption?.style
    const neonGlow = capStyle === 'neon'
    const outlineText = capStyle === 'outline'
    const effectiveGradient =
      gradient ??
      (capStyle === 'gradient'
        ? ({ angle: '90', stops: [color, '#ffffff'] } as VeloxGradient)
        : undefined)

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
          const measured = c.measureText(line)
          const w = measured.width + letterSpacing * Math.max(0, line.length - 1)
          const padX = 14
          const padY = 8
          const bx = anchorX + (textAlign === 'right' ? -w : textAlign === 'center' ? -w / 2 : 0) - padX
          const by = lineY - fontSize / 2 - padY
          c.save()
        c.fillStyle = el.caption.accent
            ? colorUtils.alpha(el.caption.accent, 0.26)
            : style === 'highlightKeywords'
              ? colorUtils.alpha(color, 0.22)
              : colorUtils.dimCaption(color, 0.14)
          roundTextHighlight(c, bx, by, w + padX * 2, fontSize + padY * 2, 10)
          c.fill()
          c.restore()
        }
      }

      // Clip reveal (typewriter / revealLeft)
      if (state.clipReveal < 1) {
        const measured = c.measureText(line)
        const w = measured.width + letterSpacing * Math.max(0, line.length - 1)
        const clipW = w * state.clipReveal
        c.save()
        c.beginPath()
        const clipX = anchorX + (textAlign === 'right' ? -w : textAlign === 'center' ? -w / 2 : 0)
        c.rect(clipX, lineY - fontSize, clipW, fontSize * 2)
        c.clip()
      }

      // Gradient fill on text
      if (effectiveGradient) {
        const measured = c.measureText(line)
        const w = measured.width + letterSpacing * Math.max(0, line.length - 1)
        applyGradientFill(c, effectiveGradient, -w / 2, lineY - fontSize / 2, w, fontSize)
      } else {
        c.fillStyle = color
      }

      // Draw with letter spacing
      if (letterSpacing !== 0) {
        let cx = 0
        c.save()
        if (textAlign === 'center') {
          const total = line.split('').reduce((acc, ch) => acc + c.measureText(ch).width + letterSpacing, 0)
          // Subtract the extra trailing letterSpacing
          cx = -(total - letterSpacing) / 2
          c.textAlign = 'left'
        }
        for (const ch of line) {
          c.fillText(ch, cx + anchorX, lineY)
          cx += c.measureText(ch).width + letterSpacing
        }
        c.restore()
      } else {
        if (neonGlow) {
          c.save()
          c.shadowColor = '#67e8f9'
          c.shadowBlur = Math.max(8, fontSize * 0.5)
          c.fillText(line, anchorX, lineY)
          c.restore()
        } else {
          c.fillText(line, anchorX, lineY)
        }
        if (outlineText) {
          c.save()
          c.lineWidth = Math.max(2, fontSize * 0.08)
          c.strokeStyle = 'rgba(8,8,16,0.85)'
          c.strokeText(line, anchorX, lineY)
          c.restore()
        }
      }

      if (state.clipReveal < 1) c.restore()
    })

    if (maxHeight) c.restore()
    if (state.clipRevealY !== undefined && state.clipRevealY < 1) c.restore()

    c.restore()
  }

  if (state.blur > 0 && !supportsCanvasFilter) {
    applyElementBlur(ctx, drawX + state.x, drawY + state.y, maxWidth / 2, totalHeight / 2, state.blur, drawInto)
  } else {
    if (supportsCanvasFilter && state.blur > 0) {
      ctx.save()
      setCanvasFilter(ctx, `blur(${state.blur}px)`)
    }
    drawInto(ctx)
    if (supportsCanvasFilter && state.blur > 0) ctx.restore()
  }
}

// ─── Caption Track (imported SRT/ASS) ────────────────────────────────────────

/**
 * Render a scene-level caption track (imported from SRT/ASS) as styled,
 * frame-accurate captions. Each word is drawn as its own element with a
 * `wordIndex` so the existing karaoke / highlight / dim logic applies.
 */
export function drawCaptionTrack(
  ctx: Ctx,
  track: CaptionTrack,
  localFrame: number,
  fps: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const t = localFrame / fps
  const style = track.style ?? 'karaoke'
  const cue = track.cues.find((c) => t >= c.start && t < (c.end ?? c.start + 4))
  if (!cue || !cue.text.trim()) return

  const duration = (cue.end ?? cue.start + 4) - cue.start
  const spans = buildCaptionWordSpans(cue.text, duration, style)
  if (spans.length === 0) return

  const wordStep = Math.max(0.08, duration / spans.length)
  const fontFamily = 'Inter, system-ui, sans-serif'
  const bottomOffset = track.bottomOffset ?? Math.round(canvasHeight * 0.08)
  const centerX = canvasWidth / 2
  const baseY = canvasHeight - bottomOffset
  const gap = (fs: number) => Math.round(fs * 0.32)

  // Shrink font until the single-row layout fits the safe zone.
  let fontSize = Math.max(18, Math.round(canvasWidth * 0.045))
  const maxRow = Math.min(canvasWidth * 0.92, Math.max(80, track.maxWidth ?? canvasWidth * 0.88))
  const measureRow = (fs: number): number => {
    ctx.font = buildFont(fs, 700, fontFamily)
    const g = gap(fs)
    return spans.reduce((acc, s) => acc + ctx.measureText(s.word).width, 0) + g * Math.max(0, spans.length - 1)
  }
  while (fontSize > 18 && measureRow(fontSize) > maxRow) fontSize -= 2

  ctx.font = buildFont(fontSize, 700, fontFamily)
  const g = gap(fontSize)
  const widths = spans.map((s) => ctx.measureText(s.word).width)
  const rows: Array<Array<{ index: number; width: number }>> = [[]]
  let rowWidth = 0
  widths.forEach((width, index) => {
    const nextWidth = rowWidth + (rows[rows.length - 1].length ? g : 0) + width
    if (rows[rows.length - 1].length && nextWidth > maxRow) {
      rows.push([])
      rowWidth = 0
    }
    const row = rows[rows.length - 1]
    row.push({ index, width })
    rowWidth += (row.length > 1 ? g : 0) + width
  })
  const rowOf = new Map<number, { row: number; x: number }>()
  rows.forEach((row, rowIndex) => {
    const rowW = row.reduce((sum, word) => sum + word.width, 0) + g * Math.max(0, row.length - 1)
    let x = centerX - rowW / 2
    for (const word of row) {
      rowOf.set(word.index, { row: rowIndex, x: x + word.width / 2 })
      x += word.width + g
    }
  })

  const state: AnimationState = {
    opacity: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, blur: 0, skewX: 0, clipReveal: 1,
  }

  spans.forEach((s, i) => {
    const w = widths[i]
    const placement = rowOf.get(i)!
    const drawX = placement.x
    const drawY = baseY - (rows.length - 1 - placement.row) * fontSize * 1.25
    const el: TextElementConfig = {
      type: 'text',
      id: `cap-${i}`,
      content: s.word,
      fontSize,
      fontWeight: 700,
      fontFamily,
      color: '#ffffff',
      textAlign: 'center',
      maxWidth: canvasWidth,
      caption: {
        style,
        wordIndex: i,
        cueStartSec: cue.start,
        wordStepSec: wordStep,
        totalWords: spans.length,
        accent: track.accent,
      },
    }
    drawText(ctx, el, drawX, drawY, state, canvasWidth, canvasHeight, localFrame, fps)
  })
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

  // Default max width: remaining space from this element's center to the right safe margin.
  const maxWidth = el.maxWidth ?? Math.max(120, Math.round(canvasWidth * 0.94) - drawX)

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
