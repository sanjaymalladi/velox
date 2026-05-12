import { describe, expect, it } from 'vitest'
import type { BaseElementConfig } from '../types'
import { getAnimationState } from './animations'

describe('getAnimationState', () => {
  it('keeps glitch animation deterministic for same element/frame', () => {
    const el: BaseElementConfig = {
      id: 'el-deterministic',
      type: 'text',
      entrance: { animation: 'glitchIn', duration: 1 },
    }

    const first = getAnimationState(el, 8, 30)
    const second = getAnimationState(el, 8, 30)
    expect(first.x).toBe(second.x)
  })

  it('changes deterministic glitch offset when frame changes', () => {
    const el: BaseElementConfig = {
      id: 'el-deterministic-2',
      type: 'text',
      entrance: { animation: 'glitchIn', duration: 1 },
    }

    const atFrame8 = getAnimationState(el, 8, 30)
    const atFrame9 = getAnimationState(el, 9, 30)
    expect(atFrame8.x).not.toBe(atFrame9.x)
  })
})
