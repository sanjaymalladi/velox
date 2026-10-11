import { describe, expect, it } from 'vitest'
import { scene } from './core/Scene'
import { createVideo } from './core/Video'
import { buildSceneTimeline, buildSceneStartsSeconds, resolveSize } from './engine/drawFrame'
import { text } from './elements/Text'
import { validateVeloxVideoConfig } from './validation'
import type {
  VeloxVideoConfig, ElementConfig, TransitionType, SceneCamera, SceneMood, VeloxFps,
} from './types'

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

  const baseConfig = (): VeloxVideoConfig =>
    createVideo({ fps: 30, scenes: [scene(3).add(text('ok'))] }).config

  it('rejects unsupported fps', () => {
    const cfg = baseConfig()
    cfg.fps = 25 as VeloxFps
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/Unsupported fps/i)
  })

  it('rejects non-positive size', () => {
    const cfg = baseConfig()
    cfg.size = [0, 1080]
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/positive/i)
  })

  it('rejects empty scenes', () => {
    const cfg = baseConfig()
    cfg.scenes = []
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/at least one scene/i)
  })

  it('rejects invalid transition type', () => {
    const cfg = baseConfig()
    cfg.scenes[0] = scene(3).transition('dissolve' as TransitionType, 0.5).add(text('x')).toConfig()
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/unsupported transition type/i)
  })

  it('rejects transition longer than the scene', () => {
    const cfg = baseConfig()
    cfg.scenes[0] = scene(2).transition('crossDissolve', 3).add(text('x')).toConfig()
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/less than scene duration/i)
  })

  it('rejects invalid camera and mood', () => {
    const cfg = baseConfig()
    cfg.scenes[0] = { ...cfg.scenes[0], camera: 'drone' as SceneCamera }
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/invalid camera/i)
    cfg.scenes[0] = { ...baseConfig().scenes[0], mood: 'noir' as SceneMood }
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/invalid mood/i)
  })

  it('rejects out-of-range vignette / grain / audio volume', () => {
    const vignette = baseConfig()
    vignette.scenes[0] = { ...vignette.scenes[0], overlay: { vignetteOpacity: 1.4 } }
    expect(() => validateVeloxVideoConfig(vignette)).toThrow(/vignette must be 0/i)

    const grain = baseConfig()
    grain.scenes[0] = { ...grain.scenes[0], overlay: { grainOpacity: -0.1 } }
    expect(() => validateVeloxVideoConfig(grain)).toThrow(/grain must be 0/i)

    const audio = baseConfig()
    audio.scenes[0] = { ...audio.scenes[0], audio: { src: 'a.mp3', volume: 2 } }
    expect(() => validateVeloxVideoConfig(audio)).toThrow(/audio volume must be 0-1/i)
  })

  it('rejects elements with bad opacity / missing content / src', () => {
    const cfg = baseConfig()
    cfg.scenes[0] = {
      ...cfg.scenes[0],
      elements: [{ id: 't', type: 'text', content: 'x', opacity: 1.5 } as ElementConfig],
    }
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/invalid opacity/i)

    cfg.scenes[0] = {
      ...cfg.scenes[0],
      elements: [{ id: 't', type: 'text' } as ElementConfig],
    }
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/content must be a string/i)

    cfg.scenes[0] = {
      ...cfg.scenes[0],
      elements: [{ id: 'i', type: 'image' } as ElementConfig],
    }
    expect(() => validateVeloxVideoConfig(cfg)).toThrow(/src is required/i)
  })

  it('rejects malformed audioPlan entries', () => {
    const cfg = baseConfig()
    expect(() =>
      validateVeloxVideoConfig({
        ...cfg,
        audioPlan: { music: { src: '' }, sfx: [{ name: '', at: -1 }], beats: [-2] },
      }),
    ).toThrow()
  })
})
