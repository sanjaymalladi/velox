import type { VeloxTheme } from '../types'

export const themes: Record<string, VeloxTheme> = {
  darkNeon: {
    background: '#080810',
    primary: '#6C63FF',
    secondary: '#FF6584',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.5)',
    font: 'Inter',
    accent: '#06b6d4',
  },
  corporate: {
    background: '#ffffff',
    primary: '#1d4ed8',
    secondary: '#0ea5e9',
    text: '#0f172a',
    muted: 'rgba(15,23,42,0.5)',
    font: 'Inter',
    accent: '#7c3aed',
  },
  warmCinema: {
    background: '#1a1008',
    primary: '#f59e0b',
    secondary: '#ef4444',
    text: '#fef3c7',
    muted: 'rgba(254,243,199,0.5)',
    font: 'Playfair Display',
    accent: '#d97706',
  },
  brutalist: {
    background: '#000000',
    primary: '#ffffff',
    secondary: '#facc15',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.6)',
    font: 'Space Grotesk',
    accent: '#facc15',
  },
  pastel: {
    background: '#faf5ff',
    primary: '#a855f7',
    secondary: '#ec4899',
    text: '#1e1b4b',
    muted: 'rgba(30,27,75,0.5)',
    font: 'Nunito',
    accent: '#06b6d4',
  },
}

export function resolveTheme(t: VeloxTheme | string | undefined): VeloxTheme | undefined {
  if (!t) return undefined
  if (typeof t === 'string') return themes[t]
  return t
}
