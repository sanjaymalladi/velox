import { describe, expect, it } from 'vitest'
import { themedCards } from './presets'
import { text } from './elements/Text'
import { resolveAesthetic } from './aesthetics/registry'
import type { GroupElementConfig, ShapeElementConfig } from './types'

function firstRect(el: GroupElementConfig): ShapeElementConfig | undefined {
  for (const child of el.children) {
    if (child.type === 'shape') return child as ShapeElementConfig
    if (child.type === 'group') {
      const nested = firstRect(child as GroupElementConfig)
      if (nested) return nested
    }
  }
  return undefined
}

describe('themedCards surface auto-fit', () => {
  const a = resolveAesthetic('obsidian')

  it('grows the card to contain a tall text block instead of overflowing', () => {
    const surface = themedCards(a).surface(
      [text('A fairly long headline that must wrap across several lines and needs more vertical room than a forced card allows').wrap(700).maxHeight(420)],
      { width: 200, height: 120 },
    ).toConfig() as GroupElementConfig

    const rect = firstRect(surface)
    expect(rect).toBeDefined()
    // Forced 120 height must be ignored because content needs more room.
    expect(rect!.shape.height!).toBeGreaterThan(120)
    // Never exceeds the canvas-safe ceiling for portrait frames.
    expect(rect!.shape.height!).toBeLessThanOrEqual(1640)
    expect(rect!.shape.width!).toBeLessThanOrEqual(1000)
  })

  it('clamps an oversized forced card to canvas-safe bounds', () => {
    const surface = themedCards(a).surface(
      [text('short').wrap(700)],
      { width: 5000, height: 9000 },
    ).toConfig() as GroupElementConfig

    const rect = firstRect(surface)!
    expect(rect.shape.width).toBe(1000)
    expect(rect.shape.height).toBe(1640)
  })
})
