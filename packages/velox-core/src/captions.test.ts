import { describe, expect, it } from 'vitest'
import { parseSrt, parseAss, parseCaptionTracks } from './captions'
import { createVideoFromMarkup } from './markupCompiler'
import type { TextElementConfig } from './types'

const PREMIUM_STYLES = [
  'neon',
  'gradient',
  'outline',
  'typewriter',
  'bounce',
  'lowerThird',
] as const

describe('captions', () => {
  it('parses a minimal SRT block', () => {
    const cues = parseSrt(`
1
00:00:01,000 --> 00:00:03,500
Hello world

2
00:00:04,000 --> 00:00:06,000
Second line
`)
    expect(cues).toHaveLength(2)
    expect(cues[0]!.start).toBeCloseTo(1)
    expect(cues[0]!.text).toBe('Hello world')
  })

  it('parses an ASS [Events] Dialogue block (strips override tags)', () => {
    const ass = `[Script Info]
Title: Test

[V4+ Styles]
Format: Name, Fontname, Fontsize
Style: Default,Inter,48

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,Hello {\\an8}world
Dialogue: 0,0:00:04.00,0:00:06.00,Default,,0,0,0,,Second\\Nline
`
    const cues = parseAss(ass)
    expect(cues).toHaveLength(2)
    expect(cues[0]!.start).toBeCloseTo(1)
    expect(cues[0]!.end).toBeCloseTo(3.5)
    expect(cues[0]!.text).toBe('Hello world')
    expect(cues[1]!.text).toBe('Second\nline')
  })

  it('auto-detects SRT vs ASS via parseCaptionTracks', () => {
    const srt = `1\n00:00:01,000 --> 00:00:02,000\nHi\n`
    const ass = `[Events]\nFormat: Start, End, Text\nDialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,Yo\n`
    expect(parseCaptionTracks(srt)[0]!.text).toBe('Hi')
    expect(parseCaptionTracks(ass)[0]!.text).toBe('Yo')
  })

  it.each(PREMIUM_STYLES)('compiles the premium "%s" caption style with karaoke metadata', (style) => {
    const vml = `<video size="portrait" fps="30" theme="obsidian">
      <scene duration="4">
        <captions slot="caption" text="Ship faster with captions" style="${style}" />
      </scene>
    </video>`
    const video = createVideoFromMarkup(vml)
    const scene = video.config.scenes[0]!

    const findCaptionText = (els: typeof scene.elements): TextElementConfig | undefined => {
      for (const el of els) {
        if (el.type === 'text' && el.caption !== undefined) return el
        if (el.type === 'group') {
          const found = findCaptionText(el.children)
          if (found) return found
        }
      }
      return undefined
    }

    const captionText = findCaptionText(scene.elements)
    expect(captionText).toBeDefined()
    expect(captionText!.caption?.style).toBe(style)
    // Each word carries timing metadata for karaoke/typewriter reveal.
    expect(captionText!.caption?.totalWords).toBeGreaterThan(0)
    expect(captionText!.caption?.wordStepSec).toBeGreaterThan(0)
  })
})
