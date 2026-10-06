import { describe, expect, it } from 'vitest'
import { lintVeloxMarkup, lintVeloxConfig } from './lint'

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

describe('lintVeloxConfig', () => {
  it('lints an already-compiled config (the .ts authoring path)', () => {
    const r = lintVeloxConfig(lintVeloxMarkup(MINI).config!)
    expect(r.ok).toBe(true)
    expect(r.sceneCount).toBe(1)
  })

  it('flags an empty scene', () => {
    const cfg = lintVeloxMarkup(MINI).config!
    cfg.scenes[0] = { ...cfg.scenes[0], elements: [] }
    const r = lintVeloxConfig(cfg)
    expect(r.issues.some((i) => i.code === 'empty-scene')).toBe(true)
  })

  it('errors on an invalid config', () => {
    const r = lintVeloxConfig({ size: [0, 0], fps: 30, scenes: [] } as never)
    expect(r.ok).toBe(false)
    expect(r.issues.some((i) => i.code === 'invalid-config')).toBe(true)
  })
})
