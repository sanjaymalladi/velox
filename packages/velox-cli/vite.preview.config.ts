import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/preview/engineEntry.ts'),
      name: 'VeloxPreviewEngine',
      formats: ['iife'],
      fileName: () => 'preview-engine.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      output: { extend: true },
    },
  },
  resolve: {
    alias: {
      '@velox-video/core': path.resolve(__dirname, '../velox-core/dist/index.mjs'),
    },
  },
})
