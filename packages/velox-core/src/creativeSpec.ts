import type { VeloxSize, VeloxFps } from './types'

export const CREATIVE_SPEC_FORMAT = 'velox-creative-spec-v1' as const

export type CreativePlacement =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'hero'
  | 'safeTop'
  | 'safeBottom'

export type CreativeScale = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
export type CreativeMotion = 'none' | 'fade' | 'cinematic' | 'typewriter' | 'stagger' | 'drawThenSlide' | 'pop' | 'float'
export type CreativeStyle = 'glass' | 'minimal' | 'editorial' | 'neon' | 'cinematic' | 'brutalist'

export type CreativeBackground =
  | string
  | { kind: 'solid'; color: string }
  | { kind: 'grid'; color?: string; size?: number }
  | { kind: 'aurora'; mood?: 'midnight' | 'violet' | 'danger' | 'ocean' | 'ember'; angle?: string }
  | { kind: 'mesh'; palette?: 'midnight' | 'violet' | 'danger' | 'ocean' | 'ember'; angle?: string }

export interface CreativeBlockBase {
  kind: string
  placement?: CreativePlacement
  scale?: CreativeScale
  motion?: CreativeMotion
  style?: CreativeStyle
  delay?: number
}

export interface CreativeHeroBlock extends CreativeBlockBase {
  kind: 'hero'
  title: string
  kicker?: string
  subtitle?: string
}

export interface CreativeTextBlock extends CreativeBlockBase {
  kind: 'text'
  text: string
  muted?: boolean
}

export interface CreativeListBlock extends CreativeBlockBase {
  kind: 'list'
  items: string[]
}

export interface CreativeLogoLockupBlock extends CreativeBlockBase {
  kind: 'logoLockup'
  logo: string
  label: string
  theme?: 'light' | 'dark'
}

export interface CreativeMediaBlock extends CreativeBlockBase {
  kind: 'media'
  src?: string
  stock?: string
}

export interface CreativeProgressBlock extends CreativeBlockBase {
  kind: 'progress'
  value: number
  label?: string
  color?: string
  trackColor?: string
}

export interface CreativeMetric {
  value: string
  label: string
  accent?: string
}

export interface CreativeMetricRowBlock extends CreativeBlockBase {
  kind: 'metricRow'
  metrics: CreativeMetric[]
}

export interface CreativeShapeBlock extends CreativeBlockBase {
  kind: 'shape'
  shape: 'rect' | 'circle' | 'line'
  color?: string
  outline?: string
}

export interface CreativeGroupBlock extends CreativeBlockBase {
  kind: 'group'
  layout?: 'row' | 'column' | 'stack'
  gap?: number
  blocks: CreativeBlock[]
}

export type CreativeBlock =
  | CreativeHeroBlock
  | CreativeTextBlock
  | CreativeListBlock
  | CreativeLogoLockupBlock
  | CreativeMediaBlock
  | CreativeProgressBlock
  | CreativeMetricRowBlock
  | CreativeShapeBlock
  | CreativeGroupBlock

export interface CreativeScene {
  duration?: number
  background?: CreativeBackground
  blocks: CreativeBlock[]
}

export interface CreativeSpec {
  format: typeof CREATIVE_SPEC_FORMAT
  size?: VeloxSize
  fps?: VeloxFps
  theme?: 'geist' | 'notion' | 'linear' | 'obsidian' | 'sandstone' | 'corporateBlue' | 'mintMinimal' | 'monochromeGrid'
  background?: CreativeBackground
  scenes: CreativeScene[]
}

const placements: CreativePlacement[] = ['center', 'top', 'bottom', 'left', 'right', 'hero', 'safeTop', 'safeBottom']
const motions: CreativeMotion[] = ['none', 'fade', 'cinematic', 'typewriter', 'stagger', 'drawThenSlide', 'pop', 'float']
const styles: CreativeStyle[] = ['glass', 'minimal', 'editorial', 'neon', 'cinematic', 'brutalist']
const blockKinds = ['hero', 'text', 'list', 'logoLockup', 'media', 'progress', 'metricRow', 'shape', 'group']

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`[velox creative spec] ${message}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertString(value: unknown, path: string): asserts value is string {
  assert(typeof value === 'string' && value.trim().length > 0, `${path} must be a non-empty string.`)
}

function validateBlock(block: unknown, path: string): asserts block is CreativeBlock {
  assert(isRecord(block), `${path} must be an object.`)
  assertString(block.kind, `${path}.kind`)
  assert(blockKinds.includes(block.kind), `${path}.kind "${block.kind}" is invalid. Use: ${blockKinds.join(', ')}.`)

  if (block.placement !== undefined) assert(placements.includes(block.placement as CreativePlacement), `${path}.placement is invalid. Use: ${placements.join(', ')}.`)
  if (block.motion !== undefined) assert(motions.includes(block.motion as CreativeMotion), `${path}.motion is invalid. Use: ${motions.join(', ')}.`)
  if (block.style !== undefined) assert(styles.includes(block.style as CreativeStyle), `${path}.style is invalid. Use: ${styles.join(', ')}.`)

  switch (block.kind) {
    case 'hero':
      assertString(block.title, `${path}.title`)
      break
    case 'text':
      assertString(block.text, `${path}.text`)
      break
    case 'list':
      assert(Array.isArray(block.items) && block.items.every((item) => typeof item === 'string'), `${path}.items must be a string array.`)
      break
    case 'logoLockup':
      assertString(block.logo, `${path}.logo`)
      assertString(block.label, `${path}.label`)
      break
    case 'media':
      assert(typeof block.src === 'string' || typeof block.stock === 'string', `${path} needs src or stock.`)
      break
    case 'progress':
      assert(Number.isFinite(block.value) && (block.value as number) >= 0 && (block.value as number) <= 100, `${path}.value must be 0-100.`)
      break
    case 'metricRow':
      assert(Array.isArray(block.metrics) && block.metrics.length > 0, `${path}.metrics must be a non-empty array.`)
      break
    case 'shape':
      assert(block.shape === 'rect' || block.shape === 'circle' || block.shape === 'line', `${path}.shape must be rect, circle, or line.`)
      break
    case 'group':
      assert(Array.isArray(block.blocks) && block.blocks.length > 0, `${path}.blocks must be a non-empty array.`)
      block.blocks.forEach((child, index) => validateBlock(child, `${path}.blocks[${index}]`))
      break
  }
}

export function validateCreativeSpec(spec: unknown): asserts spec is CreativeSpec {
  assert(isRecord(spec), 'Spec must be an object.')
  assert(spec.format === CREATIVE_SPEC_FORMAT, `format must be "${CREATIVE_SPEC_FORMAT}".`)
  assert(Array.isArray(spec.scenes) && spec.scenes.length > 0, 'scenes must be a non-empty array.')
  spec.scenes.forEach((scene, sceneIndex) => {
    assert(isRecord(scene), `scenes[${sceneIndex}] must be an object.`)
    if (scene.duration !== undefined) assert(Number.isFinite(scene.duration) && (scene.duration as number) > 0, `scenes[${sceneIndex}].duration must be positive.`)
    assert(Array.isArray(scene.blocks) && scene.blocks.length > 0, `scenes[${sceneIndex}].blocks must be a non-empty array.`)
    scene.blocks.forEach((block, blockIndex) => validateBlock(block, `scenes[${sceneIndex}].blocks[${blockIndex}]`))
  })
}

