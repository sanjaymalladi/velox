import { defineConfig } from 'tsup'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
  },
  format: ['cjs'],
  clean: true,
  dts: true,
  // These are native/WASM modules that must NOT be bundled
  external: [
    '@napi-rs/canvas',
    'h264-mp4-encoder',
    'gif-encoder-2',
    'ffmpeg-static',
    'vite',
    '@vitejs/plugin-react',
    'ws',
    'open',
    'chokidar',
    'jiti',
    '@velox-video/core/node-render',
    '@fontsource/inter',
  ],
  // Bundle these inline so velox-cli is self-contained everywhere else
  noExternal: ['chalk', 'ora', 'commander', 'fs-extra', '@velox-video/core'],
  async onSuccess() {
    // Inject shebang so `velox` works as a global binary
    const outFile = path.resolve('dist/index.js')
    const content = fs.readFileSync(outFile, 'utf-8')
    if (!content.startsWith('#!/usr/bin/env node')) {
      fs.writeFileSync(outFile, '#!/usr/bin/env node\n' + content)
    }
    // Copy studio assets beside dist bundle
    const studioSrc = path.resolve('studio')
    const studioDst = path.resolve('dist/studio')
    if (fs.existsSync(studioSrc)) {
      fs.cpSync(studioSrc, studioDst, { recursive: true })
    }
    const catalogSrc = path.resolve('catalog')
    const catalogDst = path.resolve('dist/catalog')
    if (fs.existsSync(catalogSrc)) {
      fs.cpSync(catalogSrc, catalogDst, { recursive: true })
    }
    console.log('✓ Shebang injected into dist/index.js')
  },
})
