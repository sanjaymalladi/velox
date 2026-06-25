/** Node-only helpers (native canvas). Do not import from browser bundles. */
export { preloadRasterInNodeWithLoader, type LoadImageFn } from './engine/preloadRasterInNode'
export { preloadImagesInNode } from './engine/preloadImagesNode'
export { drawLayerWithBlur as drawLayerWithBlurInNode } from './engine/cpuBlurNode'
export { setNodeDrawLayerWithBlur } from './engine/drawFrame'

import { drawLayerWithBlur as drawLayerWithBlurInNode } from './engine/cpuBlurNode'
import { setNodeDrawLayerWithBlur } from './engine/drawFrame'

setNodeDrawLayerWithBlur(drawLayerWithBlurInNode)
