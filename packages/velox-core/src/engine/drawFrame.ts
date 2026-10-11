/**
 * Master frame compositor.
 * Resolves element positions, computes animation states, and draws a single frame.
 * Canonical renderer for native export and the docs playground.
 * The CLI preview currently ships a lightweight inline fallback for startup speed.
 */
import type {
  VeloxVideoConfig,
  SceneConfig,
  ElementConfig,
  VeloxPosition,
  VeloxColor,
  VeloxGradient,
  ImageElementConfig,
  LogoElementConfig,
  MotionQuality,
} from '../types'
import { getAnimationState } from './animations'
import type { AnimationState } from './animations'
import { drawText, drawTextList, drawCaptionTrack } from './drawText'
import { drawStockPlaceholder } from './drawStockPlaceholder'
import { drawShape } from './drawShape'
import { lerp, easeOut } from './easing'
import { supportsCanvasFilter, setCanvasFilter, setNodeElementBlur, applyElementBlur } from './canvasFilter'
import { drawLayerWithBlur as browserDrawLayerWithBlur } from './cpuBlur'
import { getSimplex, preloadHeavyDeps } from './lazyDeps'
import { applyFxCpu, fxEnabled, getFx } from './webglPipeline'
import { calculateFrameTimeline } from '../timeline'

type DrawLayerWithBlurFn = typeof browserDrawLayerWithBlur

let nodeDrawLayerWithBlur: DrawLayerWithBlurFn | undefined

/** When the all-WebGL FX pipeline is active, per-scene Canvas2D overlays are suppressed. */
let globalFxActive = false

/** Register Node CPU blur (import `@velox-video/core/node-render` before native export). */
export function setNodeDrawLayerWithBlur(fn: DrawLayerWithBlurFn): void {
  nodeDrawLayerWithBlur = fn
}

export { setNodeElementBlur } from './canvasFilter'

function drawLayerWithBlur(
  targetCtx: Ctx,
  width: number,
  height: number,
  alpha: number,
  blurRadius: number,
  drawLayer: (ctx: Ctx) => void,
): void {
  if (supportsCanvasFilter || typeof document !== 'undefined') {
    browserDrawLayerWithBlur(targetCtx, width, height, alpha, blurRadius, drawLayer)
    return
  }
  if (nodeDrawLayerWithBlur) {
    nodeDrawLayerWithBlur(targetCtx, width, height, alpha, blurRadius, drawLayer)
    return
  }
  targetCtx.save()
  targetCtx.globalAlpha = alpha
  drawLayer(targetCtx)
  targetCtx.restore()
}

type Ctx = CanvasRenderingContext2D
type CachedImage = { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
type LogoPathEntry = { d: string; fill?: string; stroke?: string; length?: number }
type LogoPathData = { viewBox?: string; paths: LogoPathEntry[] }
type RuntimeLogoElement = LogoElementConfig & { _paths?: LogoPathData; _resolvedSrc?: string }

// ─── Image Cache ──────────────────────────────────────────────────────────────

const _imageCache = new Map<string, CachedImage>()
const _loadingImageSrcs = new Set<string>()

/**
 * Shared image cache. Keys are src strings; values are loaded image objects.
 * In the browser this is HTMLImageElement; in Node it's whatever @napi-rs/canvas
 * returns from loadImage (duck-typed as CachedImage).
 * Fill via `preloadImages()` (browser) or `preloadImagesInNode()` (Node, see `@velox-video/core/node-render`).
 */
export function setImageCache(cache: Map<string, CachedImage>): void {
  cache.forEach((v, k) => _imageCache.set(k, v))
}

// ─── Size presets ─────────────────────────────────────────────────────────────

export function resolveSize(size: any): [number, number] {
  if (Array.isArray(size)) return size as [number, number]
  switch (size) {
    case '4k':       return [3840, 2160]
    case '1080p':    return [1920, 1080]
    case '720p':     return [1280, 720]
    case 'square':   return [1080, 1080]
    case 'portrait': return [1080, 1920]
    case '16:9':     return [1920, 1080]
    case '9:16':     return [1080, 1920]
    case '1:1':      return [1080, 1080]
    case '4:5':      return [1080, 1350]
    case '21:9':     return [2520, 1080]
    default:         return [1920, 1080]
  }
}

// ─── Total Duration ───────────────────────────────────────────────────────────

export function getTotalFrames(config: VeloxVideoConfig): number {
  return calculateFrameTimeline(config.scenes, config.fps).totalFrames
}

// ─── Scene activation ────────────────────────────────────────────────────────

interface ActiveScene {
  scene: SceneConfig
  startFrame: number
  endFrame: number
}

export function buildSceneTimeline(config: VeloxVideoConfig): ActiveScene[] {
  return calculateFrameTimeline(config.scenes, config.fps).scenes.map((item, index) => ({
    scene: config.scenes[index],
    startFrame: item.startFrame,
    endFrame: item.endFrame,
  }))
}

/** Global scene start times in seconds (matches transition-aware timeline). */
export function buildSceneStartsSeconds(config: VeloxVideoConfig): number[] {
  const timeline = buildSceneTimeline(config)
  return timeline.map((t) => t.startFrame / config.fps)
}

// ─── Background ───────────────────────────────────────────────────────────────

/** Procedural crumpled-paper background (Node-safe, deterministic). */
function drawPaperBackground(
  ctx: Ctx,
  width: number,
  height: number,
  tone: 'cream' | 'white' | 'kraft' = 'cream'
): void {
  const bases: Record<string, [string, string, string]> = {
    cream: ['#fbf7ef', '#f3e9d6', '#e9dcc2'],
    white: ['#ffffff', '#f4f1ea', '#e8e3d8'],
    kraft: ['#c9a878', '#b08d5b', '#8a6a3f'],
  }
  const stops = bases[tone] ?? bases.cream
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, stops[0])
  grad.addColorStop(0.5, stops[1])
  grad.addColorStop(1, stops[2])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // Deterministic PRNG so the crumple is identical across Node/browser renders.
  let s = 0x9e3779b9 >>> 0
  const rnd = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }

  ctx.save()
  // Soft shaded fold blobs (large radial gradients) — fake crumple shading.
  for (let i = 0; i < 10; i++) {
    const cx = rnd() * width
    const cy = rnd() * height
    const r = (0.2 + rnd() * 0.35) * Math.max(width, height)
    const dark = rnd() > 0.5
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    const a = 0.05 + rnd() * 0.06
    rg.addColorStop(0, dark ? `rgba(60,40,20,${a})` : `rgba(255,250,240,${a})`)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, width, height)
  }
  // Fine paper fibers.
  ctx.strokeStyle = tone === 'kraft' ? 'rgba(60,40,20,0.05)' : 'rgba(120,100,70,0.04)'
  ctx.lineWidth = 1
  ctx.beginPath()
  const fibers = Math.floor((width * height) / 12000)
  for (let i = 0; i < fibers; i++) {
    const x = rnd() * width
    const y = rnd() * height
    const len = 4 + rnd() * 14
    const ang = rnd() * Math.PI
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len)
  }
  ctx.stroke()
  ctx.restore()
}

