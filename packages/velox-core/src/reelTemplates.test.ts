import { describe, expect, it } from 'vitest'
import { slotPlacement } from './reelTemplates'

describe('reelTemplates slotPlacement', () => {
  it('places captions on safe lower third for all templates', () => {
    const templates = [
      'topTextBottomVisual',
      'splitLeftRight',
      'centerCard',
      'threeBeatReveal',
    ] as const
    for (const tpl of templates) {
      const hint = slotPlacement(tpl, 'caption')
      expect(hint.named).toBe('bottomCenter')
      expect(hint.offset?.offsetY).toBeLessThan(0)
    }
  })

  it('places overlay away from center hero on split and centerCard', () => {
    const splitOverlay = slotPlacement('splitLeftRight', 'overlay')
    expect(splitOverlay.offset?.offsetX).not.toBe(0)

    const centerOverlay = slotPlacement('centerCard', 'overlay')
    expect(centerOverlay.named).toBe('topCenter')
  })

  it('does not map split caption to the right column', () => {
    const right = slotPlacement('splitLeftRight', 'right')
    const caption = slotPlacement('splitLeftRight', 'caption')
    expect(right.offset?.offsetX).toBe(248)
    expect(caption.named).toBe('bottomCenter')
    expect(caption.offset?.offsetX ?? 0).toBe(0)
  })
})
