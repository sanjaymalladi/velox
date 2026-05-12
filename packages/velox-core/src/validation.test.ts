import { describe, expect, it } from 'vitest'
import { scene } from './core/Scene'
import { createVideo } from './core/Video'
import { buildSceneTimeline, resolveSize } from './engine/drawFrame'
import { text } from './elements/Text'

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
})