function drawBackground(
  ctx: Ctx,
  bg: VeloxColor | VeloxGradient | undefined,
  width: number,
  height: number,
  isGlobal: boolean = false
): void {
  if (!bg) {
    if (isGlobal) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)
    }
    return // transparent for scenes
  }

  if (typeof bg === 'string') {
    if (bg === 'paper' || bg.startsWith('paper(')) {
      const tone = bg.startsWith('paper(')
        ? (bg.slice('paper('.length, -1).trim() as 'cream' | 'white' | 'kraft')
        : 'cream'
      drawPaperBackground(ctx, width, height, tone)
      return
    }
    if (bg.startsWith('grid(')) {
      // e.g. "grid(rgba(0,0,0,0.05), 40)"
      const inner = bg.slice('grid('.length, -1)
      const lastComma = inner.lastIndexOf(',')
      const color = lastComma > -1 ? inner.slice(0, lastComma).trim() : 'rgba(255,255,255,0.05)'
      const size = lastComma > -1 ? parseInt(inner.slice(lastComma + 1).trim(), 10) : 40
      
      // Clear underlying first
      ctx.clearRect(0, 0, width, height)
      
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x <= width; x += size) {
        ctx.moveTo(x, 0); ctx.lineTo(x, height)
      }
      for (let y = 0; y <= height; y += size) {
        ctx.moveTo(0, y); ctx.lineTo(width, y)
      }
      ctx.stroke()
      ctx.restore()
    } else {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)
    }
  } else {
    // VeloxGradient
    const g = bg as VeloxGradient
    // CSS convention: 0deg points up (to top), 90deg points right.
    const rad = (parseFloat(g.angle ?? '0') * Math.PI) / 180
    const dx = Math.sin(rad)
    const dy = -Math.cos(rad)
    const len = Math.sqrt(width * width + height * height)
    const grad = ctx.createLinearGradient(
      width / 2 - (dx * len) / 2,
      height / 2 - (dy * len) / 2,
      width / 2 + (dx * len) / 2,
      height / 2 + (dy * len) / 2
    )
    if (g.stops.length === 0) {
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
    } else if (g.stops.length === 1) {
      grad.addColorStop(0, g.stops[0])
      grad.addColorStop(1, g.stops[0])
    } else {
      g.stops.forEach((stop, i) => { grad.addColorStop(i / (g.stops.length - 1), stop) })
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
  }
}

// ─── Scene camera / overlays ────────────────────────────────────────────────

function sceneCameraSeed(sceneId: string): number {
  let h = 5381
  for (let i = 0; i < sceneId.length; i++)
    h = Math.imul(h ^ sceneId.charCodeAt(i), 709607)
  return h >>> 0
}

