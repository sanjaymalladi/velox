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

  it('reports source locations for unknown attributes', () => {
    const r = lintVeloxMarkup('<video size="portrait" fps="30">\n  <scene duration="4">\n    <text value="Hello" colro="red" />\n  </scene>\n</video>')
    const issue = r.issues.find((item) => item.code === 'unknown-attribute')
    expect(issue?.location?.line).toBe(3)
    expect(issue?.location?.column).toBe(25)
  })

  it('rejects duplicate attributes and accepts the root fx tag', () => {
    const duplicate = lintVeloxMarkup('<video size="portrait" size="square" />')
    expect(duplicate.issues.some((item) => item.code === 'syntax')).toBe(true)

    const withFx = lintVeloxMarkup('<video size="portrait"><fx grain="0.2" /><scene duration="2"><text value="Hi" /></scene></video>')
    expect(withFx.issues.some((item) => item.code === 'syntax')).toBe(false)
  })

  it('accepts explicit dark chart surfaces and rejects invalid values', () => {
    const valid = lintVeloxMarkup('<video><scene duration="2"><lineChart surface="dark"><series values="1,2,3" /></lineChart></scene></video>')
    expect(valid.issues.some((item) => item.code === 'invalid-chart-surface')).toBe(false)

    const invalid = lintVeloxMarkup('<video><scene duration="2"><lineChart surface="auto"><series values="1,2,3" /></lineChart></scene></video>')
    expect(invalid.issues.some((item) => item.code === 'invalid-chart-surface')).toBe(true)
  })

  it('checks values and recommends automatic scene layout', () => {
    const invalid = lintVeloxMarkup('<video size="portrait" fps="31"><scene duration="four" /></video>')
    expect(invalid.issues.some((item) => item.code === 'invalid-fps')).toBe(true)
    expect(invalid.issues.some((item) => item.code === 'type-number')).toBe(true)

    const overlap = lintVeloxMarkup('<video size="portrait"><scene duration="4"><text value="First" /><text value="Second" /></scene></video>')
    expect(overlap.issues.some((item) => item.code === 'text-overlap')).toBe(true)
  })

  it('compiles a centered column layout and preserves caption placement', () => {
    const r = lintVeloxMarkup('<video size="portrait"><scene duration="4" layout="column" gap="20"><text value="Title" /><text value="Subtitle" /><captions slot="caption" text="Words here" /></scene></video>')
    expect(r.ok).toBe(true)
    expect(r.config?.scenes[0]?.elements).toHaveLength(2)
    expect(r.config?.scenes[0]?.elements[0]?.type).toBe('group')
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
