import chroma from 'chroma-js'
import { converter, formatHex, wcagContrast } from 'culori'

const toRgb = converter('rgb')

export const colors = {
  ramp(stops: string[], count: number): string[] {
    return chroma.scale(stops).mode('lab').colors(Math.max(2, count))
  },

  mix(from: string, to: string, amount = 0.5): string {
    return chroma.mix(from, to, Math.max(0, Math.min(1, amount)), 'lab').hex()
  },

  alpha(color: string, amount: number): string {
    return chroma(color).alpha(Math.max(0, Math.min(1, amount))).css()
  },

  readableOn(background: string, light = '#ffffff', dark = '#111111'): string {
    const bg = toRgb(background)
    if (!bg) return light
    return wcagContrast(bg, toRgb(light)!) >= wcagContrast(bg, toRgb(dark)!) ? light : dark
  },

  normalize(color: string): string {
    const parsed = toRgb(color)
    return parsed ? formatHex(parsed) : color
  },

  /** True when a fill reads as a light surface (for chart grids, caption dimming, etc.). */
  isLight(color: string): boolean {
    try {
      return chroma(color).luminance() > 0.55
    } catch {
      return false
    }
  },

  /** Dim a text color for inactive caption words on any background. */
  dimCaption(color: string, amount = 0.38): string {
    try {
      const base = chroma(color)
      return base.alpha(amount).css()
    } catch {
      return `rgba(128,128,128,${amount})`
    }
  },
}

