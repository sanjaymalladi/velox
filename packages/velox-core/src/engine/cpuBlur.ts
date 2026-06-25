import { imageDataRGBA } from 'stackblur-canvas'
import { supportsCanvasFilter } from './canvasFilter'

type Ctx = CanvasRenderingContext2D
type ScratchCanvas = HTMLCanvasElement

let scratchCanvas: ScratchCanvas | null = null
let scratchW = 0
let scratchH = 0

function getCreateCanvas(): (w: number, h: number) => ScratchCanvas {
  return (w, h) => {
    if (typeof document === 'undefined') {
      throw new Error('CPU blur scratch canvas requires a browser document')
    }
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }
}

function getScratch(w: number, h: number): { canvas: ScratchCanvas; ctx: Ctx } {
  const createCanvas = getCreateCanvas()
  if (!scratchCanvas || scratchW < w || scratchH < h) {
    scratchCanvas = createCanvas(w, h)
    scratchW = w
    scratchH = h
  }
  const canvas = scratchCanvas
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to acquire blur scratch context')
  return { canvas, ctx }
}

/** Node full-frame blur is expensive — blur at half res then upscale. */
function nodeBlurScale(width: number, height: number): number {
  if (supportsCanvasFilter) return 1
  if (width * height >= 1280 * 720) return 0.5
  return 1
}

export function blurImageDataRGBA(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  if (radius < 0.35) return
  const imageData = { data, width, height } as ImageData
  imageDataRGBA(imageData, 0, 0, width, height, Math.round(Math.min(radius, 24)))
}

/**
 * Draw a full-frame layer with optional CPU blur (browser fallback when CSS filter unavailable).
 */
export function drawLayerWithBlur(
  targetCtx: Ctx,
  width: number,
  height: number,
  alpha: number,
  blurRadius: number,
  drawLayer: (ctx: Ctx) => void,
): void {
  if (blurRadius < 0.35 || supportsCanvasFilter) {
    targetCtx.save()
    targetCtx.globalAlpha = alpha
    drawLayer(targetCtx)
    targetCtx.restore()
    return
  }

  const blurScale = nodeBlurScale(width, height)
  const sw = Math.max(2, Math.round(width * blurScale))
  const sh = Math.max(2, Math.round(height * blurScale))
  const scaledRadius = blurRadius * blurScale

  const { canvas: scratch, ctx: scratchCtx } = getScratch(sw, sh)
  scratchCtx.setTransform(1, 0, 0, 1, 0, 0)
  scratchCtx.clearRect(0, 0, sw, sh)
  scratchCtx.globalAlpha = 1

  if (blurScale < 1) {
    scratchCtx.save()
    scratchCtx.scale(blurScale, blurScale)
    drawLayer(scratchCtx)
    scratchCtx.restore()
  } else {
    drawLayer(scratchCtx)
  }

  const imageData = scratchCtx.getImageData(0, 0, sw, sh)
  blurImageDataRGBA(imageData.data, sw, sh, scaledRadius)
  scratchCtx.putImageData(imageData, 0, 0)

  targetCtx.save()
  targetCtx.globalAlpha = alpha
  if (blurScale < 1) {
    targetCtx.imageSmoothingEnabled = true
    targetCtx.imageSmoothingQuality = 'high'
  }
  targetCtx.drawImage(scratch, 0, 0, width, height)
  targetCtx.restore()
}

/**
 * Apply CPU blur around already-drawn content in a rectangular region.
 */
export function blurRegion(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  if (radius < 0.35 || supportsCanvasFilter) return
  const ix = Math.max(0, Math.floor(x))
  const iy = Math.max(0, Math.floor(y))
  const iw = Math.min(Math.ceil(w), ctx.canvas.width - ix)
  const ih = Math.min(Math.ceil(h), ctx.canvas.height - iy)
  if (iw <= 0 || ih <= 0) return
  const imageData = ctx.getImageData(ix, iy, iw, ih)
  blurImageDataRGBA(imageData.data, iw, ih, radius)
  ctx.putImageData(imageData, ix, iy)
}
