import { describe, expect, it } from 'vitest'
import { createVideoFromCreativeSpec } from './creativeCompiler'
import { CREATIVE_SPEC_FORMAT, validateCreativeSpec } from './creativeSpec'

describe('creative spec', () => {
  it('compiles expressive blocks without raw method chains', () => {
    const video = createVideoFromCreativeSpec({
      format: CREATIVE_SPEC_FORMAT,
      size: 'portrait',
      fps: 60,
      theme: 'obsidian',
      background: { kind: 'grid', color: 'rgba(255,255,255,0.04)', size: 40 },
      scenes: [
        {
          duration: 5,
          background: { kind: 'aurora', mood: 'violet' },
          blocks: [
            { kind: 'hero', kicker: 'SAFE DSL', title: 'No Broken Chains', subtitle: 'Creative but constrained.' },
            { kind: 'logoLockup', logo: 'openai', label: 'OpenAI', placement: 'bottom', motion: 'none' },
          ],
        },
        {
          duration: 4,
          blocks: [
            { kind: 'progress', value: 72, label: 'Compiler owns size before add', color: '#22c55e' },
            { kind: 'shape', shape: 'rect', outline: '#a78bfa', color: 'rgba(255,255,255,0.08)', placement: 'safeBottom' },
          ],
        },
      ],
    })

    expect(video.config.size).toEqual([1080, 1920])
    expect(video.config.fps).toBe(60)
    expect(video.config.scenes).toHaveLength(2)
    expect(video.config.scenes[0].elements.length).toBeGreaterThan(0)
  })

  it('rejects unknown block kinds with a useful message', () => {
    expect(() => validateCreativeSpec({
      format: CREATIVE_SPEC_FORMAT,
      scenes: [{ blocks: [{ kind: 'strokeRect', title: 'bad' }] }],
    })).toThrow(/kind "strokeRect" is invalid/i)
  })

  it('rejects invalid placements instead of accepting pos object intent', () => {
    expect(() => validateCreativeSpec({
      format: CREATIVE_SPEC_FORMAT,
      scenes: [{ blocks: [{ kind: 'text', text: 'bad', placement: { x: 0.5, y: 0.2 } }] }],
    })).toThrow(/placement is invalid/i)
  })

  it('rejects invalid progress values', () => {
    expect(() => validateCreativeSpec({
      format: CREATIVE_SPEC_FORMAT,
      scenes: [{ blocks: [{ kind: 'progress', value: 140 }] }],
    })).toThrow(/value must be 0-100/i)
  })
})

