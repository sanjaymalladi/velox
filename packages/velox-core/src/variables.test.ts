import { describe, expect, it } from 'vitest'
import { applyVmlVariables, findUnresolvedVariables } from './variables'
import { createVideoFromMarkup } from './markupCompiler'

describe('variables', () => {
  it('substitutes {{key}} from map', () => {
    const out = applyVmlVariables('<video><scene duration="3"><text value="{{title}}" /></scene></video>', {
      title: 'Nova',
    })
    expect(out).toContain('Nova')
    expect(findUnresolvedVariables(out)).toHaveLength(0)
  })

  it('compiles video with variables applied', () => {
    const vml = `<video size="portrait" fps="30" theme="apple">
      <scene duration="4" template="centerCard">
        <hero slot="center" title="{{title}}" motion="heroCinematic" />
      </scene>
    </video>`
    const video = createVideoFromMarkup(vml, { title: 'Ship faster' })
    const text = video.config.scenes[0].elements[0]
    expect(text.type).toBe('group')
  })
})
