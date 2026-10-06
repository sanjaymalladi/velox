import { describe, expect, it } from 'vitest'
import { buildAudioMixArgs, resolveAudio } from './audio'
import type { VeloxVideoConfig } from './types'

function cfg(): VeloxVideoConfig {
  return {
    size: [1080, 1920],
    fps: 30,
    scenes: [
      { id: 's1', duration: 3, elements: [] },
      { id: 's2', duration: 2, elements: [], audio: { src: 'voice2.wav', volume: 0.8, startFrom: 0.5 } },
    ],
    audio: { src: 'https://cdn.example.com/voice.mp3', volume: 1 },
    audioPlan: {
      music: { src: 'ambient.mp3', volume: 0.6 },
      sfx: [{ name: 'pop', at: 1.5, volume: 0.9 }],
      beats: [0, 1, 2],
    },
  }
}

describe('buildAudioMixArgs', () => {
  it('returns no-op when there is no audio', () => {
    const resolved = resolveAudio({ size: [100, 100], fps: 30, scenes: [{ id: 'x', duration: 1, elements: [] }] })
    const out = buildAudioMixArgs(resolved, 'out.mp4')
    expect(out.hasAudio).toBe(false)
    expect(out.args).toHaveLength(0)
  })

  it('builds a music + sfx + voice graph with ducking and correct delays', () => {
    const resolved = resolveAudio(cfg(), { isResolved: () => true })
    const { args, hasAudio } = buildAudioMixArgs(resolved, 'out.mp4')
    expect(hasAudio).toBe(true)
    // The global legacy audio alias is suppressed when audioPlan.music exists:
    // 3 audio inputs (music, sfx, scene voice) + 1 video input.
    const inputCount = args.filter((a) => a === '-i').length
    expect(inputCount).toBe(4)
    const fc = args[args.indexOf('-filter_complex') + 1]
    expect(fc).toContain('sidechaincompress')
    expect(fc).toContain('[musicduck]')
    expect(fc).toContain('amix=inputs=3')
    // scene voice delayed to 3s (scene start) + 0.5s startFrom = 3500ms
    expect(fc).toContain('adelay=3500|3500')
    // sfx delayed to 1.5s = 1500ms
    expect(fc).toContain('adelay=1500|1500')
    // video mapped, audio mapped, aac output
    expect(args).toContain('0:v:0')
    expect(args).toContain('[aout]')
    expect(args).toContain('aac')
  })

  it('does not add ducking when only music is present', () => {
    const resolved = resolveAudio({
      size: [100, 100],
      fps: 30,
      scenes: [{ id: 'x', duration: 1, elements: [] }],
      audioPlan: { music: { src: 'm.mp3', volume: 0.5 }, sfx: [], beats: [] },
    }, { isResolved: () => true })
    const fc = buildAudioMixArgs(resolved, 'out.mp4').args.find((_, i, a) => a[i - 1] === '-filter_complex')
    expect(fc).not.toContain('sidechaincompress')
    expect(fc).toContain('amix=inputs=1')
  })
})
