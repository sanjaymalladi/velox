import { describe, expect, it } from 'vitest'
import { parseSrt } from './captions'

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
})
