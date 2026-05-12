/**
 * Serializable remote media refs for CLI preprocessing — core stays fetch-free.
 */
export type StockProvider =
  | 'generated'
  | 'local'
  | 'wikipedia'
  | 'flickr'
  | 'unsplashSource'
  | 'openbrand'
  /** Tier 2 — require env keys / optional integrations */
  | 'pexels'
  | 'unsplash'
  | 'pixabay'

export const VELOX_STOCK_PREFIX = 'velox-stock:'
export const VELOX_CARD_PREFIX = 'velox-card:'
export const VELOX_WEB_PREFIX = 'velox-web:' // optional Playwright path

/** Encode remote stock lookup into an image src consumed by preload + CLI resolver. */
export function encodeVeloxStockRef(provider: string, query: string): string {
  return `${VELOX_STOCK_PREFIX}${provider}:${encodeURIComponent(query)}`
}

export function decodeVeloxStockRef(
  src: string,
): { provider: StockProvider | string; query: string } | undefined {
  if (!src.startsWith(VELOX_STOCK_PREFIX)) return undefined
  const rest = src.slice(VELOX_STOCK_PREFIX.length)
  const idx = rest.indexOf(':')
  if (idx <= 0) return undefined
  const provider = rest.slice(0, idx)
  const encoded = rest.slice(idx + 1)
  try {
    return { provider, query: decodeURIComponent(encoded) }
  } catch {
    return { provider, query: encoded }
  }
}

/** GitHub/npm/brand/OpenBrand placeholders for card renderer */
export function encodeVeloxCardRef(kind: 'github' | 'npm' | 'brand' | 'website', payload: string): string {
  return `${VELOX_CARD_PREFIX}${kind}:${encodeURIComponent(payload)}`
}

export function decodeVeloxCardRef(
  src: string,
): { kind: string; payload: string } | undefined {
  if (!src.startsWith(VELOX_CARD_PREFIX)) return undefined
  const rest = src.slice(VELOX_CARD_PREFIX.length)
  const idx = rest.indexOf(':')
  if (idx <= 0) return undefined
  try {
    return { kind: rest.slice(0, idx), payload: decodeURIComponent(rest.slice(idx + 1)) }
  } catch {
    return { kind: rest.slice(0, idx), payload: rest.slice(idx + 1) }
  }
}

export function encodeVeloxWebCapture(url: string, device?: string): string {
  const d = device ?? 'laptop'
  return `${VELOX_WEB_PREFIX}${d}:${encodeURIComponent(url)}`
}

export function isVeloxUnresolvedSrc(src: string): boolean {
  return (
    src.startsWith(VELOX_STOCK_PREFIX) ||
    src.startsWith(VELOX_CARD_PREFIX) ||
    src.startsWith(VELOX_WEB_PREFIX)
  )
}

/** Canvas placeholders — skip `preloadImages` / `Image()` / `loadImage` (CLI resolves velox-* to files). */
export function isPlaceholderImageSrc(src: string): boolean {
  return src.startsWith('stock://') || isVeloxUnresolvedSrc(src)
}
