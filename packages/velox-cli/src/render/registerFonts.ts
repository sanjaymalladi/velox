import path from 'path'
import { createRequire } from 'module'

let registered = false

/** Register Inter (and fallbacks) for native canvas text rendering. */
export function registerVeloxFonts(): void {
  if (registered) return
  registered = true

  try {
    const requireLocal = createRequire(path.join(__dirname, 'index.js'))
    const specifier = `${String.fromCharCode(64)}napi-rs/canvas`
    const { GlobalFonts } = requireLocal(specifier) as {
      GlobalFonts: { registerFromPath: (p: string) => boolean }
    }

    const interRoot = path.dirname(requireLocal.resolve('@fontsource/inter/package.json'))
    const fontDir = path.join(interRoot, 'files')
    const weights = ['400', '600', '700', '800', '900']
    for (const w of weights) {
      const fontPath = path.join(fontDir, `inter-latin-${w}-normal.woff`)
      try {
        GlobalFonts.registerFromPath(fontPath)
      } catch {
        /* weight variant may be missing */
      }
    }
  } catch {
    /* font registration is best-effort */
  }
}
