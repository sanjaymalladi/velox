import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Webpack resolves from `packages/site`; Turbopack root is usually the workspace root (pnpm lockfile). */
const canvasStubAbs = path.join(__dirname, 'stubs', 'napi-rs-canvas-stub.mjs')
const canvasStubTurboProjectRelative = './packages/site/stubs/napi-rs-canvas-stub.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@velox-video/core', '@velox-video/svgl'],
  /** Native addon cannot ship in Next bundles; the docs site only uses DOM canvas in the browser. */
  webpack: (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@napi-rs/canvas': canvasStubAbs,
    }
    return config
  },
  turbopack: {
    resolveAlias: {
      '@napi-rs/canvas': canvasStubTurboProjectRelative,
    },
  },
  allowedDevOrigins: ['127.0.0.1'],
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
    ]
  },
}

export default nextConfig
