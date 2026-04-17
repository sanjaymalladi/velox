import { defineConfig } from 'tsup'
import fs from 'fs'
import path from 'path'

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
    'vite',
    '@vitejs/plugin-react',
    'ws',
    'open',
    'chokidar',
    'jiti',    // must not be bundled — it relies on __filename for module resolution
  ],
  // Bundle these inline so velox-cli is self-contained everywhere else
  noExternal: ['chalk', 'ora', 'commander', 'fs-extra', '@velox-video/core', 'chrome-paths'],
  async onSuccess() {
    // Inject shebang so `velox` works as a global binary
    const outFile = path.resolve('dist/index.js')
    const content = fs.readFileSync(outFile, 'utf-8')
    if (!content.startsWith('#!/usr/bin/env node')) {
      fs.writeFileSync(outFile, '#!/usr/bin/env node\n' + content)
    }
    console.log('✓ Shebang injected into dist/index.js')
  },
})
