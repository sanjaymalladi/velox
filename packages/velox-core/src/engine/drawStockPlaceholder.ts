/**
 * Bounded stock placeholder when no image is loaded (browser preview / offline).
 */
type Ctx = CanvasRenderingContext2D

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function drawStockPlaceholder(
  ctx: Ctx,
  slug: string,
  drawX: number,
  drawY: number,
  width: number,
  height: number,
  opacity: number,
  borderRadius = 0,
): void {
  const query = slug.replace(/^stock:\/\//, '').replace(/-/g, ' ')
  const seed = hash(query)
  const isNeural = /neural|network|particle|abstract|ai|light|dark/i.test(query)

  const x = drawX - width / 2
  const y = drawY - height / 2

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity))

  const r = Math.min(borderRadius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
  ctx.clip()

  const bg = ctx.createLinearGradient(x, y, x, y + height)
  bg.addColorStop(0, '#0b1020')
  bg.addColorStop(0.5, '#141c38')
  bg.addColorStop(1, '#050508')
  ctx.fillStyle = bg
  ctx.fillRect(x, y, width, height)

  const glow = ctx.createRadialGradient(x + width * 0.35, y + height * 0.25, 0, x + width * 0.35, y + height * 0.25, width * 0.7)
  glow.addColorStop(0, 'rgba(41,151,255,0.32)')
  glow.addColorStop(1, 'rgba(41,151,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x, y, width, height)

  if (isNeural) {
    const nodes: [number, number][] = [
      [0.22, 0.35], [0.42, 0.28], [0.58, 0.42], [0.72, 0.32],
      [0.35, 0.58], [0.55, 0.68], [0.78, 0.62],
    ].map(([nx, ny]) => [x + nx * width, y + ny * height] as [number, number])

    ctx.strokeStyle = 'rgba(103,232,249,0.22)'
    ctx.lineWidth = 1.2
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if ((i + j) % 3 !== 0) continue
        ctx.beginPath()
        ctx.moveTo(nodes[i][0], nodes[i][1])
        ctx.lineTo(nodes[j][0], nodes[j][1])
        ctx.stroke()
      }
    }
    for (const [cx, cy] of nodes) {
      ctx.fillStyle = 'rgba(56,189,248,0.85)'
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const count = isNeural ? 42 : 56
  for (let i = 0; i < count; i++) {
    const r1 = ((seed + i * 9973) % 1000) / 1000
    const r2 = ((seed + i * 4271) % 1000) / 1000
    const r3 = ((seed + i * 8191) % 1000) / 1000
    const px = x + 24 + r1 * (width - 48)
    const py = y + 24 + r2 * (height - 48)
    const rad = 1 + r3 * 3
    ctx.fillStyle = `rgba(103,232,249,${0.2 + r3 * 0.55})`
    ctx.beginPath()
    ctx.arc(px, py, rad, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.restore()
}
