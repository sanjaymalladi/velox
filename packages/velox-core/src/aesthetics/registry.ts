import { buildAestheticFromParsed } from './buildFromParsed'
import type { ParsedDesignMd } from './parseDesignMd'
import type { VeloxAesthetic } from './types'
import type { VeloxTheme } from '../types'
import { themes as legacyThemes } from '../themes/legacy'
// Static import (Turbopack resolves `*.js` -> `*.ts` for static specifiers);
// the heavy 40+ design JSONs stay code-split via the dynamic `parsed/index` import below.
import { builtinAesthetics } from './builtinThemes.js'

const legacyRegistry: Record<string, VeloxAesthetic> = {}
for (const [id, theme] of Object.entries(legacyThemes)) {
  legacyRegistry[id] = legacyAsAesthetic(id, theme)
}

/** Live registry. Starts with the small legacy set; design + builtin aesthetics
 *  are merged in by `preloadAesthetics()` (code-split into a separate chunk). */
const registry: Record<string, VeloxAesthetic> = { ...legacyRegistry }

let _preloaded = false
let _preloading: Promise<void> | null = null

export function aestheticsArePreloaded(): boolean {
  return _preloaded
}

/**
 * Lazily loads the full aesthetic catalog (design sources + builtin themes) and
 * merges it into the registry. Idempotent. Call this to cut the default bundle
 * weight — the 40+ design JSONs live in a separate, on-demand chunk.
 */
export function preloadAesthetics(): Promise<void> {
  if (_preloaded) return Promise.resolve()
  if (_preloading) return _preloading
  _preloading = (async () => {
    const { parsedDesignSources } = await import('./parsed/index.js')
    // Design + builtin aesthetics take precedence over the legacy set (mirrors the
    // original eager merge order where legacy only filled gaps).
    for (const [id, parsed] of Object.entries(parsedDesignSources)) {
      registry[id] = buildAestheticFromParsed(id, parsed as ParsedDesignMd)
    }
    for (const [id, aesthetic] of Object.entries(builtinAesthetics)) {
      registry[id] = aesthetic as VeloxAesthetic
    }
    const all = Object.keys(registry).sort()
    aestheticIds.length = 0
    aestheticIds.push(...all)
    _preloaded = true
    _preloading = null
  })()
  return _preloading
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

/** Live list of loaded aesthetic ids (legacy always present; grows after preload). */
export const aestheticIds: string[] = Object.keys(registry).sort()

export function resolveAesthetic(id: string | VeloxTheme | undefined): VeloxAesthetic {
  if (!id) return registry.obsidian ?? legacyAsAesthetic('obsidian', legacyThemes.obsidian)
  if (typeof id === 'string') {
    const found = registry[id]
    if (found) return found
    // Progressive enhancement: kick off the lazy catalog load so a later render
    // (or lint/list) sees the real aesthetic instead of the legacy fallback.
    if (!_preloaded) void preloadAesthetics()
    return legacyAsAesthetic(id, legacyThemes.obsidian)
  }
  return legacyAsAesthetic('custom', id)
}

export function resolveTheme(t: VeloxTheme | string | undefined): VeloxTheme {
  return resolveAesthetic(t).theme
}

export { registry as aesthetics }
