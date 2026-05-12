/** Deterministic SVG “cards” for preprocess — no React / Satori; loads as .svg via canvas. */

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function svgGithubRepoCard(owner: string, repo: string): string {
  const title = `${owner}/${repo}`
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="480" viewBox="0 0 900 480">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#312e81"/>
    </linearGradient>
  </defs>
  <rect width="900" height="480" rx="28" fill="url(#bg)"/>
  <text x="56" y="120" font-family="system-ui,sans-serif" font-size="28" fill="#94a3b8">GitHub</text>
  <text x="56" y="220" font-family="system-ui,sans-serif" font-size="48" font-weight="800" fill="#f8fafc">${esc(title)}</text>
  <text x="56" y="300" font-family="system-ui,sans-serif" font-size="24" fill="#cbd5e1">Rendered card (preprocess) — remote API not required</text>
</svg>`
}

export function svgNpmPackageCard(name: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="880" height="420" viewBox="0 0 880 420">
  <rect width="880" height="420" rx="24" fill="#1e293b"/>
  <text x="48" y="100" font-family="system-ui,sans-serif" font-size="28" fill="#f97316" font-weight="800">npm</text>
  <text x="48" y="200" font-family="system-ui,sans-serif" font-size="44" font-weight="800" fill="#f1f5f9">${esc(name)}</text>
  <text x="48" y="280" font-family="system-ui,sans-serif" font-size="22" fill="#94a3b8">Package card (offline SVG)</text>
</svg>`
}

export function svgBrandCard(brand: string, provider: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="460" viewBox="0 0 900 460">
  <rect width="900" height="460" rx="28" fill="#111827"/>
  <text x="48" y="110" font-family="system-ui,sans-serif" font-size="26" fill="#6b7280">Brand · ${esc(provider)}</text>
  <text x="48" y="230" font-family="system-ui,sans-serif" font-size="56" font-weight="900" fill="#e5e7eb">${esc(brand)}</text>
  <text x="48" y="320" font-family="system-ui,sans-serif" font-size="22" fill="#9ca3af">OpenBrand-style metadata is best-effort; this is a fallback tile.</text>
</svg>`
}

export function svgWebsitePlaceholder(device: string, url: string): string {
  const short = url.length > 64 ? url.slice(0, 62) + '…' : url
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="920" height="560" viewBox="0 0 920 560">
  <rect width="920" height="560" rx="20" fill="#1f2937"/>
  <rect x="32" y="32" width="856" height="48" rx="10" fill="#374151"/>
  <text x="56" y="66" font-family="system-ui,sans-serif" font-size="22" fill="#e5e7eb">Web capture (${esc(device)}) — install Playwright for live shots</text>
  <text x="56" y="300" font-family="system-ui,sans-serif" font-size="30" fill="#9ca3af">${esc(short)}</text>
</svg>`
}
