import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** `packages/site` root (this file: app/api/velox-logo/_lib). */
const sitePackageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

const logoDirCandidates = [
  path.join(sitePackageRoot, 'node_modules/@velox-video/svgl/dist/logos'),
  path.join(sitePackageRoot, '../svgl-velox/dist/logos'),
]

export function getSvglLogosDir(): string {
  for (const dir of logoDirCandidates) {
    if (existsSync(dir)) return path.resolve(dir)
  }
  throw new Error(
    '[velox-logo] SVGL dist/logos missing. Run: pnpm --filter @velox-video/svgl build',
  )
}
