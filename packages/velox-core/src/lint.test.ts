import { describe, expect, it } from 'vitest'
import { lintVeloxMarkup } from './lint'

const MINI = `<video size="portrait" fps="30" theme="apple">
  <scene duration="4" template="centerCard">
    <hero slot="center" title="Test" motion="heroCinematic" />
    <captions slot="caption" text="Hello world." style="pill" />
  </scene>
</video>`

describe('lintVeloxMarkup', () => {
  it('passes valid reel VML', () => {
    const r = lintVeloxMarkup(MINI)
    expect(r.ok).toBe(true)
    expect(r.sceneCount).toBe(1)
  })

  it('errors on invalid markup', () => {
    const r = lintVeloxMarkup('<div>not vml</div>')
    expect(r.ok).toBe(false)
    expect(r.issues.some((i) => i.code === 'not-vml')).toBe(true)
  })

  it('warns on unresolved variables', () => {
    const r = lintVeloxMarkup(MINI.replace('Test', '{{missing}}'))
    expect(r.issues.some((i) => i.code === 'unresolved-var')).toBe(true)
  })
})
