import type { UiDemoElementConfig } from '../types'
import type { AnimationState } from './animations'

type Ctx = CanvasRenderingContext2D

const DESIGN_WIDTH = 1000
const DESIGN_HEIGHT = 620

function roundedRect(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function ease(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function paintText(ctx: Ctx, value: string, x: number, y: number, size: number, color: string, weight = 500): void {
  ctx.fillStyle = color
  // @napi-rs/canvas accepts hundred-step font weights. Values such as 450
  // can be parsed as a pixel size and produce enormous glyphs in exported video.
  const canvasWeight = Math.max(100, Math.min(900, Math.round(weight / 100) * 100))
  ctx.font = `${canvasWeight} ${size}px Inter, ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(value, x, y)
}

function drawPointer(ctx: Ctx, x: number, y: number, down: number, click: number): void {
  // A familiar arrow pointer with a dark keyline stays visible on both UI themes.
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1 - down * 0.08, 1 - down * 0.08)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, 28)
  ctx.lineTo(7, 21)
  ctx.lineTo(13, 34)
  ctx.lineTo(18, 32)
  ctx.lineTo(12, 19)
  ctx.lineTo(23, 18)
  ctx.closePath()
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#11131a'
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  if (click > 0) {
    ctx.save()
    ctx.globalAlpha = click * 0.8
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x + 7, y + 7, 9 + (1 - click) * 16, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

/** Draws one complete, seek-safe software UI demo from scene-relative time. */
export function drawUiDemo(
  ctx: Ctx,
  element: UiDemoElementConfig,
  centerX: number,
  centerY: number,
  canvasWidth: number,
  canvasHeight: number,
  seconds: number,
  sceneDuration: number,
  animation: AnimationState,
): void {
  const displayWidth = element.width ?? Math.min(canvasWidth * 0.84, canvasHeight * 1.48)
  const displayHeight = element.height ?? displayWidth * DESIGN_HEIGHT / DESIGN_WIDTH
  const sx = displayWidth / DESIGN_WIDTH
  const sy = displayHeight / DESIGN_HEIGHT
  const left = centerX - displayWidth / 2
  const top = centerY - displayHeight / 2
  const t = Math.max(0, Math.min(1, seconds / Math.max(sceneDuration, 0.001)))
  const enter = ease(t / 0.14)
  const typing = ease((t - 0.22) / 0.26)
  const cursorToField = ease((t - 0.08) / 0.15)
  const cursorToAction = ease((t - 0.58) / 0.14)
  const rendering = ease((t - 0.76) / 0.15)
  const complete = ease((t - 0.86) / 0.12)
  const clickField = 1 - ease(Math.abs(t - 0.23) / 0.035)
  const clickAction = 1 - ease(Math.abs(t - 0.73) / 0.035)
  const dark = element.theme !== 'light'
  const surface = dark ? '#171922' : '#ffffff'
  const inner = dark ? '#1d202a' : '#f7f8fb'
  const text = dark ? '#f6f5fb' : '#20212a'
  const muted = dark ? '#9396a8' : '#797d8b'
  const line = dark ? '#2d303b' : '#e5e7ed'
  const accent = element.accent ?? '#8b7bff'
  const fieldX = 295, fieldY = 282
  const buttonX = 317, buttonY = 419
  const cursorX = 150 + (fieldX - 150) * cursorToField + (buttonX - fieldX) * cursorToAction
  const cursorY = 558 + (fieldY - 558) * cursorToField + (buttonY - fieldY) * cursorToAction
  const down = Math.max(clickField, clickAction)
  const ripple = Math.max(0, 1 - Math.min(Math.abs(t - 0.23), Math.abs(t - 0.73)) / 0.1)

  ctx.save()
  ctx.globalAlpha *= animation.opacity * enter
  ctx.translate(left + animation.x, top + animation.y)
  ctx.translate(displayWidth / 2, displayHeight / 2)
  ctx.rotate(animation.rotation * Math.PI / 180)
  ctx.scale(animation.scaleX * (0.965 + enter * 0.035), animation.scaleY * (0.965 + enter * 0.035))
  ctx.translate(-displayWidth / 2, -displayHeight / 2)
  ctx.scale(sx, sy)

  // A small offset layer gives the window depth without a per-frame blur pass.
  ctx.save()
  roundedRect(ctx, 6, 12, DESIGN_WIDTH, DESIGN_HEIGHT, 20)
  ctx.fillStyle = 'rgba(0,0,0,0.30)'
  ctx.fill()
  roundedRect(ctx, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 20)
  ctx.fillStyle = surface
  ctx.fill()
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.09)' : 'rgba(35,40,60,0.12)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
  ctx.save()
  roundedRect(ctx, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 20)
  ctx.clip()

  // Window chrome.
  ctx.fillStyle = dark ? '#12141b' : '#f0f1f5'
  ctx.fillRect(0, 0, DESIGN_WIDTH, 54)
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(25 + i * 18, 27, 5, 0, Math.PI * 2)
    ctx.fillStyle = ['#ff6d67', '#f8c65a', '#43c985'][i]!
    ctx.fill()
  }
  paintText(ctx, element.app, 90, 27, 13, muted, 600)
  ctx.fillStyle = line
  ctx.fillRect(0, 53, DESIGN_WIDTH, 1)

  // Sidebar and hierarchy.
  const sx0 = 0, sy0 = 0
  ctx.fillStyle = dark ? '#151720' : '#fbfbfd'
  ctx.fillRect(sx0, sy0 + 54, 190, DESIGN_HEIGHT - 54)
  ctx.fillStyle = line
  ctx.fillRect(sx0 + 189, sy0 + 54, 1, DESIGN_HEIGHT - 54)
  roundedRect(ctx, sx0 + 20, sy0 + 82, 28, 28, 9)
  ctx.fillStyle = accent
  ctx.fill()
  paintText(ctx, 'V', sx0 + 29, sy0 + 96, 14, '#fff', 700)
  paintText(ctx, element.app, sx0 + 58, sy0 + 96, 14, text, 650)
  paintText(ctx, 'WORKSPACE', sx0 + 22, sy0 + 145, 9, muted, 700)
  paintText(ctx, '◈   Studio', sx0 + 24, sy0 + 179, 12, text, 600)
  paintText(ctx, '▧   My videos', sx0 + 24, sy0 + 215, 12, muted)
  paintText(ctx, '✧   Media library', sx0 + 24, sy0 + 251, 12, muted)
  roundedRect(ctx, sx0 + 16, sy0 + 543, 158, 48, 12)
  ctx.fillStyle = inner
  ctx.fill()
  paintText(ctx, 'Free workspace', sx0 + 29, sy0 + 561, 10, muted)
  paintText(ctx, 'Upgrade plan  ↗', sx0 + 29, sy0 + 578, 10, text, 600)

  // Main editor.
  const mainX = sx0 + 222
  paintText(ctx, 'CREATE', mainX, sy0 + 92, 9, accent, 750)
  paintText(ctx, element.title, mainX, sy0 + 126, 24, text, 650)
  paintText(ctx, 'Start with an idea. Velox handles the frames.', mainX, sy0 + 154, 11, muted)

  paintText(ctx, 'YOUR PROMPT', mainX, sy0 + 202, 10, muted, 650)
  const fieldWidth = 728
  roundedRect(ctx, mainX, sy0 + 218, fieldWidth, 140, 12)
  ctx.fillStyle = inner
  ctx.fill()
  ctx.strokeStyle = clickField > 0.1 ? accent : line
  ctx.lineWidth = clickField > 0.1 ? 1.6 : 1
  ctx.stroke()
  const promptVisible = Math.max(1, Math.ceil(element.prompt.length * typing))
  paintText(ctx, element.prompt.slice(0, promptVisible), mainX + 18, sy0 + 249, 13, text, 450)
  if (typing < 0.98 && t > 0.24) {
    const cursorText = element.prompt.slice(0, promptVisible)
    ctx.font = '400 13px Inter, ui-sans-serif, system-ui, sans-serif'
    const caretX = mainX + 18 + ctx.measureText(cursorText).width + 2
    ctx.fillStyle = accent
    ctx.fillRect(caretX, sy0 + 237, 2, 18)
  }
  paintText(ctx, '16:9', mainX + 17, sy0 + 333, 10, muted)
  paintText(ctx, '1080p', mainX + 68, sy0 + 333, 10, muted)
  paintText(ctx, 'Motion graphics', mainX + 127, sy0 + 333, 10, muted)

  // Action control with responsive click/render feedback.
  const actionY = sy0 + 396
  paintText(ctx, 'READY TO CREATE', mainX, sy0 + 384, 9, muted, 650)
  const buttonW = 188, buttonH = 46
  roundedRect(ctx, mainX, actionY, buttonW, buttonH, 12)
  ctx.fillStyle = accent
  ctx.fill()
  const actionLabel = complete > 0.5 ? 'Video ready' : rendering > 0.01 ? 'Rendering…' : element.action
  paintText(ctx, actionLabel, mainX + 17, actionY + 24, 12, '#fff', 650)
  if (rendering > 0.01 && complete < 1) {
    roundedRect(ctx, mainX, actionY + 56, buttonW, 4, 2)
    ctx.fillStyle = dark ? '#343746' : '#e6e7ec'
    ctx.fill()
    roundedRect(ctx, mainX, actionY + 56, buttonW * rendering, 4, 2)
    ctx.fillStyle = accent
    ctx.fill()
  }

  // Results toast arrives after progress, without covering the prompt.
  if (complete > 0) {
    const toastX = sx0 + 705, toastY = sy0 + 493 + (1 - complete) * 16
    ctx.save()
    ctx.globalAlpha *= complete
    roundedRect(ctx, toastX, toastY, 265, 70, 14)
    ctx.fillStyle = 'rgba(0,0,0,.24)'
    ctx.fill()
    roundedRect(ctx, toastX - 2, toastY - 2, 265, 70, 14)
    ctx.fillStyle = dark ? '#252833' : '#fff'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(toastX + 24, toastY + 35, 12, 0, Math.PI * 2)
    ctx.fillStyle = '#46c78a'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(toastX + 18, toastY + 35)
    ctx.lineTo(toastX + 22, toastY + 39)
    ctx.lineTo(toastX + 30, toastY + 30)
    ctx.stroke()
    paintText(ctx, element.result, toastX + 46, toastY + 27, 12, text, 650)
    paintText(ctx, 'Open your video', toastX + 46, toastY + 48, 10, muted)
    ctx.restore()
  }

  // Persistent UI seam and layers stay perfectly seekable; only the pointer moves.
  ctx.restore()
  drawPointer(ctx, cursorX, cursorY, down, ripple)
  ctx.restore()
}
