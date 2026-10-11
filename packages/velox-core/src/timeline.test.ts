import { describe, expect, it } from 'vitest'
import { calculateFrameTimeline } from './timeline'

describe('calculateFrameTimeline', () => {
  it('uses one integer-frame clock for scenes and transitions', () => {
    const timeline = calculateFrameTimeline([
      { duration: 4, transition: { duration: 0.5 } },
      { duration: 5 },
    ], 30)
    expect(timeline.scenes.map((scene) => scene.startFrame)).toEqual([0, 105])
    expect(timeline.totalFrames).toBe(255)
  })

  it('does not remove the final scene transition from the video duration', () => {
    const timeline = calculateFrameTimeline([
      { duration: 2, transition: { duration: 0.5 } },
    ], 30)
    expect(timeline.totalFrames).toBe(60)
    expect(timeline.scenes[0]?.transitionFrames).toBe(0)
  })
})
