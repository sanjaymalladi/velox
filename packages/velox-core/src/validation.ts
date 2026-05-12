import type { ElementConfig, VeloxVideoConfig, TransitionType, SceneCamera, SceneMood } from './types'
import type { RawVideoInput } from './core/Video'

const VALID_TRANSITION_TYPES: TransitionType[] = [
  'crossDissolve', 'blurDissolve', 'zoomSmooth', 'slide', 'wipe', 'zoom', 'glitch', 'flash',
]

const VALID_SCENE_CAMERAS: SceneCamera[] = ['none', 'slowPush', 'parallaxDrift', 'handheld', 'kenBurns']

const VALID_SCENE_MOODS: SceneMood[] = ['neutral', 'editorial', 'cinematic']

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`[velox] ${message}`)
}

function validateElement(el: ElementConfig, sceneId: string): void {
  assert(typeof el.id === 'string' && el.id.length > 0, `Element in ${sceneId} must have an id.`)
  if (el.opacity !== undefined) {
    assert(Number.isFinite(el.opacity) && el.opacity >= 0 && el.opacity <= 1, `Element "${el.id}" has invalid opacity.`)
  }

  if (el.type === 'text') {
    assert(typeof el.content === 'string', `Text element "${el.id}" content must be a string.`)
  }
  if (el.type === 'image') {
    assert(typeof el.src === 'string' && el.src.trim().length > 0, `Image element "${el.id}" src is required.`)
  }
  if (el.type === 'logo') {
    assert(typeof el.logo === 'string' && el.logo.trim().length > 0, `Logo element "${el.id}" logo is required.`)
  }
  if (el.type === 'shape') {
    if (el.shape.shapeType === 'barChart' && el.shape.data) {
      for (const point of el.shape.data) {
        assert(Number.isFinite(point.value), `Shape "${el.id}" has non-numeric bar chart value.`)
      }
    }
    if (el.shape.shapeType === 'progressBar' && el.shape.value !== undefined) {
      assert(Number.isFinite(el.shape.value) && el.shape.value >= 0 && el.shape.value <= 100, `Shape "${el.id}" progress must be 0-100.`)
    }
  }
  if (el.type === 'group') {
    assert(Array.isArray(el.children), `Group element "${el.id}" children must be an array.`)
    for (const child of el.children) validateElement(child, sceneId)
  }
}

export function validateRawVideoInput(input: RawVideoInput): void {
  assert(Array.isArray(input.scenes) && input.scenes.length > 0, 'Video must contain at least one scene.')
  if (input.fps !== undefined) {
    assert(input.fps === 24 || input.fps === 30 || input.fps === 60, `Unsupported fps "${input.fps}".`)
  }
  if (Array.isArray(input.size)) {
    const [w, h] = input.size
    assert(Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0, 'Custom size must contain positive width and height.')
  }
  if (input.motionQuality !== undefined) {
    assert(input.motionQuality === 'standard' || input.motionQuality === 'premium', `Unsupported motionQuality "${input.motionQuality}".`)
  }
}

export function validateVeloxVideoConfig(config: VeloxVideoConfig): void {
  assert(Array.isArray(config.size) && config.size.length === 2, 'Video size must be [width, height].')
  assert(Number.isFinite(config.size[0]) && Number.isFinite(config.size[1]) && config.size[0] > 0 && config.size[1] > 0, 'Video size values must be positive numbers.')
  assert(config.fps === 24 || config.fps === 30 || config.fps === 60, `Unsupported fps "${config.fps}".`)
  assert(Array.isArray(config.scenes) && config.scenes.length > 0, 'Video must have at least one scene.')
  if (config.motionQuality !== undefined) {
    assert(
      config.motionQuality === 'standard' || config.motionQuality === 'premium',
      `motionQuality must be standard or premium.`,
    )
  }

  for (const scene of config.scenes) {
    assert(Number.isFinite(scene.duration) && scene.duration > 0, `Scene "${scene.id}" must have a positive duration.`)
    if (scene.transition) {
      assert(Number.isFinite(scene.transition.duration) && scene.transition.duration >= 0, `Scene "${scene.id}" transition duration must be >= 0.`)
      assert(scene.transition.duration < scene.duration, `Scene "${scene.id}" transition duration must be less than scene duration.`)
      assert(
        VALID_TRANSITION_TYPES.includes(scene.transition.type),
        `Scene "${scene.id}" has unsupported transition type "${scene.transition.type}".`,
      )
    }
    if (scene.camera !== undefined) {
      assert(VALID_SCENE_CAMERAS.includes(scene.camera), `Scene "${scene.id}" has invalid camera "${scene.camera}".`)
    }
    if (scene.mood !== undefined) {
      assert(VALID_SCENE_MOODS.includes(scene.mood), `Scene "${scene.id}" has invalid mood "${scene.mood}".`)
    }
    if (scene.overlay?.vignetteOpacity !== undefined) {
      assert(Number.isFinite(scene.overlay.vignetteOpacity) && scene.overlay.vignetteOpacity >= 0 && scene.overlay.vignetteOpacity <= 1, `Scene "${scene.id}" vignette must be 0–1.`)
    }
    if (scene.overlay?.grainOpacity !== undefined) {
      assert(Number.isFinite(scene.overlay.grainOpacity) && scene.overlay.grainOpacity >= 0 && scene.overlay.grainOpacity <= 1, `Scene "${scene.id}" grain must be 0–1.`)
    }
    if (scene.audio?.volume !== undefined) {
      assert(Number.isFinite(scene.audio.volume) && scene.audio.volume >= 0 && scene.audio.volume <= 1, `Scene "${scene.id}" audio volume must be 0-1.`)
    }
    for (const element of scene.elements) validateElement(element, scene.id)
  }

  if (config.audioPlan !== undefined) {
    const plan = config.audioPlan
    if (plan.music) {
      assert(typeof plan.music.src === 'string' && plan.music.src.length > 0, 'audioPlan.music.src is required.')
      if (plan.music.volume !== undefined) {
        assert(Number.isFinite(plan.music.volume) && plan.music.volume >= 0 && plan.music.volume <= 1, `audioPlan.music.volume must be 0-1.`)
      }
    }
    assert(Array.isArray(plan.sfx), 'audioPlan.sfx must be an array.')
    assert(Array.isArray(plan.beats), 'audioPlan.beats must be an array.')
    for (let i = 0; i < plan.sfx.length; i++) {
      const cue = plan.sfx[i]!
      assert(typeof cue.name === 'string' && cue.name.length > 0, `audioPlan.sfx[${i}].name is required.`)
      assert(Number.isFinite(cue.at) && cue.at >= 0, `audioPlan.sfx[${i}].at must be >= 0.`)
      if (cue.volume !== undefined) {
        assert(Number.isFinite(cue.volume) && cue.volume >= 0 && cue.volume <= 1, `audioPlan.sfx[${i}].volume must be 0-1.`)
      }
    }
    for (let i = 0; i < plan.beats.length; i++) {
      const t = plan.beats[i]!
      assert(Number.isFinite(t) && t >= 0, `audioPlan.beats[${i}] must be >= 0.`)
    }
  }
}
