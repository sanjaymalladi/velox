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
import { drawText, drawTextList } from './drawText'
import { drawShape } from './drawShape'
import { lerp, easeOut } from './easing'

type Ctx = CanvasRenderingContext2D
type CachedImage = { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
type NodeCanvasLoader = { loadImage: (input: string | Uint8Array) => Promise<CachedImage> }
type LogoPathEntry = { d: string; fill?: string; stroke?: string; length?: number }
type LogoPathData = { viewBox?: string; paths: LogoPathEntry[] }
type RuntimeLogoElement = LogoElementConfig & { _paths?: LogoPathData; _resolvedSrc?: string }

// ─── Image Cache ──────────────────────────────────────────────────────────────

/**
 * Shared image cache. Keys are src strings; values are loaded image objects.
 * In the browser this is HTMLImageElement; in Node it's whatever @napi-rs/canvas
 * returns from loadImage (duck-typed as any).
 */
const _imageCache = new Map<string, CachedImage>()
const _loadingImageSrcs = new Set<string>()

/**
 * Inject a pre-populated image cache (useful in the Node CLI renderer where
 * images must be loaded asynchronously before the sync render loop starts).
 * Call `await preloadImages(config)` to build the map, then pass it here.
 */
export function setImageCache(cache: Map<string, CachedImage>): void {
  cache.forEach((v, k) => _imageCache.set(k, v))
}

/**
 * Async helper: walks a VeloxVideoConfig, finds every image src, and loads
 * them into a Map that can be injected via setImageCache().
 * Works in both browser (new Image()) and Node (@napi-rs/canvas loadImage).
 */
export async function preloadImages(config: VeloxVideoConfig): Promise<Map<string, CachedImage>> {
  const srcs = new Set<string>()
  const logoFetchQueue: { el: LogoElementConfig; promise: Promise<void> }[] = []

  for (const scene of config.scenes) {
    for (const el of scene.elements) {
      if (el.type === 'image') srcs.add((el as ImageElementConfig).src)
      if (el.type === 'logo') {
        const logoEl = el as LogoElementConfig
        const p = (async () => {
          const name = logoEl.logo.toLowerCase().replace(/\s+/g, '')
          const themeStr = logoEl.theme === 'dark' ? '_dark' : '_light'
          let data
          try {
            // Load bundled SVGL path data. Rendering must not depend on the public SVGL API.
            data = await import('@velox-video/svgl/dist/logos/' + name + themeStr + '.json')
          } catch {
            try {
              data = await import('@velox-video/svgl/dist/logos/' + name + '.json')
            } catch {
              console.error('Failed to load bundled SVGL paths for', name)
              return
            }
          }
          ;(logoEl as RuntimeLogoElement)._paths = (data.default || data) as LogoPathData
        })()
        logoFetchQueue.push({ el: logoEl, promise: p })
      }
    }
  }

  // Wait for all logo registry lookups to finish so we have all src URLs
  await Promise.all(logoFetchQueue.map(q => q.promise))

  const cache = new Map<string, CachedImage>()
  await Promise.all(
    Array.from(srcs).map(async (src) => {
      try {
        if (typeof window !== 'undefined') {
          // Browser
          await new Promise<void>((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => { cache.set(src, img); resolve() }
            img.onerror = reject
            img.src = src
          })
        } else {
          const { loadImage } = (await import('@napi-rs/canvas')) as NodeCanvasLoader
          if (src.endsWith('.svg')) {
            const res = await fetch(src)
            let svgText = await res.text()
            // Some SVGs (like Github SVGL) lack width/height which breaks @napi-rs/canvas. Inject them.
            if (!svgText.match(/<svg[^>]*\s+width=/)) {
               svgText = svgText.replace('<svg ', '<svg width="256" height="256" ')
            }
            const img = await loadImage(new TextEncoder().encode(svgText))
            cache.set(src, img)
          } else {
            const img = await loadImage(src)
            cache.set(src, img)
          }
        }
      } catch (e) {
        console.warn(`[velox] Could not preload image: ${src}`, e)
      }
    })
  )
  return cache
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
    default:         return [1920, 1080]
  }
}

// ─── Total Duration ───────────────────────────────────────────────────────────

export function getTotalFrames(config: VeloxVideoConfig): number {
  return config.scenes.reduce((acc, scene) => {
    const frames = Math.round(scene.duration * config.fps)
    const transFrames = scene.transition ? Math.round(scene.transition.duration * config.fps) : 0
    return acc + frames - transFrames
  }, 0)
}

// ─── Scene activation ────────────────────────────────────────────────────────

interface ActiveScene {
  scene: SceneConfig
  startFrame: number
  endFrame: number
}

export function buildSceneTimeline(config: VeloxVideoConfig): ActiveScene[] {
  const timeline: ActiveScene[] = []
  let cursor = 0
  for (const scene of config.scenes) {
    const frames = Math.round(scene.duration * config.fps)
    const transFrames = scene.transition ? Math.round(scene.transition.duration * config.fps) : 0
    timeline.push({ scene, startFrame: cursor, endFrame: cursor + frames })
    cursor += frames - transFrames
  }
  return timeline
}

