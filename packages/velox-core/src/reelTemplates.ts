/**
 * Reel layout templates — map semantic slots to named positions + offsets
 * for portrait-style frames (defaults tuned for 1080×1920).
 */
import type { NamedPosition } from './types'
import type { Element } from './core/Element'
import type { ElementConfig } from './types'

type AnyElement = Element<ElementConfig>

export type ReelTemplateId =
  | 'none'
  | 'topTextBottomVisual'
  | 'topVisualBottomText'
  | 'splitLeftRight'
  | 'centerCard'
  | 'fullBleedMedia'
  | 'headlineThenProof'
  | 'threeBeatReveal'

export type ReelSlotId = 'top' | 'bottom' | 'visual' | 'caption' | 'overlay' | 'left' | 'right' | 'center' | 'full'

const VALID: ReelTemplateId[] = [
  'none',
  'topTextBottomVisual',
  'topVisualBottomText',
  'splitLeftRight',
  'centerCard',
  'fullBleedMedia',
  'headlineThenProof',
  'threeBeatReveal',
]

export function isReelTemplate(id: string): id is ReelTemplateId {
  return (VALID as string[]).includes(id)
}

interface SlotTransform {
  placement?: string
  named?: NamedPosition
  offset?: { offsetX?: number; offsetY?: number }
}

/**
 * Position hint for a slot within a template (pixel offsets work across sizes).
 */
export function slotPlacement(
  template: ReelTemplateId,
  slot: ReelSlotId | string | undefined,
): SlotTransform {
  if (!template || template === 'none')
    return {}

  const s = (slot ?? 'center') as ReelSlotId

  switch (template) {
    case 'topTextBottomVisual':
      if (s === 'top' || s === 'caption') return { named: 'topCenter', offset: { offsetY: 160 } }
      if (s === 'bottom' || s === 'visual' || s === 'full')
        return { named: 'bottomCenter', offset: { offsetY: -380 } }
      if (s === 'overlay') return { named: 'topCenter', offset: { offsetY: 80 } }
      return { named: 'center', offset: { offsetY: -120 } }

    case 'topVisualBottomText':
      if (s === 'top' || s === 'visual' || s === 'full')
        return { named: 'topCenter', offset: { offsetY: 340 } }
      if (s === 'bottom' || s === 'caption')
        return { named: 'bottomCenter', offset: { offsetY: -200 } }
      if (s === 'overlay') return { named: 'bottomCenter', offset: { offsetY: -420 } }
      return { named: 'center', offset: {} }

    case 'splitLeftRight':
      if (s === 'left' || s === 'visual')
        return { named: 'center', offset: { offsetX: -280 } }
      if (s === 'right' || s === 'caption')
        return { named: 'center', offset: { offsetX: 280 } }
      if (s === 'top') return { named: 'topCenter', offset: { offsetY: 120 } }
      if (s === 'bottom') return { named: 'bottomCenter', offset: { offsetY: -120 } }
      return { named: 'center', offset: {} }

    case 'centerCard':
      if (s === 'top') return { named: 'topCenter', offset: { offsetY: 110 } }
      if (s === 'bottom' || s === 'caption') return { named: 'bottomCenter', offset: { offsetY: -130 } }
      if (s === 'visual' || s === 'full' || s === 'center' || !slot)
        return { named: 'center', offset: {} }
      return { named: 'center', offset: {} }

    case 'fullBleedMedia':
      if (s === 'caption' || s === 'bottom') return { named: 'bottomCenter', offset: { offsetY: -140 } }
      if (s === 'top' || s === 'overlay') return { named: 'topCenter', offset: { offsetY: 120 } }
      return { named: 'center', offset: {} }

    case 'headlineThenProof':
      if (s === 'top' || s === 'caption') return { named: 'topCenter', offset: { offsetY: 220 } }
      if (s === 'bottom' || s === 'visual') return { named: 'bottomCenter', offset: { offsetY: -280 } }
      return { named: 'center', offset: { offsetY: -40 } }

    case 'threeBeatReveal':
      if (s === 'top') return { named: 'topCenter', offset: { offsetY: 200 } }
      if (s === 'center' || !slot || s === 'visual') return { named: 'center', offset: { offsetY: -40 } }
      if (s === 'bottom' || s === 'caption') return { named: 'bottomCenter', offset: { offsetY: -220 } }
      return { named: 'center', offset: {} }

    default:
      return {}
  }
}

/** Apply slot-based position when scene uses a reel template */
export function applyReelSlot<T extends AnyElement>(
  el: T,
  template: ReelTemplateId | undefined,
  slotRaw: string | undefined,
): T {
  if (!template || template === 'none') return el
  const hint = slotPlacement(template, (slotRaw as ReelSlotId) ?? undefined)
  if (!hint.named) return el

  el.pos(hint.named, undefined, hint.offset)
  return el
}
