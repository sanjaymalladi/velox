import { createVideo, type VeloxVideo } from './core/Video'
import { scene, type SceneBuilder } from './core/Scene'
import { text } from './elements/Text'
import { image } from './elements/Image'
import { shape } from './elements/Shape'
import { logo } from './elements/Logo'
import { group } from './elements/Group'
import { layout } from './layout'
import { backdrops } from './backdrops'
import { typography, cards as creativeCards, motion } from './presets'
import type { Element } from './core/Element'
import type { ElementConfig, VeloxColor, VeloxGradient } from './types'
import {
  CREATIVE_SPEC_FORMAT,
  validateCreativeSpec,
  type CreativeBackground,
  type CreativeBlock,
  type CreativeMotion,
  type CreativePlacement,
  type CreativeScale,
  type CreativeSpec,
} from './creativeSpec'

type AnyElement = Element<ElementConfig>

const scaleMap: Record<Exclude<CreativeScale, number>, number> = {
  xs: 0.55,
  sm: 0.75,
  md: 1,
  lg: 1.25,
  xl: 1.55,
}

function scaleValue(scale: CreativeScale | undefined, base: number): number {
  if (typeof scale === 'number') return Math.max(0.25, Math.min(3, scale)) * base
  return base * scaleMap[scale ?? 'md']
}

function resolveBackground(background: CreativeBackground | undefined): VeloxColor | VeloxGradient | undefined {
  if (!background) return undefined
  if (typeof background === 'string') return background
  switch (background.kind) {
    case 'solid':
      return background.color
    case 'grid':
      return backdrops.grid(background.color, background.size)
    case 'aurora':
      return backdrops.aurora({ mood: background.mood, angle: background.angle })
    case 'mesh':
      return backdrops.meshGradient({ palette: background.palette, angle: background.angle })
  }
}

function resolveRootBackground(background: CreativeBackground | undefined): VeloxColor | undefined {
  const resolved = resolveBackground(background)
  return typeof resolved === 'string' ? resolved : undefined
}

function place<T extends AnyElement>(element: T, placement: CreativePlacement | undefined): T {
  switch (placement ?? 'center') {
    case 'top':
    case 'safeTop':
      return element.pos('topCenter', undefined, { offsetY: 120 })
    case 'bottom':
    case 'safeBottom':
      return element.pos('bottomCenter', undefined, { offsetY: -120 })
    case 'left':
      return element.pos('leftCenter', undefined, { offsetX: 120 })
    case 'right':
      return element.pos('rightCenter', undefined, { offsetX: -120 })
    case 'hero':
      return element.center({ offsetY: -120 })
    case 'center':
    default:
      return element.center()
  }
}

function applyMotion<T extends AnyElement>(element: T, blockMotion: CreativeMotion | undefined, delay = 0): T {
  switch (blockMotion ?? 'cinematic') {
    case 'none':
      return element
    case 'fade':
      return element.in('fadeIn', 0.6, { delay })
    case 'typewriter':
      return element.in('typewriter', 0.9, { delay })
    case 'pop':
      return motion.pop(element, delay)
    case 'float':
      return motion.float(motion.cinematicIn(element, delay))
    case 'drawThenSlide':
      return element.in('slideLeft', 0.8, { delay, ease: 'tactile' })
    case 'stagger':
    case 'cinematic':
    default:
      return motion.cinematicIn(element, delay)
  }
}

function compileShape(block: Extract<CreativeBlock, { kind: 'shape' }>): AnyElement {
  const size = scaleValue(block.scale, 240)
  if (block.outline && block.shape === 'rect') {
    return group([
      shape.rect(size + 10, size * 0.58 + 10).color(block.outline).radius(28),
      shape.rect(size, size * 0.58).color(block.color ?? 'rgba(255,255,255,0.08)').radius(24),
    ]).stack()
  }
  if (block.shape === 'circle') return shape.circle(size).color(block.color ?? '#a78bfa')
  if (block.shape === 'line') return shape.line(size).color(block.color ?? '#a78bfa').thickness(5)
  return shape.rect(size, size * 0.58).color(block.color ?? 'rgba(255,255,255,0.10)').radius(24)
}

