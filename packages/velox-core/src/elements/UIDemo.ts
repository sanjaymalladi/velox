import { Element } from '../core/Element'
import type { UiDemoElementConfig } from '../types'

export type UiDemoOptions = Partial<Omit<UiDemoElementConfig, 'id' | 'type'>> & Pick<UiDemoElementConfig, 'prompt'>

class UiDemoElement extends Element<UiDemoElementConfig> {
  constructor(options: UiDemoOptions) {
    super('uiDemo')
    this.config.app = options.app ?? 'Velox Studio'
    this.config.title = options.title ?? 'Create a video'
    this.config.prompt = options.prompt
    this.config.action = options.action ?? 'Render video'
    this.config.result = options.result ?? 'Your video is ready'
    this.config.theme = options.theme ?? 'dark'
    this.config.width = options.width
    this.config.height = options.height
    this.config.accent = options.accent ?? '#8b7bff'
  }
}

/**
 * Create a complete product-demo UI. Velox types the prompt, moves and clicks
 * the controls, shows render progress, and reveals the result automatically.
 * The interaction follows scene time, so seeking and export stay deterministic.
 *
 * @example uiDemo({ prompt: 'A launch video for Velox', result: 'Video ready' }).center()
 */
export function uiDemo(options: UiDemoOptions): UiDemoElement {
  return new UiDemoElement(options)
}
