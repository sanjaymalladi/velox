import { describe, expect, it } from 'vitest'
import { lintVeloxMarkup, lintVeloxConfig } from './lint'

const MINI = `<video size="portrait" fps="30" theme="apple">
  <scene duration="4" template="centerCard">
    <hero slot="center" title="Test" motion="heroCinematic" />
    <captions slot="caption" text="Hello world." style="pill" />
  </scene>
</video>`

describe('lintVeloxMarkup', () => {
  it('accepts a product UI demo and warns when its scene is too short', () => {
    const result = lintVeloxMarkup(`<video><scene duration="3"><uiDemo prompt="Render this idea" /></scene></video>`)
    expect(result.ok).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'short-ui-demo')).toBe(true)
  })

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

  it('checks world continuity, scene focus, source dates, and contrast', () => {
    const r = lintVeloxMarkup(`<video><visualWorld bgColor="#ffffff" /><scene duration="2" chapter="One" focus="a title" source="https://example.com"><text value="Low contrast" color="#eeeeee" /></scene><scene duration="2"><text value="Second" /></scene><scene duration="2"><text value="Third" /></scene></video>`)
    expect(r.issues.some((issue) => issue.code === 'scene-source-date-missing')).toBe(true)
    expect(r.issues.some((issue) => issue.code === 'scene-source-missing')).toBe(true)
    expect(r.issues.some((issue) => issue.code === 'scene-focus-missing')).toBe(true)
    expect(r.issues.some((issue) => issue.code === 'text-contrast-low')).toBe(true)
  })

  it('requires provenance for quantitative charts', () => {
    const r = lintVeloxMarkup('<video><scene duration="2"><barChart><bar label="A" value="1" /></barChart></scene></video>')
    expect(r.issues.some((issue) => issue.code === 'chart-source-missing')).toBe(true)
    const sourced = lintVeloxMarkup('<video><scene duration="2"><barChart source="https://example.com"><bar label="A" value="1" /></barChart></scene></video>')
    expect(sourced.issues.some((issue) => issue.code === 'chart-source-date-missing')).toBe(true)
    expect(sourced.issues.some((issue) => issue.code === 'chart-units-missing')).toBe(true)
  })

  it('uses line thickness instead of a square shape when checking overflow', () => {
    const r = lintVeloxMarkup('<video size="1280x720"><scene duration="2"><line x="480" y="490" length="770" thickness="3" /></scene></video>')
    expect(r.issues.some((issue) => issue.code === 'layout-overflow')).toBe(false)
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