function compileBlock(block: CreativeBlock): AnyElement {
  switch (block.kind) {
    case 'hero':
      return applyMotion(
        place(typography.hero(block.title, {
          kicker: block.kicker,
          subtitle: block.subtitle,
          accent: block.style === 'neon' ? '#67e8f9' : undefined,
        }), block.placement ?? 'center'),
        block.motion,
        block.delay,
      )
    case 'text': {
      const el = text(block.text)
        .size(scaleValue(block.scale, block.muted ? 34 : 58))
        .weight(block.muted ? 400 : 750)
        .color(block.muted ? 'rgba(255,255,255,0.68)' : '#ffffff')
        .wrap(820)
      return applyMotion(place(el, block.placement), block.motion, block.delay)
    }
    case 'list':
      return applyMotion(place(creativeCards.glassList(block.items), block.placement), block.motion, block.delay)
    case 'logoLockup':
      return applyMotion(place(group([...logo.lockup(block.logo, block.label, block.theme ?? 'light', {
        logoSize: scaleValue(block.scale, 72),
        textSize: scaleValue(block.scale, 76),
        color: block.theme === 'dark' ? '#111111' : '#ffffff',
      })]).stack(), block.placement), block.motion === 'drawThenSlide' ? 'none' : block.motion, block.delay)
    case 'media': {
      const el = block.stock ? image.stock(block.stock) : image(block.src ?? '')
      el.size(scaleValue(block.scale, 520), scaleValue(block.scale, 320)).radius(28).fit()
      return applyMotion(place(el, block.placement), block.motion, block.delay)
    }
    case 'progress': {
      const bar = shape.progressBar(block.value, { trackColor: block.trackColor, color: block.color }).size(scaleValue(block.scale, 640), 22)
      const children: AnyElement[] = [bar]
      if (block.label) children.unshift(text(block.label).size(28).color('rgba(255,255,255,0.72)'))
      return applyMotion(place(layout.column(children, { gap: 20 }), block.placement), block.motion, block.delay)
    }
    case 'metricRow':
      return applyMotion(place(layout.row(
        block.metrics.map((metric) => creativeCards.metric(metric.value, metric.label, { accent: metric.accent })),
        { gap: 24 },
      ), block.placement), block.motion, block.delay)
    case 'shape':
      return applyMotion(place(compileShape(block), block.placement), block.motion, block.delay)
    case 'group': {
      const children = block.blocks.map(compileBlock)
      const grouped = block.layout === 'row'
        ? layout.row(children, { gap: block.gap ?? 28 })
        : block.layout === 'stack'
          ? layout.stack(children)
          : layout.column(children, { gap: block.gap ?? 28 })
      return applyMotion(place(grouped, block.placement), block.motion, block.delay)
    }
  }
}

export function isCreativeSpec(value: unknown): value is CreativeSpec {
  return typeof value === 'object' && value !== null && (value as { format?: unknown }).format === CREATIVE_SPEC_FORMAT
}

export function createVideoFromCreativeSpec(input: unknown): VeloxVideo {
  validateCreativeSpec(input)
  const scenes: SceneBuilder[] = input.scenes.map((creativeScene) => {
    const s = scene(creativeScene.duration ?? 5)
    const bg = resolveBackground(creativeScene.background)
    if (bg) s.background(bg)
    s.add(...creativeScene.blocks.map(compileBlock))
    return s
  })
  return createVideo({
    size: input.size ?? 'portrait',
    fps: input.fps ?? 60,
    theme: input.theme ?? 'obsidian',
    background: resolveRootBackground(input.background),
    scenes,
  })
}

