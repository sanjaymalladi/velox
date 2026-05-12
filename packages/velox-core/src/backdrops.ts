import { shape } from './elements/Shape'
import type { VeloxGradient } from './types'
import { colors } from './color'

const palettes = {
  midnight: ['#050816', '#111827', '#312e81'],
  violet: ['#0f0728', '#4c1d95', '#7c3aed'],
  danger: ['#190711', '#571327', '#f43f5e'],
  ocean: ['#04111f', '#075985', '#14b8a6'],
  ember: ['#160b05', '#7c2d12', '#f97316'],
}

type PaletteName = keyof typeof palettes

export const backdrops = {
  aurora(options: { mood?: PaletteName; angle?: string } = {}): VeloxGradient {
    return shape.gradient(options.angle ?? '145deg', ...(palettes[options.mood ?? 'midnight']))
  },

  meshGradient(options: { palette?: PaletteName; angle?: string } = {}): VeloxGradient {
    return shape.gradient(options.angle ?? '160deg', ...(palettes[options.palette ?? 'violet']))
  },

  grid(color = 'rgba(255,255,255,0.05)', size = 48): string {
    return `grid(${color}, ${size})`
  },

  gridPulse(color = 'rgba(255,255,255,0.055)', size = 44): string {
    return `grid(${color}, ${size})`
  },

  creamGrid(size = 42): string {
    return `grid(rgba(63,51,37,0.12), ${size})`
  },

  /** Soft warm paper gradient — good with editorial mood */
  warmPaper(angle = '168deg'): VeloxGradient {
    return shape.gradient(angle, ...colors.ramp(['#faf6ef', '#f0e6d4', '#e8dcc8'], 3))
  },

  /** Higher-contrast editorial cream gradient for premium scenes. */
  editorialCream(angle = '150deg'): VeloxGradient {
    return shape.gradient(angle, ...colors.ramp(['#fffaf1', '#f1dfbd', '#d7b980'], 4))
  },
}
