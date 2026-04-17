import path from 'path'
import { createJiti } from 'jiti'
import type { VeloxVideoConfig } from '@velox-video/core'

export async function loadVideoConfig(filePath: string): Promise<VeloxVideoConfig> {
  const abs = path.resolve(filePath)

  try {
    // Use the resolved velox-core path as jiti context so it can find modules correctly
    const veloxCorePath = require.resolve('@velox-video/core')
    const jiti = createJiti(veloxCorePath, {
      alias: {
        '@velox-video/core': veloxCorePath,
      }
    })
    const mod = await jiti.import(abs, { default: true }) as any
    const exported = mod?.default ?? mod

    // VeloxVideo instance (has .config property)
    if (exported && typeof exported === 'object' && 'config' in exported) {
      return exported.config as VeloxVideoConfig
    }

    // Plain config object (advanced usage)
    if (exported && typeof exported === 'object' && 'scenes' in exported) {
      return exported as VeloxVideoConfig
    }

    throw new Error(
      `Could not find a valid video export in "${filePath}".\n` +
      `Make sure you export a VeloxVideo: export default createVideo({ ... })`
    )
  } catch (err) {
    throw err
  }
}

