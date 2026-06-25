type Ctx = CanvasRenderingContext2D

/** Browser Canvas supports filter + readback; @napi-rs/canvas breaks getImageData after filter. */
export const supportsCanvasFilter = typeof window !== 'undefined'

export function setCanvasFilter(ctx: Ctx, filter: string): void {
  if (supportsCanvasFilter) ctx.filter = filter
}
