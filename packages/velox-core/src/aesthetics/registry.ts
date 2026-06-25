import { parsedDesignSources } from './parsed'
import { buildAestheticFromParsed } from './buildFromParsed'
import { builtinAesthetics } from './builtinThemes'
import type { VeloxAesthetic } from './types'
import type { VeloxTheme } from '../types'
import { themes as legacyThemes } from '../themes/legacy'

const designAesthetics: Record<string, VeloxAesthetic> = {}
for (const [id, parsed] of Object.entries(parsedDesignSources)) {
  designAesthetics[id] = buildAestheticFromParsed(id, parsed)
}

/** Wrap a legacy 7-field theme as a minimal aesthetic for older presets. */
function legacyAsAesthetic(id: string, theme: VeloxTheme): VeloxAesthetic {
  const body = {
    fontFamily: theme.font,
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: 0,
  }
  return {
    id,
    name: id,
    colors: {},
    theme,
    typography: {
      display: { ...body, fontSize: 56, fontWeight: 700, letterSpacing: -0.5 },
      title: { ...body, fontSize: 44, fontWeight: 700, letterSpacing: -0.4 },
      subtitle: { ...body, fontSize: 26, fontWeight: 400 },
      body,
      caption: { ...body, fontSize: 20 },
      kicker: { ...body, fontSize: 14, fontWeight: 700, letterSpacing: 2 },
    },
    surfaces: {
      card: {
        style: 'frosted',
        fill: 'rgba(255,255,255,0.1)',
        border: 'rgba(255,255,255,0.12)',
        radius: 32,
        shadow: { color: 'rgba(0,0,0,0.4)', blur: 40, offsetY: 12 },
      },
      captionBar: {
        fill: 'rgba(0,0,0,0.75)',
        border: 'rgba(255,255,255,0.12)',
        radius: 28,
        text: theme.text,
      },
      button: {
        fill: theme.accent ?? theme.primary,
        text: theme.background === '#ffffff' ? '#ffffff' : '#0f172a',
        radius: 12,
      },
    },
    video: {
      canvas: theme.background,
      sceneBackground: theme.background,
      grain: 0.06,
      vignette: 0.35,
    },
  }
}

const registry: Record<string, VeloxAesthetic> = {
  ...designAesthetics,
  ...builtinAesthetics,
}

for (const [id, theme] of Object.entries(legacyThemes)) {
  if (!registry[id]) registry[id] = legacyAsAesthetic(id, theme)
}

export const aestheticIds = Object.keys(registry).sort()

export function resolveAesthetic(id: string | VeloxTheme | undefined): VeloxAesthetic {
  if (!id) return registry.obsidian ?? legacyAsAesthetic('obsidian', legacyThemes.obsidian)
  if (typeof id === 'string') {
    const found = registry[id]
    if (found) return found
    return legacyAsAesthetic(id, legacyThemes.obsidian)
  }
  return legacyAsAesthetic('custom', id)
}

export function resolveTheme(t: VeloxTheme | string | undefined): VeloxTheme {
  return resolveAesthetic(t).theme
}

export { registry as aesthetics }