function applySceneCamera(
  ctx: Ctx,
  scene: SceneConfig,
  localFrame: number,
  fps: number,
  width: number,
  height: number
): void {
  const cam = scene.camera ?? 'none'
  if (cam === 'none') return

  const durFrames = Math.max(Math.round(scene.duration * fps), 1)
  const rawT = Math.min(Math.max(localFrame / durFrames, 0), 1)
  const t = easeOut(rawT)

  ctx.translate(width / 2, height / 2)

  switch (cam) {
    case 'slowPush': {
      const s = 1 + 0.068 * t
      ctx.scale(s, s)
      break
    }
    case 'parallaxDrift': {
      // Zoom is global; per-element translation is applied in drawElement from
      // each element's `depth` so nearer planes move more than farther ones.
      const s = 1 + 0.024 * t
      ctx.scale(s, s)
      break
    }
    case 'handheld': {
      const seed = sceneCameraSeed(scene.id)
      const hf = localFrame + (seed & 1023)
      const jitterX = Math.sin(hf * 0.068) * 3.2 + Math.sin(hf * 0.121) * 1.6
      const jitterY = Math.cos(hf * 0.079) * 3.2 + Math.cos(hf * 0.097) * 1.8
      const rotDeg = Math.sin(hf * 0.036) * 0.35
      ctx.rotate((rotDeg * Math.PI) / 180)
      ctx.translate(jitterX * t, jitterY * t)
      break
    }
    case 'kenBurns': {
      const s = 1 + 0.092 * t
      const pan = rawT * 38
      ctx.translate(-pan * 0.35, -pan * 0.22)
      ctx.scale(s, s)
      break
    }
    default:
      break
  }

  ctx.translate(-width / 2, -height / 2)
}

/**
 * Per-element parallax offset for the `parallaxDrift` camera. Returns null for any
 * other camera. `depth` 0 gives the baseline drift (preserves prior behaviour);
 * positive depth moves the plane more (nearer the camera), negative less (-1 locks it).
 */
function parallaxOffsetFor(
  scene: SceneConfig,
  localFrame: number,
  fps: number,
  depth: number,
): { dx: number; dy: number } | null {
  if (scene.camera !== 'parallaxDrift') return null
  const durFrames = Math.max(Math.round(scene.duration * fps), 1)
  const rawT = Math.min(Math.max(localFrame / durFrames, 0), 1)
  const t = easeOut(rawT)
  const driftX = Math.sin(rawT * Math.PI * 2 * 0.42) * 14 * t
  const driftY = Math.cos(rawT * Math.PI * 2 * 0.31) * 10 * t
  const f = 1 + depth
  return { dx: driftX * f, dy: driftY * f }
}

function resolveSceneOverlay(scene: SceneConfig, motionQuality: MotionQuality | undefined): { vignette: number; grain: number } {
  const explicit = scene.overlay
  // When the compiler sets overlay from aesthetic defaults, honour those values exactly.
  if (explicit && (explicit.vignetteOpacity !== undefined || explicit.grainOpacity !== undefined)) {
    return {
      vignette: Math.max(0, Math.min(1, explicit.vignetteOpacity ?? 0)),
      grain: Math.max(0, Math.min(1, explicit.grainOpacity ?? 0)),
    }
  }

  const premium = motionQuality === 'premium'
  const mood = scene.mood ?? 'neutral'

  let vignette = explicit?.vignetteOpacity
  let grain = explicit?.grainOpacity

  if (vignette === undefined) {
    if (mood === 'editorial') vignette = premium ? 0.52 : 0.38
    else if (mood === 'cinematic') vignette = premium ? 0.65 : 0.5
    else vignette = premium ? 0.32 : 0
  }
  if (grain === undefined) {
    if (mood === 'cinematic') grain = premium ? 0.13 : 0.075
    else if (mood === 'editorial') grain = premium ? 0.068 : 0.04
    else grain = premium ? 0.036 : 0
  }

  vignette = Math.max(0, Math.min(1, vignette ?? 0))
  grain = Math.max(0, Math.min(1, grain ?? 0))
  return { vignette, grain }
}

function premiumGrainStep(width: number, height: number, strength: number): number {
  const w = Math.max(width, 720)
  const h = Math.max(height, 720)
  if (h > 1700 || w > 1900) return strength > 0.05 ? 5 : 6
  if (strength > 0.08 && w >= 1080) return 3
  return 4
}

