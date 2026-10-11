import { describe, expect, it } from 'vitest'
import { createVideoFromMarkup, configToMarkup } from './markupCompiler'

/** Compile → serialize → re-compile → serialize must be idempotent: the
 *  serializer flattens groups to absolute leaves, so re-serializing the
 *  round-tripped config must reproduce the same markup. */
function roundTrip(vml: string): { first: string; second: string } {
  const a = createVideoFromMarkup(vml).config
  const first = configToMarkup(a)
  const b = createVideoFromMarkup(first).config
  const second = configToMarkup(b)
  return { first, second }
}

describe('configToMarkup round-trip', () => {
  it('preserves a flat scene (text + rect) idempotently', () => {
    const vml = `<video size="portrait" fps="30" theme="obsidian">
      <scene duration="4">
        <text value="Hello world" x="540" y="960" size="56" weight="700" color="#ffffff" />
        <rect x="200" y="1200" width="680" height="120" radius="24" color="#5e6ad2" />
      </scene>
    </video>`
    const { first, second } = roundTrip(vml)
    expect(second).toBe(first)
    expect(first).toContain('value="Hello world"')
    expect(first).toContain('color="#ffffff"')
  })

  it('preserves grouped + dragged children (flattened to absolute positions)', () => {
    // <column> compiles to a group; the serializer flattens it to absolute leaves.
    const vml = `<video size="portrait" fps="30" theme="obsidian">
      <scene duration="5">
        <column x="540" y="900">
          <text value="Inside group" size="48" color="#fbbf24" />
          <rect width="400" height="80" radius="16" color="#22d3ee" />
        </column>
        <circle x="300" y="300" diameter="120" color="#a3e635" />
      </scene>
    </video>`
    const { first, second } = roundTrip(vml)
    expect(second).toBe(first)
    // Group was flattened: leaves appear at absolute positions.
    expect(first).toContain('value="Inside group"')
    expect(first).toContain('color="#22d3ee"')
    expect(first).toContain('diameter="120"')
  })
})
