/**
 * Seeded deterministic random — safe for frame-by-frame rendering.
 * Uses a simple xorshift algorithm with a string seed.
 * @param seed - a unique string seed
 * @returns a float between 0 and 1 (always the same for the same seed)
 */
export function random(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  // xorshift32
  let x = hash === 0 ? 1 : Math.abs(hash)
  x ^= x << 13
  x ^= x >> 17
  x ^= x << 5
  return (x >>> 0) / 4294967296
}

/**
 * Seeded random range helper
 */
export function randomRange(seed: string, min: number, max: number): number {
  return min + random(seed) * (max - min)
}
