/**
 * Browser / Turbopack client-bundle stub for `@napi-rs/canvas`.
 * `@velox-video/core` dynamically imports canvas only when `typeof window === 'undefined'` (Node CLI render).
 */

export async function loadImage(_input) {
  throw new Error('@napi-rs/canvas is only available in Node; this stub is bundled for Next.js.')
}
