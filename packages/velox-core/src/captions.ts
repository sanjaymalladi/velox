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

/**
 * Minimal, dependency-free ASS (SubStation Alpha) cue parser.
 *
 * Handles the common `[Events]` / `Dialogue:` format and strips override tags
 * (`{\...}`), converting `\N` / `\n` line breaks. For full styled/karaoke ASS
 * rendering, `sweet-subtitle` can be dynamically imported by the caller — this
 * parser only extracts plain text cues so the core stays fetch-free and tiny.
 */
export function parseAss(input: string): CaptionCue[] {
  const cues: CaptionCue[] = []
  const lines = input.replace(/\r\n/g, '\n').split('\n')
  let formatCols: string[] = []
  let inEvents = false

  for (const raw of lines) {
    const line = raw.trim()
    if (/^\[/i.test(line)) {
      inEvents = /^\[Events\]/i.test(line)
      continue
    }
    if (!inEvents) continue

    if (/^Format:/i.test(line)) {
      formatCols = line.replace(/^Format:/i, '').split(',').map((s) => s.trim().toLowerCase())
      continue
    }
    if (!/^Dialogue:/i.test(line)) continue

    const body = line.replace(/^Dialogue:/i, '').trim()
    let cols = formatCols.length ? formatCols : ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text']
    let parts = splitAssFields(body, cols.length - 1)
    // Some exporters write a shortened Format line but retain the standard
    // ten-field Dialogue payload. Detect that mismatch and use standard order.
    if (!parseAssTimestamp(parts[cols.indexOf('start')] ?? '')) {
      const standard = ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text']
      const standardParts = splitAssFields(body, standard.length - 1)
      if (parseAssTimestamp(standardParts[1] ?? '')) {
        cols = standard
        parts = standardParts
      }
    }
    const col = (name: string): string => {
      const i = cols.indexOf(name)
      return i >= 0 && i < parts.length ? parts[i] : ''
    }
    const start = parseAssTs(col('start'))
    const end = parseAssTs(col('end'))
    const textCol = col('text')
    const text = textCol
      .replace(/\{\\[^}]*\}/g, '') // strip override tags
      .replace(/\\N/gi, '\n')
      .replace(/\\n/gi, '\n')
      .trim()
    if (!text) continue
    cues.push({ start, end, text })
  }

  return cues.sort((a, b) => a.start - b.start)
}

/** Split an ASS field list on commas, ignoring commas inside `{}` / `()` groups. */
function splitAssFields(body: string, maxSplits: number): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of body) {
    if (ch === '{' || ch === '(') depth++
    else if (ch === '}' || ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0 && out.length < maxSplits) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function parseAssTs(s: string): number {
  const m = s.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\.(\d{1,2})$/)
  if (!m) return 0
  const h = Number(m[1] ?? 0)
  const mm = Number(m[2])
  const ss = Number(m[3])
  const cc = Number(m[4])
  return h * 3600 + mm * 60 + ss + cc / 100
}

function parseAssTimestamp(s: string): boolean {
  return /^(?:(\d+):)?\d{1,2}:\d{2}\.\d{1,2}$/.test(s.trim())
}

/**
 * Auto-detect SRT vs ASS and parse to cues. Power users can feed either format
 * from a `<captions src="...">` file (expanded by CLI preprocessors) or directly.
 */
export function parseCaptionTracks(input: string): CaptionCue[] {
  const trimmed = input.trim()
  if (/^\[Events\]/i.test(trimmed) || /^Dialogue:/im.test(trimmed)) return parseAss(input)
  if (/^WEBVTT(?:\s|$)/i.test(trimmed)) return parseVtt(input)
  return parseSrt(input)
}

/** Parse WebVTT's timing blocks into the same plain-text cue format as SRT. */
export function parseVtt(input: string): CaptionCue[] {
  const cues: CaptionCue[] = []
  const blocks = input.replace(/^\uFEFF?WEBVTT[^\n]*\n/i, '').replace(/\r\n/g, '\n').trim().split(/\n\s*\n/)
  for (const block of blocks) {
    const lines = block.split('\n')
    const timeIndex = lines.findIndex((line) => /\d{2}:\d{2}(?::\d{2})?\.\d{3}\s*-->/.test(line))
    if (timeIndex < 0) continue
    const match = lines[timeIndex].match(/((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/)
    if (!match) continue
    const toSec = (stamp: string) => {
      const nums = stamp.split(':').map(Number)
      const last = nums.pop()!
      const secs = Number(last.toFixed(3))
      return nums.reduce((acc, n) => acc * 60 + n, secs)
    }
    const text = lines.slice(timeIndex + 1).join(' ').replace(/<[^>]*>/g, '').trim()
    if (text) cues.push({ start: toSec(match[1]), end: toSec(match[2]), text })
  }
  return cues.sort((a, b) => a.start - b.start)
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
  | 'neon'
  | 'gradient'
  | 'outline'
  | 'typewriter'
  | 'bounce'
  | 'lowerThird'

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
    case 'typewriter':
      return 'revealLeft'
    case 'karaoke':
    case 'highlightKeywords':
      return 'slideUp'
    case 'weightShift':
      return 'fadeIn'
    case 'neon':
    case 'gradient':
      return 'fadeIn'
    case 'outline':
    case 'bounce':
      return 'bounceIn'
    case 'lowerThird':
      return 'slideUp'
    default:
      return 'fadeIn'
  }
}

export function karaokeBackgroundForWord(style: CaptionStyle): string | undefined {
  if (style === 'pill') return 'rgba(255,255,255,0.16)'
  if (style === 'karaoke' || style === 'highlightKeywords') return 'rgba(255,255,255,0.08)'
  return undefined
}
