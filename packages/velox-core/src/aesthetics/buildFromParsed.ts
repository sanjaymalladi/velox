import type { ParsedDesignMd } from './parseDesignMd'
import type { CardSurface, TypeStyle, VeloxAesthetic } from './types'
import type { VeloxTheme } from '../types'

function pickTypo(
  parsed: ParsedDesignMd,
  role: string,
  fallback: TypeStyle,
): TypeStyle {
  const t = parsed.typography[role]
  if (!t) return fallback
  return {
    fontFamily: t.fontFamily ?? fallback.fontFamily,
    fontSize: t.fontSize ?? fallback.fontSize,
    fontWeight: t.fontWeight ?? fallback.fontWeight,
    lineHeight: t.lineHeight ?? fallback.lineHeight,
    letterSpacing: t.letterSpacing ?? fallback.letterSpacing,
  }
}

function c(parsed: ParsedDesignMd, key: string, fallback: string): string {
  return parsed.colors[key] ?? fallback
}

function themeFrom(
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

export function buildAppleAesthetic(parsed: ParsedDesignMd): VeloxAesthetic {
  const canvas = c(parsed, 'surface-black', '#000000')
  const text = c(parsed, 'body-on-dark', '#ffffff')
  const muted = c(parsed, 'body-muted', 'rgba(255,255,255,0.62)')
  const accent = c(parsed, 'primary-on-dark', '#2997ff')
  const theme = themeFrom(canvas, accent, c(parsed, 'ink-muted-48', '#86868b'), text, muted, 'Inter', accent)

  const display = pickTypo(parsed, 'hero-display', {
    fontFamily: 'Inter',
    fontSize: 56,
    fontWeight: 600,
    lineHeight: 1.07,
    letterSpacing: -0.5,
  })
  const title = pickTypo(parsed, 'display-lg', {
    fontFamily: 'Inter',
    fontSize: 44,
    fontWeight: 600,
    lineHeight: 1.1,
    letterSpacing: -0.4,
  })
  const subtitle = pickTypo(parsed, 'lead-airy', {
    fontFamily: 'Inter',
    fontSize: 26,
    fontWeight: 300,
    lineHeight: 1.45,
    letterSpacing: 0,
  })
  const body = pickTypo(parsed, 'body', {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: -0.2,
  })
  const caption = pickTypo(parsed, 'caption', {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: 400,
    lineHeight: 1.35,
    letterSpacing: -0.15,
  })
  const kicker = pickTypo(parsed, 'caption-strong', {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: 2.5,
  })

  const card: CardSurface = {
    style: 'none',
    fill: 'transparent',
    border: 'transparent',
    radius: 0,
  }

  return {
    id: 'apple',
    name: parsed.name ?? 'Apple',
    description: parsed.description,
    colors: parsed.colors,
    theme,
    typography: { display, title, subtitle, body, caption, kicker },
    surfaces: {
      card,
      captionBar: {
        fill: 'rgba(0,0,0,0.72)',
        border: 'rgba(255,255,255,0.14)',
        borderMode: 'none',
        radius: 28,
        text,
      },
      button: {
        fill: c(parsed, 'primary-focus', '#0071e3'),
        text: c(parsed, 'on-primary', '#ffffff'),
        radius: 980,
      },
    },
    video: {
      canvas,
      sceneBackground: canvas,
      grain: 0.035,
      vignette: 0.28,
    },
  }
}

export function buildNotionAesthetic(parsed: ParsedDesignMd): VeloxAesthetic {
  const canvas = c(parsed, 'canvas', '#ffffff')
  const surface = c(parsed, 'surface', '#f6f5f4')
  const text = c(parsed, 'charcoal', '#37352f')
  const muted = c(parsed, 'slate', '#5d5b54')
  const accent = c(parsed, 'primary', '#5645d4')
  const theme = themeFrom(canvas, accent, c(parsed, 'brand-navy', '#0a1530'), text, muted, 'Inter', accent)

  const display = pickTypo(parsed, 'hero-display', {
    fontFamily: 'Inter',
    fontSize: 64,
    fontWeight: 600,
    lineHeight: 1.05,
    letterSpacing: -1.5,
  })
  const title = pickTypo(parsed, 'heading-1', {
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 1.12,
    letterSpacing: -0.5,
  })
  const subtitle = pickTypo(parsed, 'subtitle', {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.45,
    letterSpacing: 0,
  })
  const body = pickTypo(parsed, 'body-md', {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 0,
  })
  const caption = pickTypo(parsed, 'caption', {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: 0,
  })
  const kicker = pickTypo(parsed, 'micro-uppercase', {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: 1.2,
  })

  return {
    id: 'notion',
    name: parsed.name ?? 'Notion',
    description: parsed.description,
    colors: parsed.colors,
    theme,
    typography: { display, title, subtitle, body, caption, kicker },
    surfaces: {
      card: {
        style: 'solid',
        fill: c(parsed, 'card-tint-lavender', '#e6e0f5'),
        border: c(parsed, 'hairline', '#e5e3df'),
        radius: 12,
        shadow: { color: 'rgba(15,23,42,0.08)', blur: 24, offsetY: 8 },
      },
      captionBar: {
        fill: c(parsed, 'brand-navy', '#0a1530'),
        border: 'transparent',
        borderMode: 'none',
        radius: 10,
        text: c(parsed, 'on-dark', '#ffffff'),
      },
      button: {
        fill: accent,
        text: c(parsed, 'on-primary', '#ffffff'),
        radius: 8,
      },
    },
    video: {
      canvas,
      sceneBackground: surface,
      grain: 0,
      vignette: 0,
    },
  }
}

export function buildDell1996Aesthetic(parsed: ParsedDesignMd): VeloxAesthetic {
  const frame = c(parsed, 'frame-ink', '#000000')
  const canvas = c(parsed, 'canvas', '#ffffff')
  const text = c(parsed, 'ink', '#000000')
  const accent = c(parsed, 'primary', '#e91d2a')
  const ribbon = c(parsed, 'tint-periwinkle', '#8c9ae0')
  const theme = themeFrom(canvas, accent, ribbon, text, '#333333', 'Arial', accent)

  const display = pickTypo(parsed, 'display', {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: 48,
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: 0,
  })
  const title = pickTypo(parsed, 'heading-1', {
    fontFamily: 'Arial Black, Arial, sans-serif',
    fontSize: 36,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: 0,
  })
  const subtitle = pickTypo(parsed, 'heading-2', {
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: 0,
  })
  const body = pickTypo(parsed, 'body', {
    fontFamily: 'Times New Roman, Times, serif',
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: 0,
  })
  const caption = pickTypo(parsed, 'caption', {
    fontFamily: 'Times New Roman, Times, serif',
    fontSize: 18,
    fontWeight: 400,
    lineHeight: 1.35,
    letterSpacing: 0,
  })
  const kicker = pickTypo(parsed, 'ui-label', {
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: 0,
  })

  return {
    id: 'dell-1996',
    name: parsed.name ?? 'Dell 1996',
    description: parsed.description,
    colors: parsed.colors,
    theme,
    typography: { display, title, subtitle, body, caption, kicker },
    surfaces: {
      card: {
        style: 'ribbon',
        fill: ribbon,
        border: frame,
        radius: 0,
      },
      captionBar: {
        fill: frame,
        border: c(parsed, 'yellow-sticker', '#fcc20f'),
        borderMode: 'stripe',
        radius: 0,
        text: canvas,
      },
      button: {
        fill: accent,
        text: c(parsed, 'on-primary', '#ffffff'),
        radius: 0,
      },
    },
    video: {
      canvas,
      sceneBackground: canvas,
      grain: 0,
      vignette: 0,
    },
  }
}

export type DesignAestheticId = 'apple' | 'notion' | 'dell-1996'

const CUSTOM_BUILDERS: Record<DesignAestheticId, (p: ParsedDesignMd) => VeloxAesthetic> = {
  apple: buildAppleAesthetic,
  notion: buildNotionAesthetic,
  'dell-1996': buildDell1996Aesthetic,
}

function firstColor(parsed: ParsedDesignMd, keys: string[], fallback: string): string {
  for (const key of keys) {
    const v = parsed.colors[key]
    if (v) return v
  }
  return fallback
}

function firstTypo(parsed: ParsedDesignMd, keys: string[], fallback: TypeStyle): TypeStyle {
  for (const key of keys) {
    const t = parsed.typography[key]
    if (t?.fontSize) {
      return pickTypo(parsed, key, fallback)
    }
  }
  return fallback
}

function inferDark(parsed: ParsedDesignMd): boolean {
  const canvas = firstColor(parsed, ['canvas', 'surface-black', 'background', 'primary'], '#ffffff')
  if (canvas.toLowerCase() === '#000000' || canvas.toLowerCase() === '#0a0a0a') return true
  if (parsed.description?.toLowerCase().includes('dark')) return true
  const hex = canvas.replace('#', '')
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return lum < 0.35
  }
  return false
}