function drawVignetteOverlay(ctx: Ctx, width: number, height: number, opacity: number): void {
  if (opacity <= 0.001) return
  const cx = width / 2
  const cy = height / 2
  const inner = Math.min(width, height) * 0.38
  const outer = Math.hypot(width, height) * 0.52
  const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${opacity})`)
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

/** Film grain — works in browser and Node (no CSS filter required). */
type Noise2D = (x: number, y: number) => number

// Deterministic hash-based fallback used only before `simplex-noise` is lazy-loaded.
const fallbackNoise: Noise2D = (x, y) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

let _grainNoise: Noise2D | null = null

function grainNoise(): Noise2D {
  const sx = getSimplex()
  if (!sx) {
    void preloadHeavyDeps()
    return fallbackNoise
  }
  if (!_grainNoise) _grainNoise = sx.createNoise2D()
  return _grainNoise
}

function drawGrainOverlay(ctx: Ctx, width: number, height: number, strength: number, frame: number): void {
  if (strength <= 0.001) return
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  const step = premiumGrainStep(width, height, strength)
  const base = strength * 0.14
  const noise = grainNoise()
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const n = noise(x * 0.045 + frame * 0.11, y * 0.045 + frame * 0.07)
      if (n < -0.15) continue
      const extra = (n + 0.15) * 0.12
      ctx.globalAlpha = Math.min(0.42, base + extra)
      ctx.fillStyle = n > 0 ? '#ffffff' : '#000000'
      ctx.fillRect(x, y, 1.5, 1.5)
    }
  }
  ctx.restore()
}
// ─── Position resolver ────────────────────────────────────────────────────────

function resolvePosition(
  pos: VeloxPosition | undefined,
  width: number,
  height: number,
  originX: number = 0,
  originY: number = 0
): { x: number; y: number } {
  if (!pos) return { x: originX + width / 2, y: originY + height / 2 }

  switch (pos.type) {
    case 'absolute': return { x: originX + pos.x, y: originY + pos.y }
    case 'center':   return { x: originX + width / 2 + (pos.offsetX ?? 0), y: originY + height / 2 + (pos.offsetY ?? 0) }
    case 'named': {
      const ox = pos.offsetX ?? 0, oy = pos.offsetY ?? 0
      switch (pos.name) {
        case 'topLeft':      return { x: originX + 54 + ox, y: originY + 54 + oy }
        case 'topRight':     return { x: originX + width - 54 + ox, y: originY + 54 + oy }
        case 'bottomLeft':   return { x: originX + 54 + ox, y: originY + height - 54 + oy }
        case 'bottomRight':  return { x: originX + width - 54 + ox, y: originY + height - 54 + oy }
        case 'topCenter':    return { x: originX + width / 2 + ox, y: originY + 54 + oy }
        case 'bottomCenter': return { x: originX + width / 2 + ox, y: originY + height - 54 + oy }
        case 'leftCenter':   return { x: originX + 54 + ox, y: originY + height / 2 + oy }
        case 'rightCenter':  return { x: originX + width - 54 + ox, y: originY + height / 2 + oy }
        default:             return { x: originX + width / 2 + ox, y: originY + height / 2 + oy }
      }
    }
  }
}

// ─── Image draw ───────────────────────────────────────────────────────────────

/** In-place brightness (multiply) + saturation (lerp toward luma) on RGBA data. */
function applyBrightnessSaturation(data: Uint8ClampedArray, brightness: number, saturate: number): void {
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

function drawImage(
  ctx: Ctx,
  el: ImageElementConfig,
  drawX: number,
  drawY: number,
  state: AnimationState,
  canvasWidth: number,
  canvasHeight: number,
  localFrame: number,
  fps: number,
  sceneTotalFrames?: number
): void {
  const img = _imageCache.get(el.src)
  const boxW = el.width ?? 780
  const boxH = el.height ?? 440
  if (el.src.startsWith('stock://')) {
    drawStockPlaceholder(ctx, el.src, drawX, drawY, boxW, boxH, state.opacity, el.borderRadius ?? 0)
    return
  }
  const isVeloxUnresolved =
    el.src.startsWith('velox-stock:') ||
    el.src.startsWith('velox-card:') ||
    el.src.startsWith('velox-web:')
  if (!img && isVeloxUnresolved) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, state.opacity))
    const [from, to] = ['#334155', '#0f172a']
    const g = ctx.createLinearGradient(drawX - 200, drawY - 200, drawX + 200, drawY + 200)
    g.addColorStop(0, from)
    g.addColorStop(1, to)
    ctx.fillStyle = g
    ctx.fillRect(drawX - boxW / 2, drawY - boxH / 2, boxW, boxH)
    ctx.restore()
    return
  }
  if (!img) {
    // Browser: kick off a lazy load so next frame will have it
    if (typeof window !== 'undefined' && !_loadingImageSrcs.has(el.src)) {
      _loadingImageSrcs.add(el.src)
      const htmlImg = new Image()
      htmlImg.crossOrigin = 'anonymous'
      htmlImg.onload = () => {
        _imageCache.set(el.src, htmlImg)
        _loadingImageSrcs.delete(el.src)
      }
      htmlImg.onerror = () => {
        _loadingImageSrcs.delete(el.src)
      }
      htmlImg.src = el.src
    }
    return
  }

  const { objectFit = 'contain', blur, brightness, saturate, borderRadius = 0, kenBurns } = el

  const natW: number = img.width ?? img.naturalWidth ?? canvasWidth
  const natH: number = img.height ?? img.naturalHeight ?? canvasHeight

  // Determine draw dimensions
  let dw: number, dh: number, dx: number, dy: number

  if (objectFit === 'cover' && !el.width && !el.height) {
    // Fill entire canvas
    const scale = Math.max(canvasWidth / natW, canvasHeight / natH)
    dw = natW * scale
    dh = natH * scale
    dx = (canvasWidth - dw) / 2
    dy = (canvasHeight - dh) / 2
  } else if (el.width || el.height) {
    dw = el.width ?? natW
    dh = el.height ?? natH
    dx = drawX - dw / 2
    dy = drawY - dh / 2
  } else {
    // contain — fit within canvas
    const scale = Math.min(canvasWidth / natW, canvasHeight / natH)
    dw = natW * scale
    dh = natH * scale
    dx = (canvasWidth - dw) / 2
    dy = (canvasHeight - dh) / 2
  }

  // Ken Burns: slow pan + zoom
  if (kenBurns) {
    const opts = typeof kenBurns === 'object' ? kenBurns : {}
    const direction = opts.direction ?? 'in'
    const intensity = opts.intensity ?? 0.06
    const totalSceneFrames = sceneTotalFrames ?? 5 * fps
    const t = Math.min(localFrame / totalSceneFrames, 1)
    const zoom = direction === 'in' ? 1 + t * intensity : 1 + (1 - t) * intensity
    const panX = direction === 'in' ? 0 : t * dw * 0.04
    dw *= zoom
    dh *= zoom
    dx -= (dw / zoom) * (zoom - 1) / 2 - panX
    dy -= (dh / zoom) * (zoom - 1) / 2
  }

  const drawInto = (c: Ctx) => {
    c.save()
    c.globalAlpha = Math.max(0, Math.min(1, state.opacity))

    // Animation transform (for entrance animations)
    c.translate(state.x, state.y)
    if (state.scaleX !== 1 || state.scaleY !== 1) {
      c.translate(dx + dw / 2, dy + dh / 2)
      c.scale(state.scaleX, state.scaleY)
      c.translate(-(dx + dw / 2), -(dy + dh / 2))
    }

    // Border radius clip and Mask Reveal
    const clipRevealY = state.clipRevealY
    if (borderRadius > 0 || state.clipReveal < 1 || clipRevealY !== undefined) {
      c.beginPath()
      const r = borderRadius || 0
      if (clipRevealY !== undefined && clipRevealY < 1) {
        const cy = clipRevealY
        c.rect(dx, dy + dh * (1 - cy), dw, dh * cy)
      } else {
        c.moveTo(dx + r, dy)
        c.arcTo(dx + dw, dy, dx + dw, dy + dh, r)
        c.arcTo(dx + dw, dy + dh, dx, dy + dh, r)
        c.arcTo(dx, dy + dh, dx, dy, r)
        c.arcTo(dx, dy, dx + dw, dy, r)
      }
      c.closePath()
      c.clip()
    }

    c.drawImage(img as unknown as CanvasImageSource, dx, dy, dw, dh)
    c.restore()
  }

  const hasFilters = blur !== undefined || brightness !== undefined || saturate !== undefined || state.blur > 0
  const regionCx = dx + dw / 2
  const regionCy = dy + dh / 2

  if (!supportsCanvasFilter && (state.blur > 0 || brightness !== undefined || saturate !== undefined)) {
    const post = (imgData: ImageData) => {
      if (brightness !== undefined || saturate !== undefined) {
        applyBrightnessSaturation(imgData.data, brightness ?? 1, saturate ?? 1)
      }
    }
    applyElementBlur(ctx, regionCx, regionCy, dw / 2, dh / 2, state.blur, drawInto, post)
  } else {
    if (supportsCanvasFilter && hasFilters) {
      ctx.save()
      const filters: string[] = []
      if (blur) filters.push(`blur(${blur}px)`)
      if (brightness !== undefined) filters.push(`brightness(${brightness})`)
      if (saturate !== undefined) filters.push(`saturate(${saturate})`)
      if (state.blur > 0) filters.push(`blur(${state.blur}px)`)
      ctx.filter = filters.length ? filters.join(' ') : 'none'
    }
    drawInto(ctx)
    if (supportsCanvasFilter && hasFilters) ctx.restore()
  }
}

function usablePaint(value: string | undefined): string | undefined {
  if (!value) return undefined
  const v = value.trim().toLowerCase()
  if (v === 'none' || v === 'transparent' || v === 'currentcolor') return undefined
  return value
}

function drawPaths(ctx: Ctx, el: RuntimeLogoElement, x: number, y: number, state: AnimationState, width: number, height: number, frame: number, fps: number) {
  const data = el._paths
  if (!data) return
  
  const viewParts = (data.viewBox || '0 0 256 256').split(' ').map(Number)
  const viewX = viewParts[0] || 0
  const viewY = viewParts[1] || 0
  const viewW = viewParts[2] || 256
  const viewH = viewParts[3] || 256
  
  ctx.save()
  // x and y are already the resolved center point of the element
  ctx.translate(x, y)
  
  // Scale the SVG to fit the requested width/height
  const scaleX = width / viewW
  const scaleY = height / viewH
  const scale = Math.min(scaleX, scaleY)
  
  // Animation transform (for entrance animations like tactileIn, scale, etc.)
  if (state.scaleX !== 1 || state.scaleY !== 1) {
    ctx.scale(state.scaleX, state.scaleY)
  }
  if (state.rotation !== 0) {
    ctx.rotate((state.rotation * Math.PI) / 180)
  }
  // state.x and state.y from animation state
  ctx.translate(state.x, state.y)
  
  ctx.scale(scale, scale)
  ctx.translate(-viewW/2 - viewX, -viewH/2 - viewY) // center the viewbox

  const p = state.p ?? 1 // 0 to 1 entrance progress
  
  for (let i = 0; i < data.paths.length; i++) {
    const path = data.paths[i]
    if (!path.d) continue
    const p2d = new Path2D(path.d)
    const fill = usablePaint(path.fill) ?? usablePaint(path.stroke) ?? (el.theme === 'dark' ? '#ffffff' : '#111111')
    
    // Stagger paths slightly based on index
    const delay = (i / data.paths.length) * 0.5
    // clamp progress 
    const rawProgress = (p - delay) / (1 - 0.5)
    const pathProgress = Math.min(Math.max(rawProgress, 0), 1)

    if (state.animationPhase === 'entrance' && p < 1) {
       ctx.strokeStyle = fill
       ctx.lineWidth = 3 / scale // thin line independent of scale
       if (path.length) {
         ctx.setLineDash([path.length])
         ctx.lineDashOffset = path.length * (1 - pathProgress)
       }
       ctx.stroke(p2d)
       
       // Fade in fill at the very end of the stroke
       if (pathProgress > 0.8) {
          ctx.fillStyle = fill
          const fillP = (pathProgress - 0.8) / 0.2
          ctx.globalAlpha = fillP * (el.opacity ?? 1)
          ctx.fill(p2d)
          ctx.globalAlpha = el.opacity ?? 1
       }
    } else {
       ctx.fillStyle = fill
       ctx.fill(p2d)
       const stroke = usablePaint(path.stroke)
       if (stroke) {
         ctx.strokeStyle = stroke
         ctx.stroke(p2d)
       }
    }
  }
  
  ctx.restore()
}

// ─── Draw a single element ───────────────────────────────────────────────────

function drawElement(
  ctx: Ctx,
  el: ElementConfig,
  localFrame: number,
  fps: number,
  width: number,
  height: number,
  originX: number = 0,
  originY: number = 0,
  sceneTotalFrames?: number,
  scene?: SceneConfig,
  inheritedDepth: number = 0
): void {
  const state = getAnimationState(el, localFrame, fps)
  if (state.opacity <= 0) return

  const effectiveDepth = el.depth ?? inheritedDepth
  const off = scene ? parallaxOffsetFor(scene, localFrame, fps, effectiveDepth) : null

  const { x, y } = resolvePosition(el.position, width, height, originX, originY)

  ctx.save()
  if (off) ctx.translate(off.dx, off.dy)

  switch (el.type) {
    case 'text':
      drawText(ctx, el, x, y, state, width, height, localFrame, fps)
      break
    case 'textList':
      drawTextList(ctx, el, x, y, localFrame, fps, width, height)
      break
    case 'shape':
      drawShape(ctx, el, x, y, state, localFrame)
      break
    case 'image':
      drawImage(ctx, el as ImageElementConfig, x, y, state, width, height, localFrame, fps, sceneTotalFrames)
      break
    case 'logo': {
      const logoEl = el as RuntimeLogoElement
      if (logoEl._paths) {
        const lw = logoEl.width ?? 256
        const lh = logoEl.height ?? lw
        drawPaths(ctx, logoEl, x, y, state, lw, lh, localFrame, fps)
      }
      break
    }
    case 'group':
      for (const child of el.children) {
        drawElement(ctx, child, localFrame, fps, width, height, x, y, sceneTotalFrames, scene, effectiveDepth)
      }
      break
  }

  ctx.restore()
}

// ─── Scene Draw ───────────────────────────────────────────────────────────────

function drawScene(
  ctx: Ctx,
  scene: SceneConfig,
  localFrame: number,
  fps: number,
  width: number,
  height: number,
  motionQuality: MotionQuality | undefined,
  absoluteFrame: number,
  alpha: number = 1,
  suppressOverlays = false
): void {
  ctx.save()
  ctx.globalAlpha = alpha

  ctx.save()
  applySceneCamera(ctx, scene, localFrame, fps, width, height)
  drawBackground(ctx, scene.background, width, height, false)

  const sceneFrames = Math.round(scene.duration * fps)
  for (const el of scene.elements) {
    ctx.save()
    drawElement(ctx, el, localFrame, fps, width, height, 0, 0, sceneFrames, scene, 0)
    ctx.restore()
  }
  ctx.restore()

  // When the global all-WebGL FX pipeline is active, the post-FX pass handles
  // vignette/grain (and more) for the whole frame, so skip the per-scene overlay.
  if (!suppressOverlays && !globalFxActive) {
    const ov = resolveSceneOverlay(scene, motionQuality)
    drawVignetteOverlay(ctx, width, height, ov.vignette)
    drawGrainOverlay(ctx, width, height, ov.grain, absoluteFrame)
  }

  // Scene-level imported caption track (SRT/ASS), above overlays for readability.
  if (scene.captions?.cues?.length) {
    drawCaptionTrack(ctx, scene.captions, localFrame, fps, width, height)
  }

  ctx.restore()
}



// ─── MASTER DRAW FRAME ────────────────────────────────────────────────────────

/**
 * Draws a single frame onto the provided canvas context.
 * This is the only function you need to call from the renderer and preview.
 */
function drawFrameInternal(
  ctx: Ctx,
  config: VeloxVideoConfig,
  frame: number,
  width: number,
  height: number,
  opts?: { cpuFx?: boolean }
): void {
  // Clear
  ctx.clearRect(0, 0, width, height)

  globalFxActive = fxEnabled(config)

  // Global background
  drawBackground(ctx, config.background, width, height, true)

  // Build the scene timeline
  const timeline = buildSceneTimeline(config)

  for (let i = 0; i < timeline.length; i++) {
    const { scene, startFrame, endFrame } = timeline[i]
    const sceneFrames = Math.round(scene.duration * config.fps)
    const transFrames = scene.transition ? Math.round(scene.transition.duration * config.fps) : 0

    const isActive = frame >= startFrame && frame < endFrame
    const nextScene = timeline[i + 1]
    const isTransitioning = nextScene && frame >= (endFrame - transFrames) && frame < endFrame

    if (!isActive && !isTransitioning) continue

    const localFrame = frame - startFrame

    if (isTransitioning && nextScene && scene.transition) {
      // Transition INTO nextScene
      const transStart = endFrame - transFrames
      const tpRaw = (frame - transStart) / transFrames
      const tp = Math.min(Math.max(tpRaw, 0), 1)
      const mq = config.motionQuality

      if (scene.transition.type === 'crossDissolve') {
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1 - tp)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, tp)
      } else if (scene.transition.type === 'blurDissolve') {
        const blurOut = Math.sin((1 - tp) * (Math.PI / 2)) * 13
        const blurIn = Math.sin(tp * (Math.PI / 2)) * 13
        if (supportsCanvasFilter) {
          ctx.save()
          setCanvasFilter(ctx, blurOut > 0.35 ? `blur(${blurOut}px)` : 'none')
          drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1 - tp)
          ctx.restore()
          ctx.save()
          setCanvasFilter(ctx, blurIn > 0.35 ? `blur(${blurIn}px)` : 'none')
          drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, tp)
          ctx.restore()
        } else {
          drawLayerWithBlur(ctx, width, height, 1 - tp, blurOut, (layerCtx) => {
            drawScene(layerCtx, scene, localFrame, config.fps, width, height, mq, frame, 1)
          })
          drawLayerWithBlur(ctx, width, height, tp, blurIn, (layerCtx) => {
            drawScene(layerCtx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, 1)
          })
        }
      } else if (scene.transition.type === 'zoom') {
        const e = easeOut(tp)
        ctx.save()
        ctx.globalAlpha = 1 - tp
        ctx.translate(width / 2, height / 2)
        ctx.scale(lerp(1, 1.25, e), lerp(1, 1.25, e))
        ctx.translate(-width / 2, -height / 2)
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1)
        ctx.restore()
        ctx.save()
        ctx.globalAlpha = tp
        ctx.translate(width / 2, height / 2)
        ctx.scale(lerp(0.75, 1, e), lerp(0.75, 1, e))
        ctx.translate(-width / 2, -height / 2)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, 1)
        ctx.restore()
      } else if (scene.transition.type === 'wipe') {
        const dir = scene.transition.options?.direction ?? 'left'
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1)
        ctx.save()
        ctx.beginPath()
        if (dir === 'left') ctx.rect(0, 0, width * tp, height)
        else if (dir === 'right') ctx.rect(width * (1 - tp), 0, width * tp, height)
        else if (dir === 'up') ctx.rect(0, 0, width, height * tp)
        else ctx.rect(0, height * (1 - tp), width, height * tp)
        ctx.clip()
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, 1)
        ctx.restore()
      } else if (scene.transition.type === 'glitch') {
        const intensity = scene.transition.options?.intensity ?? 1
        const jitter = Math.sin(frame * 17.3) * (1 - tp) * 18 * intensity
        ctx.save()
        ctx.translate(jitter, Math.cos(frame * 11.7) * (1 - tp) * 6 * intensity)
        ctx.globalAlpha = 1 - tp
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1)
        ctx.restore()
        ctx.save()
        ctx.translate(-jitter * 0.6, 0)
        ctx.globalAlpha = tp
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, 1)
        ctx.restore()
      } else if (scene.transition.type === 'flash') {
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1 - tp)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, tp)
        if (tp > 0.35 && tp < 0.65) {
          const flashP = Math.sin(((tp - 0.35) / 0.3) * Math.PI)
          ctx.save()
          ctx.fillStyle = scene.transition.options?.color ?? '#ffffff'
          ctx.globalAlpha = flashP * 0.88
          ctx.fillRect(0, 0, width, height)
          ctx.restore()
        }
      } else if (scene.transition.type === 'zoomSmooth') {
        const e = easeOut(tp)
        ctx.save()
        ctx.globalAlpha = 1 - tp
        ctx.translate(width / 2, height / 2)
        ctx.scale(lerp(1, 0.9, e), lerp(1, 0.9, e))
        ctx.translate(-width / 2, -height / 2)
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1)
        ctx.restore()
        ctx.save()
        ctx.globalAlpha = tp
        ctx.translate(width / 2, height / 2)
        ctx.scale(lerp(0.92, 1, e), lerp(0.92, 1, e))
        ctx.translate(-width / 2, -height / 2)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, 1)
        ctx.restore()
      } else if (scene.transition.type === 'slide') {
        const dir = scene.transition.options?.direction ?? 'left'
        const ox = dir === 'left' ? -width * tp : width * tp
        ctx.save(); ctx.translate(ox, 0)
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1)
        ctx.restore()
        ctx.save(); ctx.translate(ox + (dir === 'left' ? width : -width), 0)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, 1)
        ctx.restore()
      } else if (scene.transition.type === 'paperFold') {
        // Accordion 2D fold: the outgoing scene stays put while the incoming scene
        // unfolds panel-by-panel (staggered), each pivoting around alternating edges
        // with a crease shadow to fake fold depth.
        const folds = Math.max(2, Math.round(scene.transition.options?.folds ?? 5))
        const dir = scene.transition.options?.direction ?? 'left'
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1)
        const panelW = width / folds
        for (let k = 0; k < folds; k++) {
          const sp = Math.min(Math.max(tp * (folds + 1) - k, 0), 1)
          if (sp <= 0) continue
          const e = easeOut(sp)
          const px = dir === 'right' ? width - (k + 1) * panelW : k * panelW
          const pivotLeft = dir === 'right' ? k % 2 === 1 : k % 2 === 0
          ctx.save()
          ctx.beginPath()
          ctx.rect(px, 0, panelW, height)
          ctx.clip()
          const sx = lerp(0.02, 1, e)
          if (pivotLeft) {
            ctx.translate(px, 0)
            ctx.scale(sx, 1)
            ctx.translate(-px, 0)
          } else {
            ctx.translate(px + panelW, 0)
            ctx.scale(sx, 1)
            ctx.translate(-(px + panelW), 0)
          }
          drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, 1)
          ctx.restore()
          // Crease shadow along the leading fold edge.
          ctx.save()
          ctx.beginPath()
          ctx.rect(px, 0, panelW, height)
          ctx.clip()
          const shadowW = Math.min(panelW, 48)
          const g = ctx.createLinearGradient(
            pivotLeft ? px : px + panelW - shadowW, 0,
            pivotLeft ? px + shadowW : px + panelW, 0,
          )
          g.addColorStop(0, `rgba(0,0,0,${0.22 * (1 - e)})`)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(px, 0, panelW, height)
          ctx.restore()
        }
      } else {
        // Fallback: crossDissolve
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1 - tp)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, tp)
      }
    } else if (isActive) {
      drawScene(ctx, scene, localFrame, config.fps, width, height, config.motionQuality, frame)
    }
  }

  // All-WebGL post-FX pass: in the browser the Studio routes the composited
  // frame through `WebGLComposer` instead; in Node export we apply the CPU
  // fallback so the deterministic render still gets the cinematic look.
  if (globalFxActive && opts?.cpuFx !== false) {
    applyFxCpu(ctx, width, height, getFx(config), frame / config.fps)
  }
}

export function drawFrame(
  ctx: Ctx,
  config: VeloxVideoConfig,
  frame: number,
  width: number,
  height: number,
  opts?: { cpuFx?: boolean },
): void {
  try {
    drawFrameInternal(ctx, config, frame, width, height, opts)
  } finally {
    globalFxActive = false
  }
}
