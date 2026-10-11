type Ctx = CanvasRenderingContext2D

/** Browser Canvas supports filter + readback; @napi-rs/canvas breaks getImageData after filter. */
export const supportsCanvasFilter = typeof window !== 'undefined'

export function setCanvasFilter(ctx: Ctx, filter: string): void {
  if (supportsCanvasFilter) ctx.filter = filter
}

type ElementBlurFn = (
  targetCtx: Ctx,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  blurRadius: number,
  drawFn: (ctx: Ctx) => void,
  postProcess?: (data: ImageData) => void,
) => void

let nodeElementBlur: ElementBlurFn | undefined

/** Register the Node CPU-blur backend (called from `@velox-video/core/node-render`). */
export function setNodeElementBlur(fn: ElementBlurFn): void {
  nodeElementBlur = fn
}

/**
 * Draw an element, applying a real blur in the browser (via CSS filter) and in
 * Node (via a scratch-canvas CPU blur). On Node, `postProcess` lets callers
 * adjust pixels (e.g. brightness/saturate) on the blurred image data.
 */
export function applyElementBlur(
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
  if (nodeElementBlur) {
    nodeElementBlur(targetCtx, cx, cy, halfW, halfH, blurRadius, drawFn, postProcess)
    return
  }
  drawFn(targetCtx)
}
