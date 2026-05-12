import { describe, expect, it } from 'vitest'
import { scene } from './core/Scene'
import { createVideo } from './core/Video'
import { buildSceneTimeline, buildSceneStartsSeconds, resolveSize } from './engine/drawFrame'
import { text } from './elements/Text'
import { validateVeloxVideoConfig } from './validation'

describe('validation and timeline', () => {
  it('resolves canonical sizes', () => {
    expect(resolveSize('1080p')).toEqual([1920, 1080])
    expect(resolveSize('portrait')).toEqual([1080, 1920])
  })

  it('builds scene timeline with transition overlap', () => {
    const video = createVideo({
      fps: 30,
      scenes: [
        scene(4).transition('crossDissolve', 1).add(text('A')),
        scene(3).add(text('B')),
      ],
    })

    const timeline = buildSceneTimeline(video.config)
    expect(timeline).toHaveLength(2)
    expect(timeline[0].startFrame).toBe(0)
    expect(timeline[0].endFrame).toBe(120)
    expect(timeline[1].startFrame).toBe(90)
  })

  it('throws when scene transition duration exceeds scene duration', () => {
    expect(() =>
      createVideo({
        fps: 30,
        scenes: [scene(2).transition('crossDissolve', 3).add(text('bad'))],
      })
    ).toThrow(/transition duration must be less than scene duration/i)
  })

  it('builds aligned scene starts in seconds', () => {
    const video = createVideo({
      fps: 30,
      scenes: [scene(4).transition('crossDissolve', 1).add(text('a')), scene(4).add(text('b'))],
    })
    const starts = buildSceneStartsSeconds(video.config)
    expect(starts).toHaveLength(2)
    expect(starts[0]).toBe(0)
    expect(starts[1]).toBeCloseTo(3)
  })

  it('accepts audioPlan sfx and beats alongside scenes', () => {
    const base = createVideo({
      fps: 30,
      scenes: [scene(3).add(text('cue'))],
    }).config
    expect(() =>
      validateVeloxVideoConfig({
        ...base,
        audioPlan: {
          sfx: [{ name: 'tick', at: 0.2, volume: 0.9 }],
          beats: [0.5],
        },
      }),
    ).not.toThrow()
  })
})
