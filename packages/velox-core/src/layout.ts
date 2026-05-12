import type { Element } from './core/Element'
import type { ElementConfig } from './types'
import { group, type GroupBuilder, type LayoutOptions } from './elements/Group'

type AnyElement = Element<ElementConfig>

export const layout = {
  row(children: AnyElement[], options?: LayoutOptions): GroupBuilder {
    return group(children).row(options)
  },

  column(children: AnyElement[], options?: LayoutOptions): GroupBuilder {
    return group(children).column(options)
  },

  stack(children: AnyElement[]): GroupBuilder {
    return group(children).stack()
  },

  center(child: AnyElement): GroupBuilder {
    return group([child]).stack().center()
  },

  safeFrame(child: AnyElement, options: { x?: number; y?: number } = {}): GroupBuilder {
    return group([child]).stack().center({ offsetX: options.x ?? 0, offsetY: options.y ?? 0 })
  },
}
