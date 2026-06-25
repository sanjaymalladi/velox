import type { VeloxAesthetic } from './types'
import type { VeloxTheme } from '../types'

function theme(
  background: string,
  primary: string,
  secondary: string,
  text: string,
  muted: string,
  font: string,
  accent?: string,
): VeloxTheme {
  return { background, primary, secondary, text, muted, font, accent }
}

function baseBody(font: string, size = 22) {
  return {
    fontFamily: font,
    fontSize: size,
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: 0,
  }
}

export const builtinAesthetics: Record<string, VeloxAesthetic> = {
  glassmorphism: {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted glass cards on aurora gradients — soft blur, light borders, airy type.',
    colors: {},
    theme: theme('#0b1020', '#7dd3fc', '#a78bfa', '#f8fafc', 'rgba(248,250,252,0.72)', 'Inter', '#38bdf8'),
    typography: {
      display: { ...baseBody('Inter', 64), fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.05 },
      title: { ...baseBody('Inter', 48), fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.08 },
      subtitle: { ...baseBody('Inter', 26), fontWeight: 400, lineHeight: 1.45 },
      body: baseBody('Inter', 22),
      caption: { ...baseBody('Inter', 20), lineHeight: 1.35 },
      kicker: { ...baseBody('Inter', 14), fontWeight: 700, letterSpacing: 2.2 },
    },
    surfaces: {
      card: {
        style: 'frosted',
        fill: 'rgba(255,255,255,0.12)',
        border: 'rgba(255,255,255,0.28)',
        radius: 28,
        shadow: { color: 'rgba(15,23,42,0.35)', blur: 48, offsetY: 16 },
      },
      captionBar: {
        fill: 'rgba(15,23,42,0.55)',
        border: 'rgba(255,255,255,0.2)',
        borderMode: 'none',
        radius: 24,
        text: '#f8fafc',
      },
      button: { fill: '#38bdf8', text: '#0f172a', radius: 16 },
    },
    video: { canvas: '#0b1020', sceneBackground: '#111827', grain: 0.05, vignette: 0.4 },
  },

  brutalism: {
    id: 'brutalism',
    name: 'Brutalism',
    description: 'Hard edges, heavy ink, loud primaries — poster energy for social reels.',
    colors: {},
    theme: theme('#f4f0e8', '#e11d48', '#111111', '#111111', '#444444', 'Arial Black', '#facc15'),
    typography: {
      display: { ...baseBody('Arial Black', 58), fontWeight: 900, lineHeight: 0.95, letterSpacing: -1 },
      title: { ...baseBody('Arial Black', 44), fontWeight: 900, lineHeight: 1, letterSpacing: -0.5 },
      subtitle: { ...baseBody('Arial', 24), fontWeight: 700, lineHeight: 1.25 },
      body: { ...baseBody('Arial', 22), fontWeight: 500 },
      caption: { ...baseBody('Arial', 20), fontWeight: 700 },
      kicker: { ...baseBody('Arial', 13), fontWeight: 900, letterSpacing: 3 },
    },
    surfaces: {
      card: { style: 'solid', fill: '#ffffff', border: '#111111', radius: 0, shadow: { color: '#111111', blur: 0, offsetY: 8 } },
      captionBar: { fill: '#111111', border: '#facc15', borderMode: 'stripe', radius: 0, text: '#ffffff' },
      button: { fill: '#e11d48', text: '#ffffff', radius: 0 },
    },
    video: { canvas: '#f4f0e8', sceneBackground: '#f4f0e8', grain: 0.02, vignette: 0 },
  },

  neubrutalism: {
    id: 'neubrutalism',
    name: 'Neubrutalism',
    description: 'Flat color blocks, thick outlines, offset shadows — playful SaaS marketing.',
    colors: {},
    theme: theme('#fef9c3', '#2563eb', '#111111', '#111111', '#374151', 'Inter', '#f472b6'),
    typography: {
      display: { ...baseBody('Inter', 60), fontWeight: 800, lineHeight: 1, letterSpacing: -1.5 },
      title: { ...baseBody('Inter', 46), fontWeight: 800, lineHeight: 1.05, letterSpacing: -0.8 },
      subtitle: { ...baseBody('Inter', 26), fontWeight: 600, lineHeight: 1.35 },
      body: { ...baseBody('Inter', 22), fontWeight: 500 },
      caption: { ...baseBody('Inter', 20), fontWeight: 700 },
      kicker: { ...baseBody('Inter', 14), fontWeight: 800, letterSpacing: 1.5 },
    },
    surfaces: {
      card: {
        style: 'solid',
        fill: '#ffffff',
        border: '#111111',
        radius: 16,
        shadow: { color: '#111111', blur: 0, offsetY: 6 },
      },
      captionBar: { fill: '#111111', border: '#f472b6', borderMode: 'stripe', radius: 12, text: '#ffffff' },
      button: { fill: '#2563eb', text: '#ffffff', radius: 12 },
    },
    video: { canvas: '#fef9c3', sceneBackground: '#fff7ed', grain: 0, vignette: 0.08 },
  },

  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon magenta/cyan on near-black — glitch-friendly captions and charts.',
    colors: {},
    theme: theme('#050508', '#22d3ee', '#a855f7', '#f0fdfa', 'rgba(240,253,250,0.55)', 'Inter', '#f472b6'),
    typography: {
      display: { ...baseBody('Inter', 62), fontWeight: 800, lineHeight: 1.02, letterSpacing: -0.8 },
      title: { ...baseBody('Inter', 46), fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.08 },
      subtitle: { ...baseBody('Inter', 26), fontWeight: 400, lineHeight: 1.4 },
      body: baseBody('Inter', 22),
      caption: { ...baseBody('Inter', 20), fontWeight: 600 },
      kicker: { ...baseBody('Inter', 14), fontWeight: 700, letterSpacing: 2.8 },
    },
    surfaces: {
      card: {
        style: 'frosted',
        fill: 'rgba(168,85,247,0.14)',
        border: 'rgba(34,211,238,0.45)',
        radius: 20,
        shadow: { color: 'rgba(34,211,238,0.25)', blur: 32, offsetY: 10 },
      },
      captionBar: { fill: 'rgba(5,5,8,0.88)', border: '#22d3ee', borderMode: 'stripe', radius: 8, text: '#f0fdfa' },
      button: { fill: '#a855f7', text: '#050508', radius: 8 },
    },
    video: { canvas: '#050508', sceneBackground: '#0a0a12', grain: 0.09, vignette: 0.55 },
  },

  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine serif headlines on warm paper — luxury product storytelling.',
    colors: {},
    theme: theme('#f7f3ee', '#9a3412', '#1c1917', '#1c1917', '#78716c', 'Georgia', '#b45309'),
    typography: {
      display: { ...baseBody('Georgia', 58), fontWeight: 700, lineHeight: 1.06, letterSpacing: -0.5 },
      title: { ...baseBody('Georgia', 44), fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.3 },
      subtitle: { ...baseBody('Georgia', 26), fontWeight: 400, lineHeight: 1.45 },
      body: { ...baseBody('Inter', 22), fontWeight: 400, lineHeight: 1.55 },
      caption: { ...baseBody('Inter', 19), fontWeight: 500 },
      kicker: { ...baseBody('Inter', 13), fontWeight: 600, letterSpacing: 2.4 },
    },
    surfaces: {
      card: {
        style: 'solid',
        fill: '#fffdf9',
        border: '#e7e5e4',
        radius: 4,
        shadow: { color: 'rgba(28,25,23,0.12)', blur: 28, offsetY: 12 },
      },
      captionBar: { fill: '#1c1917', border: 'transparent', borderMode: 'none', radius: 4, text: '#fafaf9' },
      button: { fill: '#9a3412', text: '#fff7ed', radius: 4 },
    },
    video: { canvas: '#f7f3ee', sceneBackground: '#f7f3ee', grain: 0.04, vignette: 0.32 },
  },
}