// ─── Background ───────────────────────────────────────────────────────────────

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
    const angle = (parseFloat(g.angle) * Math.PI) / 180
    const len = Math.sqrt(width * width + height * height)
    const grad = ctx.createLinearGradient(
      width / 2 - Math.cos(angle) * len / 2,
      height / 2 - Math.sin(angle) * len / 2,
      width / 2 + Math.cos(angle) * len / 2,
      height / 2 + Math.sin(angle) * len / 2
    )
    g.stops.forEach((stop, i) => { grad.addColorStop(i / (g.stops.length - 1), stop) })
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
      const s = 1 + 0.042 * t
      ctx.scale(s, s)
      break
    }
    case 'parallaxDrift': {
      const driftX = Math.sin(rawT * Math.PI * 2 * 0.42) * 14 * t
      const driftY = Math.cos(rawT * Math.PI * 2 * 0.31) * 10 * t
      ctx.translate(driftX, driftY)
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

function resolveSceneOverlay(scene: SceneConfig, motionQuality: MotionQuality | undefined): { vignette: number; grain: number } {
  const explicit = scene.overlay ?? {}
  const premium = motionQuality === 'premium'
  const mood = scene.mood ?? 'neutral'

  let vignette = explicit.vignetteOpacity
  let grain = explicit.grainOpacity

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

/** Cheap deterministic grain */
function drawGrainOverlay(ctx: Ctx, width: number, height: number, strength: number, frame: number): void {
  if (strength <= 0.001) return
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  const step = premiumGrainStep(width, height, strength)
  const base = strength * 0.14
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const h = (x * 73856093) ^ (y * 19349663) ^ (frame * 83492791)
      if (((h >>> 0) & 15) > 9) continue
      const extra = ((h >>> 5) % 80) / 5000
      ctx.globalAlpha = Math.min(0.42, base + extra)
      ctx.fillStyle = (h & 1) === 0 ? '#ffffff' : '#000000'
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
        case 'topLeft':      return { x: originX + 80 + ox, y: originY + 80 + oy }
        case 'topRight':     return { x: originX + width - 80 + ox, y: originY + 80 + oy }
        case 'bottomLeft':   return { x: originX + 80 + ox, y: originY + height - 80 + oy }
        case 'bottomRight':  return { x: originX + width - 80 + ox, y: originY + height - 80 + oy }
        case 'topCenter':    return { x: originX + width / 2 + ox, y: originY + 80 + oy }
        case 'bottomCenter': return { x: originX + width / 2 + ox, y: originY + height - 80 + oy }
        case 'leftCenter':   return { x: originX + 80 + ox, y: originY + height / 2 + oy }
        case 'rightCenter':  return { x: originX + width - 80 + ox, y: originY + height / 2 + oy }
        default:             return { x: originX + width / 2 + ox, y: originY + height / 2 + oy }
      }
    }
  }
}

// ─── Image draw ───────────────────────────────────────────────────────────────

