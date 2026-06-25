import fs from 'node:fs'
import path from 'node:path'
import type { ThemeEntry } from './themesManifest.shared'

export type { ThemeEntry } from './themesManifest.shared'
export { categoryLabel } from './themesManifest.shared'

export function readThemesManifest(): ThemeEntry[] {
  const file = path.join(process.cwd(), 'public', 'themes', 'manifest.json')
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as ThemeEntry[]
  return [...raw].sort((a, b) => a.id.localeCompare(b.id))
}
