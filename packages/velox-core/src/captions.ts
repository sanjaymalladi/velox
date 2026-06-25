/**
 * Captions — SRT ingest + karaoke / word timings using staggered delays.
 */

import type { EntranceAnimation } from './types'

export interface CaptionCue {
  start: number
  end?: number
  text: string
}

export interface BuildCaptionsOpts {
  maxWidth?: number
  bottomOffset?: number
  accent?: string
  bodyColor?: string
}

/** Minimal SRT parser (supports basic blocks). */
export function parseSrt(input: string): CaptionCue[] {
  const cues: CaptionCue[] = []
  const blocks = input.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/)
  for (const block of blocks) {
    const lines = block.trim().split('\n').filter(Boolean)
    if (lines.length < 2) continue
    let timeLineIdx = 0
    if (/^\d+$/.test(lines[0].trim())) timeLineIdx = 1
    const timeLine = lines[timeLineIdx]
    const m = timeLine.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/)
    if (!m) continue
    const textLines = lines.slice(timeLineIdx + 1).join(' ').trim()
    cues.push({
      start: parseSrtTs(m[1]),
      end: parseSrtTs(m[2]),
      text: textLines,
    })
  }
  return cues.sort((a, b) => a.start - b.start)
}

function parseSrtTs(s: string): number {
  const norm = s.replace(',', '.')
  const [hh, mm, rest] = norm.split(':')
  const ss = Number.parseFloat(rest)
  const h = Number(hh)
  const m = Number(mm)
  return ((h * 60 + m) * 60) + ss
}

export function splitWords(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean)
}

export type CaptionStyle =
  | 'plain'
  | 'pill'
  | 'karaoke'
  | 'wordPop'
  | 'highlightKeywords'
  | 'slam'
  | 'clipWipe'
  | 'weightShift'

/**
 * Produce per-line/per-word timings for karaoke from a caption cue inside a scene.
 * `cueStartScene` — seconds between scene start and this cue start.
 */
export function buildCaptionWordSpans(
  fullText: string,
  cueDuration: number,
  style: CaptionStyle,
): Array<{ word: string; delay: number; emphasize?: boolean }> {
  const words = splitWords(fullText)
  const step =
    cueDuration > 0
      ? Math.max(0.08, cueDuration / Math.max(words.length, 1))
      : Math.max(0.12, 1.8 / Math.max(words.length, 1))

  return words.map((word, index) => {
    const emphasize = style === 'highlightKeywords' && /^[#A-Za-z0-9]/.test(word) && word.length <= 22
    return { word: style === 'wordPop' ? word.toUpperCase() : word, delay: index * step, emphasize }
  })
}

export function pickCaptionEntrance(style: CaptionStyle): EntranceAnimation {
  switch (style) {
    case 'wordPop':
    case 'slam':
      return 'tactileIn'
    case 'clipWipe':
      return 'revealLeft'
    case 'karaoke':
    case 'highlightKeywords':
      return 'slideUp'
    case 'weightShift':
      return 'fadeIn'
    default:
      return 'fadeIn'
  }
}

export function karaokeBackgroundForWord(style: CaptionStyle): string | undefined {
  if (style === 'pill') return 'rgba(255,255,255,0.16)'
  if (style === 'karaoke' || style === 'highlightKeywords') return 'rgba(255,255,255,0.08)'
  return undefined
}
