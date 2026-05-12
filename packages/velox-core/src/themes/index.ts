import type { VeloxTheme } from '../types'

export const themes: Record<string, VeloxTheme> = {
  geist: {
    background: '#ffffff',
    primary: '#000000',
    secondary: '#666666',
    text: '#111111',
    muted: 'rgba(0,0,0,0.4)',
    font: 'Inter',
    accent: '#0070f3',
  },
  notion: {
    background: '#ffffff',
    primary: '#37352f',
    secondary: '#0f7b6c',
    text: '#37352f',
    muted: 'rgba(55,53,47,0.5)',
    font: 'Inter',
    accent: '#e03e3e',
  },
  linear: {
    background: '#0a0b10',
    primary: '#5e6ad2',
    secondary: '#26293d',
    text: '#f4f5f8',
    muted: 'rgba(244,245,248,0.5)',
    font: 'Inter',
    accent: '#5e6ad2',
  },
  obsidian: {
    background: '#050505',
    primary: '#ffffff',
    secondary: '#333333',
    text: '#f5f5f5',
    muted: 'rgba(255,255,255,0.4)',
    font: 'Inter',
    accent: '#a8a8a8',
  },
  sandstone: {
    background: '#fdfbf7',
    primary: '#4a3f35',
    secondary: '#d9cbb8',
    text: '#2d2621',
    muted: 'rgba(74,63,53,0.5)',
    font: 'Lora',
    accent: '#8b5a2b',
  },
  corporateBlue: {
    background: '#f8fafc',
    primary: '#0f172a',
    secondary: '#3b82f6',
    text: '#0f172a',
    muted: 'rgba(15,23,42,0.5)',
    font: 'Inter',
    accent: '#2563eb',
  },
  mintMinimal: {
    background: '#f4fbf8',
    primary: '#115e59',
    secondary: '#86efac',
    text: '#134e4a',
    muted: 'rgba(17,94,89,0.5)',
    font: 'Inter',
    accent: '#10b981',
  },
  monochromeGrid: {
    background: '#ffffff',
    primary: '#000000',
    secondary: '#e5e5e5',
    text: '#000000',
    muted: 'rgba(0,0,0,0.4)',
    font: 'Inter',
    accent: '#000000',
  },
  creamChecks: {
    background: '#f8f1e3',
    primary: '#3f3325',
    secondary: '#eadfc9',
    text: '#2f261c',
    muted: 'rgba(63,51,37,0.55)',
    font: 'Inter',
    accent: '#b7791f',
  },
}

export function resolveTheme(t: VeloxTheme | string | undefined): VeloxTheme | undefined {
  if (!t) return undefined
  if (typeof t === 'string') return themes[t]
  return t
}
