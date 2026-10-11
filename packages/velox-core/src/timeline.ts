export interface FrameTimelineSegment {
  startFrame: number
  endFrame: number
  durationFrames: number
  transitionFrames: number
}

export interface FrameTimeline {
  scenes: FrameTimelineSegment[]
  totalFrames: number
}

/** Build the shared, integer-frame timeline used by drawing, audio, and captions. */
export function calculateFrameTimeline(
  scenes: Array<{ duration: number; transition?: { duration: number } }>,
  fps: number,
): FrameTimeline {
  let cursor = 0
  const timeline = scenes.map((scene, index) => {
    const durationFrames = Math.max(1, Math.round(scene.duration * fps))
    const transitionFrames = scene.transition && index < scenes.length - 1
      ? Math.max(0, Math.round(scene.transition.duration * fps))
      : 0
    const segment = {
      startFrame: cursor,
      endFrame: cursor + durationFrames,
      durationFrames,
      transitionFrames,
    }
    cursor += durationFrames - transitionFrames
    return segment
  })
  return { scenes: timeline, totalFrames: Math.max(1, cursor) }
}
