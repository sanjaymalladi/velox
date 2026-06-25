/**
 * Tiny built-in reel asset pack — MIT-safe inline SVG data URLs (no remote fetch).
 * Expand over time without shipping binary PNGs in git.
 */

export const reelsBasicPack = ['new-badge', 'arrow-right', 'highlight-ring', 'phone-frame', 'star-burst'] as const
export type ReelsBasicAsset = (typeof reelsBasicPack)[number]

const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`

/** Curated SVG primitives */
export const reelAssetSrc: Record<string, string> = {
  'new-badge': svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="280" height="120" viewBox="0 0 280 120">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a855f7"/>
      </linearGradient></defs>
      <rect rx="28" ry="28" width="260" height="88" x="10" y="16" fill="url(#g)"/>
      <text x="140" y="72" font-family="system-ui,sans-serif" font-size="34" font-weight="800"
        fill="white" text-anchor="middle">NEW</text>
    </svg>`),
  'arrow-right': svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
      <path d="M20 62h110" stroke="#fff" stroke-width="10" stroke-linecap="round" fill="none"/>
      <path d="M120 38l44 28-42 34" stroke="#fff" stroke-width="10" stroke-linecap="round"
        stroke-linejoin="round" fill="none"/>
    </svg>`),
  'highlight-ring': svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="78" stroke="rgba(41,151,255,0.35)" stroke-width="2" fill="none"/>
      <circle cx="100" cy="100" r="58" stroke="rgba(41,151,255,0.55)" stroke-width="1.5" fill="none" stroke-dasharray="8 6"/>
    </svg>`),
  'phone-frame': svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="280" height="500" viewBox="0 0 280 500">
      <defs>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#64748b"/>
          <stop offset="0.45" stop-color="#1e293b"/>
          <stop offset="1" stop-color="#0f172a"/>
        </linearGradient>
        <linearGradient id="screen" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stop-color="#1e3a5f"/>
          <stop offset="0.5" stop-color="#0f172a"/>
          <stop offset="1" stop-color="#020617"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.3" cy="0.15" r="0.65">
          <stop offset="0" stop-color="rgba(41,151,255,0.45)"/>
          <stop offset="1" stop-color="rgba(41,151,255,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="140" cy="470" rx="72" ry="14" fill="rgba(0,0,0,0.35)"/>
      <rect x="24" y="16" rx="38" ry="38" width="232" height="456" fill="url(#rim)" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
      <rect x="44" y="52" rx="14" ry="14" width="192" height="360" fill="url(#screen)"/>
      <rect x="44" y="52" rx="14" ry="14" width="192" height="360" fill="url(#glow)"/>
      <rect x="60" y="72" width="72" height="8" rx="4" fill="rgba(255,255,255,0.12)"/>
      <rect x="60" y="96" width="140" height="6" rx="3" fill="rgba(255,255,255,0.08)"/>
      <circle cx="140" cy="438" r="16" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    </svg>`),
  'star-burst': svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
      <g fill="#facc15" stroke="#fbbf24" stroke-width="4">
        <polygon points="130,14 154,94 238,94 174,146 198,226 130,176 62,226 86,146 22,94 106,94"/>
      </g>
    </svg>`),
}

/** Simple brand-adjacent marks (generic paths, not official logos). */
export const simpleGlyphSrc: Record<string, string> = {
  github: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="#e2e8f0">
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.262.8-.581
        0-.288-.011-1.243-.017-2.25-3.453.743-4.171-1.465-4.171-1.465
        -.563-1.442-1.377-1.826-1.377-1.826-1.127-.764.086-.749.086-.749 1.246.086 1.9 1.268 1.9 1.268
        1.114 1.892 2.924 1.346 3.634 1.029.114-.8.442-1.346.804-1.657-2.759-.308-5.659-1.354-5.659-6.029
        0-1.333.478-2.426 1.268-3.279-.129-.309-.549-1.554.117-3.239 0 0 1.027-.328 3.363 1.253a11.71 11.71 0 0 1 3.064-.409c1.042.005 2.086.139 3.066.407 2.337-1.581 3.362-1.253 3.362-1.253
        .667 1.685.246 2.93.121 3.239.79.853 1.267 1.946 1.267 3.279 0 4.682-2.907 5.716-5.677 6.019
        .446.379.849 1.128.849 2.276 0 1.642-.015 2.967-.015 3.369 0 .319.218.694.815.579A12 12 0 0 0 12 .5"/>
    </svg>`),
  npm: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 256 256" fill="#cb3837">
      <path d="M0 256V0h256v256H128V128h-64v128H0z"/>
    </svg>`),
  rss: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="#f97316">
      <circle cx="6.18" cy="17.82" r="3.18"/>
      <path d="M4 4.44v4.13c5.61 0 10.22 4.61 10.22 10.22h4.13C18.35 11.59 11.81 5.04 4 4.44z"/>
      <path d="M4 10.71v4.13c8.91 0 16.28 7.37 16.39 16.36h4.07C24.54 21.56 14.93 11.93 4 10.71z"/>
    </svg>`),
  discord: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20 4.5c-1.5-.7-3.2-1.2-5-1.6h-.5l-.9 2.1a12 12 0 0 0-5.2 0L7 2.9h-.5C4.7 3.3 3 3.8 1.5 4.5L1 5.2c0 5.3 1.2 10 3.3 13.5l.2.3c1.5.7 3 1.2 4.5 1.4h.3c.4-.5.7-1 1-1.6-1.7-.5-3.2-1.4-4.5-2.5.4-.3.8-.6 1.2-.9 3.4 1.6 7.2 1.6 10.6 0 .4.3.8.6 1.2.9-1.3 1.1-2.8 2-4.5 2.5.3.6.6 1.1 1 1.6h.3c1.5-.2 3-.7 4.5-1.4l.2-.3c2.1-3.5 3.3-8.2 3.3-13.5l-.5-.7zM8.3 14.1c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm7.4 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z"/>
    </svg>`),
}

export function resolveReelAsset(name: string): string | undefined {
  return reelAssetSrc[name]
}

export function resolveSimpleGlyph(pack: string | undefined, name: string): string | undefined {
  if (pack && pack !== 'simple-icons' && pack !== 'velox')
    return undefined
  return simpleGlyphSrc[name.toLowerCase()]
}
