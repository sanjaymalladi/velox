import path from 'path'
import { createRequire } from 'module'

let registered = false

/** Register the text and symbol fonts used by native canvas rendering. */
export function registerVeloxFonts(): void {
  if (registered) return
  registered = true

  try {
    const requireLocal = createRequire(path.join(__dirname, 'index.js'))
    const specifier = `${String.fromCharCode(64)}napi-rs/canvas`
    const { GlobalFonts } = requireLocal(specifier) as {
      GlobalFonts: { registerFromPath: (p: string, nameAlias?: string) => unknown }
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

    // Canvas does not consistently find OS symbol fonts for missing glyphs.
    // Bundle this fallback so checkmarks, arrows, and common symbols render on
    // machines that have no suitable system font installed.
    const symbolsRoot = path.dirname(requireLocal.resolve('@fontsource/noto-sans-symbols-2/package.json'))
    const symbolsDir = path.join(symbolsRoot, 'files')
    GlobalFonts.registerFromPath(
      path.join(symbolsDir, 'noto-sans-symbols-2-symbols-400-normal.woff'),
      'Noto Sans Symbols 2 Symbols',
    )
    GlobalFonts.registerFromPath(
      path.join(
        path.dirname(requireLocal.resolve('@fontsource/noto-sans-math/package.json')),
        'files',
        'noto-sans-math-latin-400-normal.woff',
      ),
      'Noto Sans Math',
    )
  } catch {
    /* font registration is best-effort */
  }
}
