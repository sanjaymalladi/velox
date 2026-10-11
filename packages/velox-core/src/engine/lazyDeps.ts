/**
 * On-demand loader for heavy, feature-isolated dependencies.
 *
 * `d3`, `flubber`, and `simplex-noise` are only needed for charts, path morphing,
 * and noise-grain — so they live in separate chunks and are pulled in by
 * `preloadHeavyDeps()` instead of bloating the default bundle. The draw functions
 * fall back to lightweight inline math when a module hasn't loaded yet, so a frame
 * still renders correctly even before preload resolves.
 */

import { initColors } from '../color'

type D3 = typeof import('d3')
type Flubber = typeof import('flubber')
type Simplex = typeof import('simplex-noise')

let _d3: D3 | null = null
let _flubber: Flubber | null = null
let _simplex: Simplex | null = null
let _loading: Promise<void> | null = null

/** Load d3 / flubber / simplex-noise + chroma-js/culori into the shared cache. Idempotent. */
export function preloadHeavyDeps(): Promise<void> {
  // Kick off the color-module load alongside the other heavy deps.
  void initColors()
  if (_d3 && _flubber && _simplex) return Promise.resolve()
  if (_loading) return _loading
  _loading = Promise.all([import('d3'), import('flubber'), import('simplex-noise')])
    .then(([d3m, flm, sxm]) => {
      _d3 = d3m
      _flubber = flm
      _simplex = sxm
      _loading = null
    })
    .catch(() => {
      // Leave modules null so the lightweight fallbacks keep being used.
      _loading = null
    })
  return _loading
}

export const getD3 = (): D3 | null => _d3
export const getFlubber = (): Flubber | null => _flubber
export const getSimplex = (): Simplex | null => _simplex
