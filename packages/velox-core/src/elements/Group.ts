import { Element } from '../core/Element'
import type { ElementConfig, GroupElementConfig } from '../types'

type AnyElement = Element<ElementConfig>

export interface LayoutOptions {
  gap?: number
  align?: 'start' | 'center' | 'end' | 'middle'
}

function elementSize(el: ElementConfig): [number, number] {
  if (el.type === 'text') {
    const size = el.fontSize ?? 32
    const weight = el.fontWeight ?? 400
    const charW = size * (weight >= 700 ? 0.62 : weight >= 600 ? 0.58 : 0.52)
    const width =
      el.maxWidth ??
      Math.max(48, el.content.length * charW + Math.max(0, el.content.length - 1) * (el.letterSpacing ?? 0))
    return [width, size * (el.lineHeight ?? 1.2)]
  }
  if (el.type === 'textList') {
    const size = el.fontSize ?? 24
    const width = el.maxWidth ?? 420
    const height = el.items.length * size * 1.3 + Math.max(0, el.items.length - 1) * (el.gap ?? 14)
    return [width, height]
  }
  if (el.type === 'shape') return [el.shape.width ?? 200, el.shape.height ?? el.shape.width ?? 200]
  if (el.type === 'image' || el.type === 'logo') return [el.width ?? 160, el.height ?? el.width ?? 160]
  if (el.type === 'group') {
    const bounds = measure(el.children)
    return [bounds.width, bounds.height]
  }
  return [160, 80]
}

function measure(children: ElementConfig[]): { width: number; height: number } {
  if (children.length === 0) return { width: 0, height: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const child of children) {
    const [w, h] = elementSize(child)
    const x = child.position?.type === 'absolute' ? child.position.x : 0
    const y = child.position?.type === 'absolute' ? child.position.y : 0
    minX = Math.min(minX, x - w / 2)
    maxX = Math.max(maxX, x + w / 2)
    minY = Math.min(minY, y - h / 2)
    maxY = Math.max(maxY, y + h / 2)
  }
  return { width: maxX - minX, height: maxY - minY }
}

export class GroupBuilder extends Element<GroupElementConfig> {
  constructor(children: AnyElement[] = []) {
    super('group')
    this.config.children = children.map((child) => child.toConfig())
  }

  layout(kind: 'row' | 'column' | 'stack', options: LayoutOptions = {}): this {
    const gap = options.gap ?? 24
    const align = options.align ?? 'center'
    const sizes = this.config.children.map(elementSize)
    const totalMain = kind === 'row'
      ? sizes.reduce((sum, [w]) => sum + w, 0) + gap * Math.max(0, sizes.length - 1)
      : kind === 'column'
        ? sizes.reduce((sum, [, h]) => sum + h, 0) + gap * Math.max(0, sizes.length - 1)
        : 0

    const maxW = Math.max(...sizes.map(([w]) => w), 0)
    const maxH = Math.max(...sizes.map(([, h]) => h), 0)
    let cursor = -totalMain / 2
    this.config.children = this.config.children.map((child, index) => {
      const [w, h] = sizes[index]
      if (kind === 'stack') return { ...child, position: { type: 'absolute', x: 0, y: 0 } }
      if (kind === 'row') {
        const y = align === 'start' ? -maxH / 2 + h / 2 : align === 'end' ? maxH / 2 - h / 2 : 0
        const next = { ...child, position: { type: 'absolute' as const, x: cursor + w / 2, y } }
        cursor += w + gap
        return next
      }
      const x = align === 'start' ? -maxW / 2 + w / 2 : align === 'end' ? maxW / 2 - w / 2 : 0
      const next = { ...child, position: { type: 'absolute' as const, x, y: cursor + h / 2 } }
      cursor += h + gap
      return next
    })
    return this
  }

  row(options?: LayoutOptions): this { return this.layout('row', options) }
  column(options?: LayoutOptions): this { return this.layout('column', options) }
  stack(): this { return this.layout('stack') }

  toConfig(): GroupElementConfig {
    return { ...this.config, children: [...this.config.children] }
  }
}

export function group(children: AnyElement[] = []): GroupBuilder {
  return new GroupBuilder(children)
}
