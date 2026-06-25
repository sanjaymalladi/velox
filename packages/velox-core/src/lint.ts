/**
 * VML / config lint — fast checks before a long native render.
 */
import { createVideoFromMarkup, isVeloxMarkup } from './markupCompiler'
import { validateVeloxVideoConfig } from './validation'
import { aestheticIds } from './aesthetics/registry'
import { findUnresolvedVariables } from './variables'
import type { VeloxVideoConfig } from './types'

export interface LintIssue {
  level: 'error' | 'warn'
  code: string
  message: string
  scene?: string
}

export interface LintResult {
  ok: boolean
  issues: LintIssue[]
  config?: VeloxVideoConfig
  sceneCount?: number
  durationSec?: number
}

function push(issues: LintIssue[], issue: LintIssue): void {
  issues.push(issue)
}

export function lintVeloxMarkup(markup: string): LintResult {
  const issues: LintIssue[] = []

  if (!isVeloxMarkup(markup)) {
    push(issues, { level: 'error', code: 'not-vml', message: 'Input is not valid Velox markup (<video> root required).' })
    return { ok: false, issues }
  }

  for (const key of findUnresolvedVariables(markup)) {
    push(issues, {
      level: 'warn',
      code: 'unresolved-var',
      message: `Unresolved variable {{${key}}} — set VELox_${key.replace(/[.-]/g, '_').toUpperCase()} or pass at compile time.`,
    })
  }

  let config: VeloxVideoConfig
  try {
    config = createVideoFromMarkup(markup).config
    validateVeloxVideoConfig(config)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    push(issues, { level: 'error', code: 'compile', message: msg })
    return { ok: false, issues }
  }

  const themeId = markup.match(/theme="([^"]+)"/)?.[1]
  if (themeId && !aestheticIds.includes(themeId)) {
    push(issues, {
      level: 'warn',
      code: 'unknown-theme',
      message: `Theme "${themeId}" is not a registered aesthetic — falling back to legacy palette.`,
    })
  }

  let cursorSec = 0
  for (const scene of config.scenes) {
    if (scene.elements.length === 0) {
      push(issues, {
        level: 'warn',
        code: 'empty-scene',
        message: 'Scene has no elements.',
        scene: scene.id,
      })
    }

    const captionStarts: number[] = []
    for (const el of scene.elements) {
      const collectCaption = (e: typeof el): void => {
        if (e.type === 'text' && e.caption?.cueStartSec !== undefined) {
          captionStarts.push(e.caption.cueStartSec)
        }
        if (e.type === 'group') e.children.forEach(collectCaption)
      }
      collectCaption(el)
    }
    if (captionStarts.some((t) => t >= scene.duration)) {
      push(issues, {
        level: 'warn',
        code: 'caption-timing',
        message: 'Caption start is at or after scene end — words may never appear.',
        scene: scene.id,
      })
    }

    cursorSec += scene.duration
    if (scene.transition) cursorSec -= scene.transition.duration
  }

  const durationSec = config.scenes.reduce((acc, s) => {
    const trans = s.transition?.duration ?? 0
    return acc + s.duration - trans
  }, 0)

  return {
    ok: !issues.some((i) => i.level === 'error'),
    issues,
    config,
    sceneCount: config.scenes.length,
    durationSec,
  }
}
