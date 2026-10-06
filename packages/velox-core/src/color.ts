/**
 * Color utilities.
 *
 * `chroma-js` and `culori` are heavy and only needed for rich color maths, so
 * they are lazy-loaded by `initColors()` (called from `preloadHeavyDeps`).
 * Until that resolves, a small built-in fallback handles the common hex/rgb
 * cases used on the hot path (caption dimming, readable-on, ramps), so a frame
 * always renders correctly even before the real modules load.
 */

export interface ColorApi {
  ramp(stops: string[], count: number): string[]
  mix(from: string, to: string, amount?: number): string
  alpha(color: string, amount: number): string
  readableOn(background: string, light?: string, dark?: string): string
  normalize(color: string): string
  isLight(color: string): boolean
  dimCaption(color: string, amount?: number): string
}

// ─── Minimal fallback (no deps) ──────────────────────────────────────────────

type RGB = { r: number; g: number; b: number; a: number }

function parseColor(c: string): RGB | null {
  if (!c) return null
  const s = c.trim()
  if (s[0] === '#') {
    let hex = s.slice(1)
    if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('')
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      }
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      }
    }
    return null
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i)
  if (m) {
    const parts = m[1].split(',').map((x) => parseFloat(x.trim()))
    if (parts.length >= 3) {
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 }
    }
  }
  return null
}

function toHex({ r, g, b }: RGB): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function relativeLuminance({ r, g, b }: RGB): number {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: a.a + (b.a - a.a) * t,
  }
}

const fallbackImpl: ColorApi = {
  ramp(stops, count) {
    const parsed = stops.map(parseColor).filter(Boolean) as RGB[]
    if (parsed.length === 0) return [stops[0] ?? '#000000']
    if (parsed.length === 1) return Array.from({ length: count }, () => toHex(parsed[0]))
    const out: string[] = []
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1)
      const seg = t * (parsed.length - 1)
      const idx = Math.min(parsed.length - 2, Math.floor(seg))
      out.push(toHex(lerpRgb(parsed[idx], parsed[idx + 1], seg - idx)))
    }
    return out
  },
  mix(from, to, amount = 0.5) {
    const a = parseColor(from)
    const b = parseColor(to)
    if (!a || !b) return from
    return toHex(lerpRgb(a, b, Math.max(0, Math.min(1, amount))))
  },
  alpha(color, amount) {
    const p = parseColor(color)
    if (!p) return `rgba(128,128,128,${amount})`
    return `rgba(${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${amount})`
  },
  readableOn(background, light = '#ffffff', dark = '#111111') {
    const bg = parseColor(background)
    if (!bg) return light
    const L = relativeLuminance(bg)
    const Ll = relativeLuminance(parseColor(light) ?? { r: 255, g: 255, b: 255, a: 1 })
    const Ld = relativeLuminance(parseColor(dark) ?? { r: 17, g: 17, b: 17, a: 1 })
    const cl = (L + 0.05) / (Ll + 0.05)
    const cd = (Ld + 0.05) / (L + 0.05)
    return cd >= cl ? dark : light
  },
  normalize(color) {
    const p = parseColor(color)
    return p ? toHex(p) : color
  },
  isLight(color) {
    const p = parseColor(color)
    return p ? relativeLuminance(p) > 0.55 : false
  },
  dimCaption(color, amount = 0.38) {
    return fallbackImpl.alpha(color, Math.max(0, Math.min(1, amount)))
  },
}

// ─── Lazy real implementation ────────────────────────────────────────────────

let active: ColorApi = fallbackImpl
let loaded = false
let loading: Promise<void> | null = null

/** Load chroma-js + culori. Idempotent; safe to call repeatedly. */
export function initColors(): Promise<void> {
  if (loaded) return Promise.resolve()
  if (loading) return loading
  loading = Promise.all([import('chroma-js'), import('culori')])
    .then(([chromaMod, culori]) => {
      const chroma = chromaMod.default ?? (chromaMod as unknown as typeof chromaMod.default)
      const toRgb = culori.converter('rgb')
      active = {
        ramp(stops, count) {
          return chroma.scale(stops).mode('lab').colors(Math.max(2, count))
        },
        mix(from, to, amount = 0.5) {
          return chroma.mix(from, to, Math.max(0, Math.min(1, amount)), 'lab').hex()
        },
        alpha(color, amount) {
          return chroma(color).alpha(Math.max(0, Math.min(1, amount))).css()
        },
        readableOn(background, light = '#ffffff', dark = '#111111') {
          const bg = toRgb(background)
          if (!bg) return light
          return culori.wcagContrast(bg, toRgb(light)!) >= culori.wcagContrast(bg, toRgb(dark)!)
            ? light
            : dark
        },
        normalize(color) {
          const parsed = toRgb(color)
          return parsed ? culori.formatHex(parsed) : color
        },
        isLight(color) {
          try {
            return chroma(color).luminance() > 0.55
          } catch {
            return false
          }
        },
        dimCaption(color, amount = 0.38) {
          try {
            return chroma(color).alpha(amount).css()
          } catch {
            return `rgba(128,128,128,${amount})`
          }
        },
      }
      loaded = true
      loading = null
    })
    .catch(() => {
      // Keep the fallback implementation.
      loading = null
    })
  return loading
}

/** The active color API (fallback until `initColors()` resolves). */
export const colors: ColorApi = new Proxy({} as ColorApi, {
  get: (_t, prop: string | symbol) => (active as unknown as Record<string | symbol, unknown>)[prop],
})
