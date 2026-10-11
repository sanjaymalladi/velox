import { describe, expect, it } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { parseCaptionTracks, buildCaptionWordSpans } from './captions'
import { drawCaptionTrack } from './engine/drawText'
import type { CaptionTrack } from './types'

const SRT = `1
00:00:00,000 --> 00:00:02,000
Hello world this is a test

2
00:00:02,000 --> 00:00:04,000
Second line of captions
`

const ASS = `[Script Info]
Title: test

[Vectors]

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:02.00,Default,,0,0,0,,First {\\b1}ASS{\\b0} cue\\Nsecond line
Dialogue: 0,0:00:02.00,0:00:04.00,Default,,0,0,0,,Second ASS cue
`

describe('caption import (SRT/ASS)', () => {
  it('parses SRT cues with seconds + text', () => {
    const cues = parseCaptionTracks(SRT)
    expect(cues).toHaveLength(2)
    expect(cues[0].start).toBe(0)
    expect(cues[0].end).toBe(2)
    expect(cues[0].text).toBe('Hello world this is a test')
    expect(cues[1].start).toBe(2)
  })

  it('auto-detects and parses ASS, stripping override tags + line breaks', () => {
    const cues = parseCaptionTracks(ASS)
    expect(cues).toHaveLength(2)
    expect(cues[0].start).toBe(0)
    expect(cues[0].end).toBe(2)
    expect(cues[0].text).toBe('First ASS cue\nsecond line')
    expect(cues[1].text).toBe('Second ASS cue')
  })

  it('buildCaptionWordSpans produces per-word delays', () => {
    const spans = buildCaptionWordSpans('one two three', 3, 'karaoke')
    expect(spans.map((s) => s.word)).toEqual(['one', 'two', 'three'])
    expect(spans[1].delay).toBeCloseTo(1, 5)
    expect(spans[2].delay).toBeCloseTo(2, 5)
  })
})

describe('drawCaptionTrack', () => {
  it('renders the active cue without throwing and paints pixels', () => {
    const track: CaptionTrack = {
      cues: [
        { start: 0, end: 2, text: 'Hello world' },
        { start: 2, end: 4, text: 'Goodbye' },
      ],
      style: 'karaoke',
    }
    const w = 1080
    const h = 1920
    const canvas = createCanvas(w, h) as unknown as { getContext(t: '2d'): CanvasRenderingContext2D }
    const ctx = canvas.getContext('2d')

    // Frame 0.5s -> first cue active.
    expect(() => drawCaptionTrack(ctx, track, 15, 30, w, h)).not.toThrow()

    // Some pixel should be non-transparent (caption text drawn).
    const data = ctx.getImageData(0, 0, w, h).data
    let painted = 0
    for (let i = 3; i < data.length; i += 4 * 997) {
      if (data[i] > 0) painted++
    }
    expect(painted).toBeGreaterThan(0)
  })

  it('draws nothing when no cue is active at the given frame', () => {
    const track: CaptionTrack = { cues: [{ start: 10, end: 12, text: 'late' }], style: 'plain' }
    const w = 400
    const h = 400
    const canvas = createCanvas(w, h) as unknown as { getContext(t: '2d'): CanvasRenderingContext2D }
    const ctx = canvas.getContext('2d')
    expect(() => drawCaptionTrack(ctx, track, 5, 30, w, h)).not.toThrow()
    let painted = 0
    const data = ctx.getImageData(0, 0, w, h).data
    for (let i = 3; i < data.length; i += 4 * 97) if (data[i] > 0) painted++
    expect(painted).toBe(0)
  })
})
