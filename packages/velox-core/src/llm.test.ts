import { describe, expect, it } from 'vitest'
import { createVideoFromSchema } from './llm'
import { image } from './elements/Image'

describe('createVideoFromSchema', () => {
  it('builds a layered image shot from one camera choice', () => {
    const video = createVideoFromSchema({
      title: 'A city at night',
      aspectRatio: '16:9',
      sections: [{
        type: 'hook',
        heading: 'A city at night',
        backgroundImage: 'city.jpg',
        overlayImage: 'architect.jpg',
        camera: 'parallaxDrift',
      }],
    })

    const scene = video.config.scenes[0]
    const images = scene?.elements.filter((el) => el.type === 'image')
    expect(scene?.camera).toBe('parallaxDrift')
    expect(images?.map((el) => el.type === 'image' ? el.depth : undefined)).toEqual([-0.4, 0.8])
    expect(images?.find((el) => el.type === 'image' && el.tilt)?.type).toBe('image')
  })

  it('builds a product UI interaction from a small scene description', () => {
    const video = createVideoFromSchema({
      title: 'Velox launch',
      sections: [{
        type: 'uiDemo',
        prompt: 'Make a product demo with a cursor.',
        action: 'Render video',
        result: 'Video ready',
      }],
    })
    const scene = video.config.scenes[0]
    expect(scene?.duration).toBeGreaterThanOrEqual(5)
    expect(scene?.camera).toBe('slowPush')
    expect(scene?.elements.some((element) => element.type === 'uiDemo')).toBe(true)
  })

  it('applies one shared visual world and keeps simple scene notes', () => {
    const video = createVideoFromSchema({
      title: 'A short story',
      aspectRatio: '16:9',
      visualWorld: { name: 'Paper atlas', material: 'paper', palette: { background: '#171713', accent: '#d68b42' } },
      reducedMotion: true,
      sections: [{
        type: 'image',
        heading: 'The old city',
        backgroundImage: 'city.jpg',
        focus: 'Aerial view of the old city',
        source: 'https://example.com/history',
        sourceLabel: 'History archive',
        sourceDate: '2024',
      }],
    })

    expect(video.config.visualWorld?.name).toBe('Paper atlas')
    expect(video.config.reducedMotion).toBe(true)
    expect(video.config.scenes[0]).toEqual(expect.objectContaining({
      chapter: 'The old city',
      focus: 'Aerial view of the old city',
      source: 'https://example.com/history',
      sourceLabel: 'History archive',
      sourceDate: '2024',
    }))
  })
})

describe('image.lookup', () => {
  it('creates a keyless Openverse image reference for the CLI resolver', () => {
    expect(image.lookup('coding').toConfig().src).toBe('velox-stock:quarry:coding')
  })
})
