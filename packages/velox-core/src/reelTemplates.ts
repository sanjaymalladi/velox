/**
 * Reel layout templates — portrait 1080×1920, tuned for dense vertical fill.
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

const CAPTION_BOTTOM: SlotTransform = { named: 'bottomCenter', offset: { offsetY: -118 } }
const OVERLAY_TOP_RIGHT: SlotTransform = { named: 'topCenter', offset: { offsetX: 300, offsetY: 220 } }

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

export function slotPlacement(
  template: ReelTemplateId,
  slot: ReelSlotId | string | undefined,
): SlotTransform {
  if (!template || template === 'none')
    return {}

  const s = (slot ?? 'center') as ReelSlotId

  if (s === 'caption') return CAPTION_BOTTOM
  if (s === 'overlay') return OVERLAY_TOP_RIGHT

  switch (template) {
    case 'topTextBottomVisual':
      if (s === 'top') return { named: 'topCenter', offset: { offsetY: 72 } }
      if (s === 'bottom' || s === 'visual' || s === 'full')
        return { named: 'center', offset: { offsetY: 140 } }
      return { named: 'center', offset: { offsetY: 48 } }

    case 'topVisualBottomText':
      if (s === 'top' || s === 'visual' || s === 'full')
        return { named: 'topCenter', offset: { offsetY: 300 } }
      if (s === 'bottom') return { named: 'bottomCenter', offset: { offsetY: -160 } }
      return { named: 'center', offset: {} }

    case 'splitLeftRight':
      if (s === 'left' || s === 'visual')
        return { named: 'center', offset: { offsetX: -248 } }
      if (s === 'right')
        return { named: 'center', offset: { offsetX: 248 } }
      if (s === 'top') return { named: 'topCenter', offset: { offsetY: 72 } }
      if (s === 'bottom') return { named: 'bottomCenter', offset: { offsetY: -96 } }
      return { named: 'center', offset: {} }

    case 'centerCard':
      if (s === 'top') return { named: 'topCenter', offset: { offsetY: 68 } }
      if (s === 'bottom') return { named: 'bottomCenter', offset: { offsetY: -108 } }
      if (s === 'visual' || s === 'full' || s === 'center' || !slot)
        return { named: 'center', offset: { offsetY: -24 } }
      return { named: 'center', offset: { offsetY: -24 } }

    case 'fullBleedMedia':
      if (s === 'bottom') return { named: 'bottomCenter', offset: { offsetY: -108 } }
      if (s === 'top') return { named: 'topCenter', offset: { offsetY: 72 } }
      return { named: 'center', offset: {} }

    case 'headlineThenProof':
      if (s === 'top') return { named: 'topCenter', offset: { offsetY: 160 } }
      if (s === 'bottom' || s === 'visual') return { named: 'bottomCenter', offset: { offsetY: -220 } }
      return { named: 'center', offset: { offsetY: -56 } }

    case 'threeBeatReveal':
      if (s === 'top') return { named: 'topCenter', offset: { offsetY: 140 } }
      if (s === 'center' || !slot || s === 'visual') return { named: 'center', offset: { offsetY: -56 } }
      if (s === 'bottom') return { named: 'bottomCenter', offset: { offsetY: -180 } }
      return { named: 'center', offset: { offsetY: -56 } }

    default:
      return {}
  }
}

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
