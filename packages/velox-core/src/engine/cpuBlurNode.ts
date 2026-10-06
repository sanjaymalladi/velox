import { createCanvas } from '@napi-rs/canvas'
import { imageDataRGBA } from 'stackblur-canvas'
import { supportsCanvasFilter } from './canvasFilter'

type Ctx = CanvasRenderingContext2D
type ScratchCanvas = {
  width: number
  height: number
  getContext(type: '2d'): Ctx | null
}

let scratchCanvas: ScratchCanvas | null = null
let scratchW = 0
let scratchH = 0

function getScratch(w: number, h: number): { canvas: ScratchCanvas; ctx: Ctx } {
  if (!scratchCanvas || scratchW < w || scratchH < h) {
    scratchCanvas = createCanvas(w, h) as unknown as ScratchCanvas
    scratchW = w
    scratchH = h
  }
  const canvas = scratchCanvas
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d') as Ctx | null
  if (!ctx) throw new Error('Failed to acquire blur scratch context')
  return { canvas, ctx }
}

function nodeBlurScale(width: number, height: number): number {
  if (width * height >= 1280 * 720) return 0.5
  return 1
}

function blurImageDataRGBA(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  if (radius < 0.35) return
  const imageData = { data, width, height } as ImageData
  imageDataRGBA(imageData, 0, 0, width, height, Math.round(Math.min(radius, 24)))
}

/** Node/native canvas CPU blur for transitions when CSS filter is unavailable. */
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
  targetCtx.drawImage(scratch as unknown as CanvasImageSource, 0, 0, width, height)
  targetCtx.restore()
}

/**
 * Per-element CPU blur for native export (used when CSS `filter` is unavailable).
 * Renders `drawFn` into a scratch region, blurs it, then composites back onto
 * `targetCtx`. `postProcess` (e.g. brightness/saturate) runs on the blurred data.
 */
export function drawElementWithBlur(
  targetCtx: Ctx,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  blurRadius: number,
  drawFn: (ctx: Ctx) => void,
  postProcess?: (data: ImageData) => void,
): void {
  if (supportsCanvasFilter) {
    drawFn(targetCtx)
    return
  }
  if (blurRadius < 0.35 && !postProcess) {
    drawFn(targetCtx)
    return
  }

  const pad = Math.ceil(blurRadius * 2) + 2
  const fullW = Math.max(2, (halfW + pad) * 2)
  const fullH = Math.max(2, (halfH + pad) * 2)
  const blurScale = nodeBlurScale(fullW, fullH)
  const w = Math.max(2, Math.round(fullW * blurScale))
  const h = Math.max(2, Math.round(fullH * blurScale))
  const x = cx - fullW / 2
  const y = cy - fullH / 2

  const { canvas: scratch, ctx: sctx } = getScratch(w, h)
  sctx.setTransform(1, 0, 0, 1, 0, 0)
  sctx.clearRect(0, 0, w, h)
  sctx.save()
  sctx.translate(-x, -y)
  if (blurScale < 1) sctx.scale(blurScale, blurScale)
  drawFn(sctx)
  sctx.restore()

  const imageData = sctx.getImageData(0, 0, w, h)
  if (blurRadius >= 0.35) blurImageDataRGBA(imageData.data, w, h, blurRadius * blurScale)
  if (postProcess) postProcess(imageData)
  sctx.putImageData(imageData, 0, 0)

  targetCtx.save()
  targetCtx.imageSmoothingEnabled = true
  targetCtx.imageSmoothingQuality = 'high'
  targetCtx.drawImage(scratch as unknown as CanvasImageSource, x, y, fullW, fullH)
  targetCtx.restore()
}

/** In-place brightness (multiply) + saturation (lerp toward luma) on RGBA data. */
export function adjustBrightnessSaturation(
  data: Uint8ClampedArray,
  brightness = 1,
  saturate = 1,
): void {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * brightness
    let g = data[i + 1] * brightness
    let b = data[i + 2] * brightness
    if (saturate !== 1) {
      const l = 0.299 * r + 0.587 * g + 0.114 * b
      r = l + (r - l) * saturate
      g = l + (g - l) * saturate
      b = l + (b - l) * saturate
    }
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
}
