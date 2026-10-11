import { describe, expect, it } from 'vitest'
import { resolveAudio, BUNDLED_AUDIO_PRESETS } from './audio'
import type { VeloxVideoConfig } from './types'

function makeConfig(): VeloxVideoConfig {
  return {
    size: [1080, 1920],
    fps: 30,
    scenes: [
      { id: 's1', duration: 3, elements: [] },
      {
        id: 's2',
        duration: 2,
        elements: [],
        audio: { src: 'voice2.wav', volume: 0.8, startFrom: 0.5 },
      },
    ],
    audio: { src: 'https://cdn.example.com/voiceover.mp3', volume: 1 },
    audioPlan: {
      music: { src: 'ambient', volume: 0.6 },
      sfx: [{ name: 'pop', at: 1.5, volume: 0.9 }],
      beats: [0, 1, 2],
    },
  }
}

describe('resolveAudio', () => {
  it('passes through URLs and keeps user-provided paths', () => {
    const r = resolveAudio(makeConfig())
    expect(r.hasAudio).toBe(true)
    // `config.audio` is the legacy/global music alias. The explicit plan wins
    // when both are set so it is never duplicated as a voice track.
    expect(r.tracks.filter((t) => t.kind === 'music')).toHaveLength(1)
    expect(r.tracks.some((t) => t.kind === 'voice' && t.at === undefined)).toBe(false)
  })

  it('resolves preset names against assetRoot (Node)', () => {
    const r = resolveAudio(makeConfig(), { assetRoot: '/assets' })
    const music = r.tracks.find((t) => t.kind === 'music')
    expect(music?.src).toBe('/assets/audio/ambient.mp3')
    const sfx = r.tracks.find((t) => t.kind === 'sfx')
    expect(sfx?.src).toBe('/assets/audio/pop.mp3')
    expect(sfx?.at).toBe(1.5)
    expect(sfx?.duck).toBe(true)
  })

  it('resolves preset names against remoteBase (browser)', () => {
    const r = resolveAudio(makeConfig(), { remoteBase: 'https://cdn.example.com' })
    const music = r.tracks.find((t) => t.kind === 'music')
    expect(music?.src).toBe('https://cdn.example.com/audio/ambient.mp3')
  })

  it('aligns per-scene audio to the global timeline', () => {
    const r = resolveAudio(makeConfig(), { assetRoot: '/a' })
    const sceneVoice = r.tracks.find((t) => t.src.endsWith('voice2.wav'))
    // scene s2 starts at 3s (after s1) + 0.5 startFrom
    expect(sceneVoice?.at).toBe(3.5)
    expect(sceneVoice?.volume).toBe(0.8)
  })

  it('reports total duration and beat markers', () => {
    const r = resolveAudio(makeConfig())
    expect(r.durationSec).toBe(5)
    expect(r.beats).toEqual([0, 1, 2])
  })

  it('hasAudio is false when nothing is referenced', () => {
    const cfg: VeloxVideoConfig = { size: [1080, 1920], fps: 30, scenes: [{ id: 'x', duration: 1, elements: [] }] }
    expect(resolveAudio(cfg).hasAudio).toBe(false)
  })

  it('exposes the bundled preset list', () => {
    expect(BUNDLED_AUDIO_PRESETS).toContain('ambient')
  })
})
