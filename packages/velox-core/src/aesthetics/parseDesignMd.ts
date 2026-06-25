/**
 * Minimal parser for Google Stitch / awesome-design-md DESIGN.md front matter.
 * Extracts `colors`, `typography`, and metadata without a YAML dependency.
 */

export interface DesignMdTypeStyle {
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  lineHeight?: number
  letterSpacing?: number
}

export interface ParsedDesignMd {
  name?: string
  description?: string
  colors: Record<string, string>
  typography: Record<string, DesignMdTypeStyle>
}

function parsePx(value: string): number | undefined {
  const m = value.trim().match(/^(-?[\d.]+)px$/)
  return m ? Number(m[1]) : undefined
}

function parseLetterSpacing(value: string): number | undefined {
  const v = value.trim()
  const px = parsePx(v)
  if (px !== undefined) return px
  if (v.endsWith('px')) return Number(v.replace('px', ''))
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function extractInlineColors(markdown: string): Record<string, string> {
  const colors: Record<string, string> = {}
  const seen = new Set<string>()
  let i = 0

  for (const m of markdown.matchAll(/\*\*([^*]+)\*\*\s*\(`(#[0-9a-fA-F]{3,8})`\)/g)) {
    const hex = m[2]!.toLowerCase()
    if (seen.has(hex)) continue
    seen.add(hex)
    const slug = m[1]!
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48)
    colors[slug || `swatch-${i++}`] = hex
  }

  if (Object.keys(colors).length < 3) {
    for (const m of markdown.matchAll(/`(#(?:[0-9a-fA-F]{3,8}))`/g)) {
      const hex = m[1]!.toLowerCase()
      if (seen.has(hex)) continue
      seen.add(hex)
      colors[`swatch-${i++}`] = hex
    }
  }

  return colors
}

export function parseDesignMd(markdown: string): ParsedDesignMd {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  let section: 'meta' | 'colors' | 'typography' | 'other' = 'meta'
  let currentTypo: string | null = null
  const colors: Record<string, string> = {}
  const typography: Record<string, DesignMdTypeStyle> = {}
  let name: string | undefined
  let description: string | undefined

  for (const raw of lines) {
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (trimmed === 'colors:') {
      section = 'colors'
      currentTypo = null
      continue
    }
    if (trimmed === 'typography:') {
      section = 'typography'
      currentTypo = null
      continue
    }
    if (/^[a-z][\w-]*:$/i.test(trimmed) && !trimmed.includes(' ')) {
      if (section === 'colors' || section === 'typography') section = 'other'
      currentTypo = null
      continue
    }

    if (section === 'meta') {
      const nameMatch = trimmed.match(/^name:\s*(.+)$/i)
      if (nameMatch) name = nameMatch[1].trim()
      const descMatch = trimmed.match(/^description:\s*(.+)$/i)
      if (descMatch) description = descMatch[1].trim()
      continue
    }

    if (section === 'colors') {
      const colorMatch = trimmed.match(/^([\w-]+):\s*"(#[^"]+)"\s*$/)
      if (colorMatch) {
        colors[colorMatch[1]] = colorMatch[2]
        continue
      }
      if (trimmed.startsWith('#')) continue
      continue
    }

    if (section === 'typography') {
      const roleMatch = trimmed.match(/^([\w-]+):$/)
      if (roleMatch && !line.startsWith(' ')) {
        currentTypo = roleMatch[1]
        typography[currentTypo] = {}
        continue
      }
      if (currentTypo) {
        const kv = trimmed.match(/^([\w-]+):\s*(.+)$/)
        if (!kv) continue
        const [, key, val] = kv
        const style = typography[currentTypo]!
        if (key === 'fontFamily') style.fontFamily = val.replace(/^"|"$/g, '')
        else if (key === 'fontSize') style.fontSize = parsePx(val)
        else if (key === 'fontWeight') style.fontWeight = Number(val)
        else if (key === 'lineHeight') style.lineHeight = Number(val)
        else if (key === 'letterSpacing') style.letterSpacing = parseLetterSpacing(val)
      }
    }
  }

  const inlineColors = Object.keys(colors).length < 3 ? extractInlineColors(markdown) : {}
  const mergedColors = { ...inlineColors, ...colors }

  if (!name) {
    const h1 = markdown.match(/^#\s+(.+)$/m)
    if (h1) name = h1[1].replace(/^Design System Inspired by\s+/i, '').trim()
  }

  return { name, description, colors: mergedColors, typography }
}
