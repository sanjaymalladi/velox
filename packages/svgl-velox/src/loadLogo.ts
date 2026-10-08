export type LogoPathEntry = { d: string; fill?: string; stroke?: string; length?: number }
export type LogoPathData = { viewBox?: string; paths: LogoPathEntry[]; name?: string }

function logoCandidates(name: string, theme?: 'light' | 'dark' | string): string[] {
  const normalized = name.toLowerCase().replace(/\s+/g, '')
  const primary = theme === 'dark' ? '_dark' : theme === 'light' ? '_light' : ''
  const fallback = primary === '_dark' ? '_light' : primary === '_light' ? '_dark' : ''
  const out = [`${normalized}${primary}`, normalized]
  if (fallback) out.push(`${normalized}${fallback}`)
  return [...new Set(out.filter(Boolean))]
}

async function loadFromApi(base: string): Promise<LogoPathData | null> {
  const res = await fetch(`/api/velox-logo/${encodeURIComponent(base)}`)
  if (!res.ok) return null
  return (await res.json()) as LogoPathData
}

async function loadFromNodeModule(base: string): Promise<LogoPathData | null> {
  try {
    const data = await import('@velox-video/svgl/dist/logos/' + base + '.json')
    return (data as { default?: LogoPathData }).default ?? (data as LogoPathData)
  } catch {
    return null
  }
}

/**
 * Load prebuilt SVGL path JSON from `@velox-video/svgl`.
 * Browser (Next docs): `/api/velox-logo/*`. Node / bundled CLI: dynamic JSON import.
 */
export async function loadBundledLogo(
  name: string,
  theme?: 'light' | 'dark' | string,
): Promise<LogoPathData | null> {
  for (const base of logoCandidates(name, theme)) {
    if (typeof window !== 'undefined') {
      const fromApi = await loadFromApi(base)
      if (fromApi) return fromApi
      continue
    }
    const fromDisk = await loadFromNodeModule(base)
    if (fromDisk) return fromDisk
  }
  return null
}
