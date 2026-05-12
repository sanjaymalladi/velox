import path from 'path'
import fs from 'fs-extra'
import { createJiti } from 'jiti'
import { createVideoFromMarkup, validateVeloxVideoConfig } from '@velox-video/core'
import type { VeloxVideoConfig } from '@velox-video/core'
import { resolveVeloxPlaceholders } from '../media/resolveVeloxPlaceholders'

export async function loadVideoConfig(filePath: string): Promise<VeloxVideoConfig> {
  const abs = path.resolve(filePath)

  if ((await fs.pathExists(abs)) && abs.toLowerCase().endsWith('.vml')) {
    const trimmed = (await fs.readFile(abs, 'utf8')).trim()
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