function drawImage(
  ctx: Ctx,
  el: ImageElementConfig,
  drawX: number,
  drawY: number,
  state: AnimationState,
  canvasWidth: number,
  canvasHeight: number,
  localFrame: number,
  fps: number
): void {
  const img = _imageCache.get(el.src)
  if (el.src.startsWith('stock://')) {
    const [from, to] = el.src.includes('code') || el.src.includes('developer')
      ? ['#111827', '#2563eb']
      : ['#1f2937', '#7c3aed']
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, state.opacity))
    const g = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight)
    g.addColorStop(0, from)
    g.addColorStop(1, to)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
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
    // Use scene progress from localFrame — rough estimate using fps (assume 5s scene)
    const totalSceneFrames = 5 * fps
    const t = Math.min(localFrame / totalSceneFrames, 1)
    const zoom = direction === 'in' ? 1 + t * intensity : 1 + (1 - t) * intensity
    const panX = direction === 'in' ? 0 : t * dw * 0.04
    dw *= zoom
    dh *= zoom
    dx -= (dw / zoom) * (zoom - 1) / 2 - panX
    dy -= (dh / zoom) * (zoom - 1) / 2
  }

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, state.opacity))

  // Apply CSS-style filters
  const filters: string[] = []
  if (blur) filters.push(`blur(${blur}px)`)
  if (brightness !== undefined) filters.push(`brightness(${brightness})`)
  if (saturate !== undefined) filters.push(`saturate(${saturate})`)
  if (state.blur > 0) filters.push(`blur(${state.blur}px)`)
  ctx.filter = filters.length ? filters.join(' ') : 'none'

  // Animation transform (for entrance animations)
  ctx.translate(state.x, state.y)
  if (state.scaleX !== 1 || state.scaleY !== 1) {
    ctx.translate(dx + dw / 2, dy + dh / 2)
    ctx.scale(state.scaleX, state.scaleY)
    ctx.translate(-(dx + dw / 2), -(dy + dh / 2))
  }

  // Border radius clip and Mask Reveal
  const clipRevealY = (state as AnimationState & { clipRevealY?: number }).clipRevealY
  if (borderRadius > 0 || state.clipReveal < 1 || clipRevealY !== undefined) {
    ctx.beginPath()
    const r = borderRadius || 0
    if (clipRevealY !== undefined && clipRevealY < 1) {
       const cy = clipRevealY
       ctx.rect(dx, dy + dh * (1 - cy), dw, dh * cy)
    } else {
      ctx.moveTo(dx + r, dy)
      ctx.arcTo(dx + dw, dy, dx + dw, dy + dh, r)
      ctx.arcTo(dx + dw, dy + dh, dx, dy + dh, r)
      ctx.arcTo(dx, dy + dh, dx, dy, r)
      ctx.arcTo(dx, dy, dx + dw, dy, r)
    }
    ctx.closePath()
    ctx.clip()
  }

  ctx.drawImage(img as unknown as CanvasImageSource, dx, dy, dw, dh)
  ctx.restore()
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
    
    // Stagger paths slightly based on index
    const delay = (i / data.paths.length) * 0.5
    // clamp progress 
    const rawProgress = (p - delay) / (1 - 0.5)
    const pathProgress = Math.min(Math.max(rawProgress, 0), 1)

    if (state.animationPhase === 'entrance' && p < 1) {
       ctx.strokeStyle = path.fill || path.stroke || '#ffffff'
       ctx.lineWidth = 3 / scale // thin line independent of scale
       if (path.length) {
         ctx.setLineDash([path.length])
         ctx.lineDashOffset = path.length * (1 - pathProgress)
       }
       ctx.stroke(p2d)
       
       // Fade in fill at the very end of the stroke
       if (pathProgress > 0.8) {
          ctx.fillStyle = path.fill || path.stroke || '#ffffff'
          const fillP = (pathProgress - 0.8) / 0.2
          ctx.globalAlpha = fillP * (el.opacity ?? 1)
          ctx.fill(p2d)
          ctx.globalAlpha = el.opacity ?? 1
       }
    } else {
       // Loop or Exit phase: just draw the filled path
       if (path.fill) {
         ctx.fillStyle = path.fill
         ctx.fill(p2d)
       }
       if (path.stroke) {
         ctx.strokeStyle = path.stroke
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
  originY: number = 0
): void {
  const state = getAnimationState(el, localFrame, fps)
  if (state.opacity <= 0) return

  const { x, y } = resolvePosition(el.position, width, height, originX, originY)

  switch (el.type) {
    case 'text':
      drawText(ctx, el, x, y, state, width, height)
      break
    case 'textList':
      drawTextList(ctx, el, x, y, localFrame, fps, width, height)
      break
    case 'shape':
      drawShape(ctx, el, x, y, state, localFrame)
      break
    case 'image':
      drawImage(ctx, el as ImageElementConfig, x, y, state, width, height, localFrame, fps)
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
        drawElement(ctx, child, localFrame, fps, width, height, x, y)
      }
      break
  }
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
  alpha: number = 1
): void {
  ctx.save()
  ctx.globalAlpha = alpha

  ctx.save()
  applySceneCamera(ctx, scene, localFrame, fps, width, height)
  drawBackground(ctx, scene.background, width, height, false)

  for (const el of scene.elements) {
    drawElement(ctx, el, localFrame, fps, width, height)
  }
  ctx.restore()

  const ov = resolveSceneOverlay(scene, motionQuality)
  drawVignetteOverlay(ctx, width, height, ov.vignette)
  drawGrainOverlay(ctx, width, height, ov.grain, absoluteFrame)

  ctx.restore()
}



// ─── MASTER DRAW FRAME ────────────────────────────────────────────────────────

/**
 * Draws a single frame onto the provided canvas context.
 * This is the only function you need to call from the renderer and preview.
 */
export function drawFrame(
  ctx: Ctx,
  config: VeloxVideoConfig,
  frame: number,
  width: number,
  height: number
): void {
  // Clear
  ctx.clearRect(0, 0, width, height)

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
        ctx.save()
        ctx.filter = blurOut > 0.35 ? `blur(${blurOut}px)` : 'none'
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1 - tp)
        ctx.restore()
        ctx.save()
        ctx.filter = blurIn > 0.35 ? `blur(${blurIn}px)` : 'none'
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, tp)
        ctx.restore()
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
      } else {
        // Fallback: crossDissolve
        drawScene(ctx, scene, localFrame, config.fps, width, height, mq, frame, 1 - tp)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, mq, frame, tp)
      }
    } else if (isActive) {
      drawScene(ctx, scene, localFrame, config.fps, width, height, config.motionQuality, frame)
    }
  }
}
