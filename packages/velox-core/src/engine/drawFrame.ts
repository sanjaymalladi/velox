/**
 * Master frame compositor.
 * Resolves element positions, computes animation states, and draws a single frame.
 * SHARED between Node.js (for rendering) and browser (for preview).
 */
import type { VeloxVideoConfig, SceneConfig, ElementConfig, VeloxPosition, VeloxColor, VeloxGradient } from '../types'
import { getAnimationState } from './animations'
import { drawText, drawTextList } from './drawText'
import { drawShape } from './drawShape'
import { lerp } from './easing'

type Ctx = CanvasRenderingContext2D

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
  height: number
): void {
  if (!bg) {
    ctx.fillStyle = '#000000'
  } else if (typeof bg === 'string') {
    ctx.fillStyle = bg
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
  }
  ctx.fillRect(0, 0, width, height)
}

// ─── Position resolver ────────────────────────────────────────────────────────

function resolvePosition(
  pos: VeloxPosition | undefined,
  width: number,
  height: number
): { x: number; y: number } {
  if (!pos) return { x: width / 2, y: height / 2 }

  switch (pos.type) {
    case 'absolute': return { x: pos.x, y: pos.y }
    case 'center':   return { x: width / 2 + (pos.offsetX ?? 0), y: height / 2 + (pos.offsetY ?? 0) }
    case 'named': {
      const ox = pos.offsetX ?? 0, oy = pos.offsetY ?? 0
      switch (pos.name) {
        case 'topLeft':      return { x: 80 + ox, y: 80 + oy }
        case 'topRight':     return { x: width - 80 + ox, y: 80 + oy }
        case 'bottomLeft':   return { x: 80 + ox, y: height - 80 + oy }
        case 'bottomRight':  return { x: width - 80 + ox, y: height - 80 + oy }
        case 'topCenter':    return { x: width / 2 + ox, y: 80 + oy }
        case 'bottomCenter': return { x: width / 2 + ox, y: height - 80 + oy }
        case 'leftCenter':   return { x: 80 + ox, y: height / 2 + oy }
        case 'rightCenter':  return { x: width - 80 + ox, y: height / 2 + oy }
        default:             return { x: width / 2 + ox, y: height / 2 + oy }
      }
    }
  }
}

// ─── Draw a single element ───────────────────────────────────────────────────

function drawElement(
  ctx: Ctx,
  el: ElementConfig,
  localFrame: number,
  fps: number,
  width: number,
  height: number
): void {
  const state = getAnimationState(el, localFrame, fps)
  if (state.opacity <= 0) return

  const { x, y } = resolvePosition(el.position, width, height)

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
    // image: handled in drawImage module (async, loaded via cache)
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
  alpha: number = 1
): void {
  ctx.save()
  ctx.globalAlpha = alpha

  // Background
  drawBackground(ctx, scene.background, width, height)

  // Elements
  for (const el of scene.elements) {
    drawElement(ctx, el, localFrame, fps, width, height)
  }

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
  drawBackground(ctx, config.background, width, height)

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
      // Crossfade transition
      const transStart = endFrame - transFrames
      const tp = (frame - transStart) / transFrames

      if (scene.transition.type === 'crossDissolve') {
        drawScene(ctx, scene, localFrame, config.fps, width, height, 1 - tp)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, tp)
      } else if (scene.transition.type === 'slide') {
        const dir = scene.transition.options?.direction ?? 'left'
        const ox = dir === 'left' ? -width * tp : width * tp
        ctx.save(); ctx.translate(ox, 0)
        drawScene(ctx, scene, localFrame, config.fps, width, height, 1)
        ctx.restore()
        ctx.save(); ctx.translate(ox + (dir === 'left' ? width : -width), 0)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, 1)
        ctx.restore()
      } else {
        // Fallback: crossDissolve
        drawScene(ctx, scene, localFrame, config.fps, width, height, 1 - tp)
        drawScene(ctx, nextScene.scene, frame - nextScene.startFrame, config.fps, width, height, tp)
      }
    } else if (isActive) {
      drawScene(ctx, scene, localFrame, config.fps, width, height)
    }
  }
}
