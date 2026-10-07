import path from 'path'
import fs from 'fs-extra'
import { createJiti } from 'jiti'
import { createVideoFromMarkup, validateVeloxVideoConfig, preloadAesthetics, preloadHeavyDeps, parseCaptionTracks } from '@velox-video/core'
import type { VeloxVideoConfig } from '@velox-video/core'
import { resolveVeloxPlaceholders } from '../media/resolveVeloxPlaceholders'

function xmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function inlineCaptionSources(markup: string, projectDir: string): Promise<string> {
  const tags = [...markup.matchAll(/<captions\b(?=[^>]*\bsrc\s*=)[^>]*\/>/gi)]
  for (const match of tags) {
    const tag = match[0]
    const src = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2]
    if (!src) continue
    const file = path.isAbsolute(src) ? src : path.resolve(projectDir, src)
    const cues = parseCaptionTracks(await fs.readFile(file, 'utf8'))
    if (!cues.length) throw new Error(`No caption cues found in "${src}".`)
    const style = tag.match(/\bstyle\s*=\s*(["'])(.*?)\1/i)?.[2] ?? 'karaoke'
    const children = cues.map((cue) => {
      const attrs = `at="${cue.start}"${cue.end === undefined ? '' : ` dur="${Math.max(0, cue.end - cue.start)}"`}`
      return `<caption ${attrs} text="${xmlAttr(cue.text)}" />`
    }).join('')
    const retainedAttrs = tag.slice('<captions'.length, tag.length - 2)
      .replace(/\bsrc\s*=\s*(["']).*?\1/i, '')
      .trim()
    markup = markup.replace(tag, `<captions ${retainedAttrs || `style="${xmlAttr(style)}"`}>${children}</captions>`)
  }
  return markup
}

export async function loadVideoConfig(filePath: string): Promise<VeloxVideoConfig> {
  const abs = path.resolve(filePath)
  await Promise.all([preloadAesthetics(), preloadHeavyDeps()])

  if ((await fs.pathExists(abs)) && abs.toLowerCase().endsWith('.vml')) {
    const raw = (await fs.readFile(abs, 'utf8')).trim()
    const trimmed = await inlineCaptionSources(raw, path.dirname(abs))
    if (!trimmed.startsWith('<video')) {
      throw new Error(`"${filePath}" must start with <video> markup.`)
    }
    const video = createVideoFromMarkup(trimmed)
    const cfg = video.config
    validateVeloxVideoConfig(cfg)
    await resolveVeloxPlaceholders(cfg, path.dirname(abs))
    return cfg
  }

  try {
    const veloxCorePath = require.resolve('@velox-video/core')
    const jiti = createJiti(veloxCorePath, {
      alias: {
        '@velox-video/core': veloxCorePath,
      },
    })
    const mod = (await jiti.import(abs, { default: true })) as { default?: unknown }
    const exported = mod?.default ?? mod

    let config: VeloxVideoConfig | undefined

    if (exported && typeof exported === 'object' && 'config' in exported) {
      config = (exported as { config: VeloxVideoConfig }).config
    }

    if (exported && typeof exported === 'object' && 'scenes' in exported) {
      config = exported as VeloxVideoConfig
    }

    if (!config)
      throw new Error(
        `Could not find a valid video export in "${filePath}".\n` +
          `Export a VeloxVideo: export default createVideo({ ... }) or compile VML.`,
      )

    validateVeloxVideoConfig(config)
    await resolveVeloxPlaceholders(config, path.dirname(abs))
    return config
  } catch (err) {
    throw err
  }
}
