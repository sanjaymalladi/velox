/** Procedural stock imagery — crisp SVG tiles (no remote fetch required). */

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Deterministic pseudo-random particles from query string. */
function particles(
  query: string,
  w: number,
  h: number,
  count: number,
  palette: { hue: number; sat: number; light: number },
): string {
  const seed = hash(query)
  const dots: string[] = []
  for (let i = 0; i < count; i++) {
    const r = ((seed + i * 9973) % 1000) / 1000
    const r2 = ((seed + i * 4271) % 1000) / 1000
    const r3 = ((seed + i * 8191) % 1000) / 1000
    const cx = 48 + r * (w - 96)
    const cy = 48 + r2 * (h - 96)
    const rad = 1.2 + r3 * 3.8
    const op = 0.25 + r3 * 0.65
    const hue = palette.hue + r * 40
    dots.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(2)}" fill="hsla(${hue.toFixed(0)},${palette.sat}%,${palette.light}%,${op.toFixed(2)})"/>`,
    )
  }
  return dots.join('\n  ')
}

function neuralLines(w: number, h: number): string {
  const lines: string[] = []
  const nodes = [
    [w * 0.22, h * 0.35],
    [w * 0.42, h * 0.28],
    [w * 0.58, h * 0.42],
    [w * 0.72, h * 0.32],
    [w * 0.35, h * 0.58],
    [w * 0.55, h * 0.68],
    [w * 0.78, h * 0.62],
  ]
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if ((i + j) % 3 !== 0) continue
      const [x1, y1] = nodes[i]
      const [x2, y2] = nodes[j]
      lines.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(103,232,249,0.22)" stroke-width="1.2"/>`,
      )
    }
  }
  for (const [x, y] of nodes) {
    lines.push(`<circle cx="${x}" cy="${y}" r="5" fill="rgba(56,189,248,0.85)"/>`)
    lines.push(`<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1"/>`)
  }
  return lines.join('\n  ')
}

/** Retro beige CRT / desktop motif for 90s-era themes. */
function retroDesktop(w: number, h: number): string {
  const cx = w / 2
  const monW = w * 0.72
  const monH = h * 0.42
  const monX = cx - monW / 2
  const monY = h * 0.18
  return `
  <rect x="${monX}" y="${monY}" width="${monW}" height="${monH}" fill="#d4d0c8" stroke="#000" stroke-width="3"/>
  <rect x="${monX + 12}" y="${monY + 12}" width="${monW - 24}" height="${monH - 36}" fill="#8c9ae0"/>
  <rect x="${monX + 24}" y="${monY + 24}" width="${monW - 48}" height="${monH - 60}" fill="#000"/>
  <text x="${cx}" y="${monY + monH * 0.55}" text-anchor="middle" font-family="Courier New,monospace" font-size="${Math.round(monH * 0.12)}" fill="#33ff33">C:\\&gt;_</text>
  <rect x="${cx - monW * 0.18}" y="${monY + monH}" width="${monW * 0.36}" height="${monH * 0.08}" fill="#b8b4ac" stroke="#000" stroke-width="2"/>
  <rect x="${cx - monW * 0.28}" y="${monY + monH + monH * 0.08}" width="${monW * 0.56}" height="14" fill="#a8a49c" stroke="#000" stroke-width="2"/>
  <rect x="${w * 0.12}" y="${h * 0.78}" width="${w * 0.76}" height="${h * 0.14}" fill="#e91d2a" opacity="0.12"/>
  `
}

export function svgStockArt(query: string, width = 520, height = 640): string {
  const isRetro = /vintage|retro|desktop|computer|beige|office|crt|199\d|dell/i.test(query)
  const isNeural = !isRetro && /neural|network|particle|abstract|ai|light|dark/i.test(query)
  const w = Math.round(width)
  const h = Math.round(height)
  const radius = isRetro ? 0 : 36

  if (isRetro) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0ece4"/>
      <stop offset="1" stop-color="#d8d4cc"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${retroDesktop(w, h)}
</svg>`
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#0b1020"/>
      <stop offset="0.55" stop-color="#141c38"/>
      <stop offset="1" stop-color="#050508"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.35" cy="0.25" r="0.75">
      <stop offset="0" stop-color="rgba(41,151,255,0.35)"/>
      <stop offset="1" stop-color="rgba(41,151,255,0)"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" rx="${radius}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" rx="${radius}" fill="url(#glow)"/>
  ${isNeural ? neuralLines(w, h) : ''}
  ${particles(query, w, h, isNeural ? 48 : 64, { hue: 200, sat: 85, light: 68 })}
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${radius - 1}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
</svg>`
}