function inferFont(parsed: ParsedDesignMd, fallback: string): string {
  for (const style of Object.values(parsed.typography)) {
    if (style.fontFamily) return style.fontFamily
  }
  return fallback
}

/** Generic builder for getdesign.md + HyperFrames frame.md imports. */
export function buildGenericAesthetic(id: string, parsed: ParsedDesignMd): VeloxAesthetic {
  const dark = inferDark(parsed)
  const font = inferFont(parsed, 'Inter')
  const canvas = firstColor(
    parsed,
    dark
      ? ['surface-black', 'canvas', 'background', 'primary', 'ink']
      : ['canvas', 'canvas-soft', 'background', 'surface', 'primary'],
    dark ? '#0a0a0a' : '#ffffff',
  )
  const sceneBg = firstColor(
    parsed,
    ['canvas-soft', 'surface', 'canvas-parchment', 'scene', 'canvas'],
    canvas,
  )
  const text = firstColor(
    parsed,
    dark
      ? ['ink', 'body-on-dark', 'on-dark', 'body', 'charcoal', 'on-primary']
      : ['ink', 'body', 'charcoal', 'on-primary'],
    dark ? '#ffffff' : '#111111',
  )
  const muted = firstColor(
    parsed,
    ['body-muted', 'ink-mute', 'ink-muted-48', 'slate', 'muted', 'ink-secondary'],
    dark ? 'rgba(255,255,255,0.62)' : '#64748b',
  )
  const primary = firstColor(parsed, ['primary', 'primary-on-dark', 'accent', 'brand'], dark ? '#38bdf8' : '#2563eb')
  const accent = firstColor(parsed, ['accent', 'primary', 'primary-focus', 'brand'], primary)
  const theme = themeFrom(canvas, primary, accent, text, muted, font, accent)

  const bodyFallback: TypeStyle = { fontFamily: font, fontSize: 22, fontWeight: 400, lineHeight: 1.4, letterSpacing: 0 }
  const display = firstTypo(
    parsed,
    ['hero-display', 'display-xxl', 'display-xl', 'headline', 'display', 'display-lg', 'stat'],
    { ...bodyFallback, fontSize: 56, fontWeight: dark ? 600 : 700, lineHeight: 1.06, letterSpacing: -0.5 },
  )
  const title = firstTypo(
    parsed,
    ['display-lg', 'heading-1', 'display-md', 'title', 'heading-lg'],
    { ...display, fontSize: 44, letterSpacing: -0.4 },
  )
  const subtitle = firstTypo(
    parsed,
    ['lead-airy', 'subtitle', 'lead', 'heading-2', 'display-md', 'body-lg'],
    { ...bodyFallback, fontSize: 26, fontWeight: 300, lineHeight: 1.45 },
  )
  const body = firstTypo(parsed, ['body', 'body-md', 'body-lg', 'heading-md'], bodyFallback)
  const caption = firstTypo(parsed, ['caption', 'body-sm', 'heading-sm'], { ...bodyFallback, fontSize: 20, lineHeight: 1.35 })
  const kicker = firstTypo(
    parsed,
    ['caption-strong', 'micro-uppercase', 'kicker', 'ui-label', 'label'],
    { ...bodyFallback, fontSize: 14, fontWeight: 700, letterSpacing: 2 },
  )

  const neobrutal = id.includes('blockframe') || id.includes('daisy-days') || parsed.description?.includes('neobrutal')
  const editorial = parsed.description?.toLowerCase().includes('editorial') || id.includes('cartesian')
  const card: CardSurface = neobrutal
    ? {
        style: 'solid',
        fill: dark ? 'rgba(255,255,255,0.08)' : '#ffffff',
        border: text,
        radius: id.includes('capsule') ? 980 : 0,
        shadow: { color: text, blur: 0, offsetY: 8 },
      }
    : dark
      ? {
          style: 'frosted',
          fill: 'rgba(255,255,255,0.1)',
          border: 'rgba(255,255,255,0.14)',
          radius: 24,
          shadow: { color: 'rgba(0,0,0,0.35)', blur: 32, offsetY: 12 },
        }
      : {
          style: 'solid',
          fill: editorial ? '#fffdf9' : sceneBg,
          border: firstColor(parsed, ['hairline', 'divider-soft'], 'rgba(15,23,42,0.1)'),
          radius: editorial ? 4 : 12,
          shadow: { color: 'rgba(15,23,42,0.08)', blur: 24, offsetY: 8 },
        }

  return {
    id,
    name: parsed.name ?? id,
    description: parsed.description,
    colors: parsed.colors,
    theme,
    typography: { display, title, subtitle, body, caption, kicker },
    surfaces: {
      card,
      captionBar: {
        fill: dark ? 'rgba(0,0,0,0.78)' : text,
        border: neobrutal ? accent : 'transparent',
        borderMode: neobrutal ? 'stripe' : 'none',
        radius: neobrutal ? 0 : editorial ? 4 : 12,
        text: dark ? text : canvas,
      },
      button: {
        fill: accent,
        text: firstColor(parsed, ['on-primary', 'on-dark'], dark ? '#0f172a' : '#ffffff'),
        radius: neobrutal ? 0 : id.includes('capsule') ? 980 : 10,
      },
    },
    video: {
      canvas,
      sceneBackground: sceneBg,
      grain: dark ? 0.05 : editorial ? 0.04 : 0,
      vignette: dark ? 0.38 : editorial ? 0.28 : 0,
    },
  }
}

export function buildAestheticFromParsed(id: string, parsed: ParsedDesignMd): VeloxAesthetic {
  const custom = CUSTOM_BUILDERS[id as DesignAestheticId]
  if (custom) return custom(parsed)
  return buildGenericAesthetic(id, parsed)
}
