import { describe, expect, it } from 'vitest'
import { createVideoFromMarkup, isVeloxMarkup } from './markupCompiler'

describe('velox markup', () => {
  it('compiles nested markup into a video', () => {
    const video = createVideoFromMarkup(`
      <video size="portrait" fps="60" theme="obsidian" background="grid(rgba(255,255,255,0.04), 44)">
        <scene duration="5" background="aurora:violet">
          <center motion="cinematic">
            <hero kicker="AI SYSTEMS" title="From Prompt to Workflow" subtitle="Valid code without brittle chains" />
          </center>
        </scene>
        <scene duration="5" background="mesh:ocean">
          <column gap="32" placement="center">
            <kicker color="#67e8f9">THE LOOP</kicker>
            <row gap="24">
              <metric value="01" label="Input" />
              <metric value="02" label="Plan" />
            </row>
            <progress value="72" color="#22c55e" width="620" height="18" motion="growUp" />
          </column>
        </scene>
      </video>
    `)

    expect(video.config.size).toEqual([1080, 1920])
    expect(video.config.fps).toBe(60)
    expect(video.config.scenes).toHaveLength(2)
  })

  it('keeps global backgrounds and lets scene backgrounds override them', () => {
    const video = createVideoFromMarkup(`
      <video background="grid(rgba(255,255,255,0.04), 44)">
        <scene duration="4"><text value="Global background" /></scene>
        <scene duration="4" background="mesh:neon"><text value="Scene background" /></scene>
      </video>
    `)

    expect(video.config.background).toBe('grid(rgba(255,255,255,0.04), 44)')
    expect(video.config.scenes[0].background).toBe('#050505')
    expect(video.config.scenes[1].background).toEqual(expect.objectContaining({ type: 'linear' }))
  })

  it('supports cream grid video backgrounds with the cream theme', () => {
    const video = createVideoFromMarkup(`
      <video theme="creamChecks" background="creamGrid">
        <scene duration="4"><text value="Cream grid" color="theme.text" /></scene>
      </video>
    `)

    expect(video.config.theme?.background).toBe('#f8f1e3')
    expect(video.config.background).toBe('grid(rgba(63,51,37,0.12), 42)')
  })

  it('compiles bar charts from bar children', () => {
    const video = createVideoFromMarkup(`
      <video>
        <scene>
          <barChart width="700" height="320" motion="growUp">
            <bar label="Input" value="80" color="theme.accent" />
            <bar label="Plan" value="64" color="#38bdf8" />
          </barChart>
        </scene>
      </video>
    `)

    const el = video.config.scenes[0].elements[0]
    expect(el.type).toBe('shape')
    expect(el.type === 'shape' ? el.shape.shapeType : undefined).toBe('barChart')
    expect(el.type === 'shape' ? el.shape.data : undefined).toHaveLength(2)
  })

  it('compiles D3 line and donut charts from VML', () => {
    const video = createVideoFromMarkup(`
      <video motionQuality="premium">
        <scene camera="slowPush" mood="editorial" transition="blurDissolve">
          <column>
            <lineChart width="700" height="300" curve="smooth">
              <series label="A" values="12,38,29,72" color="theme.accent" />
              <series label="B" values="20,26,48,88" color="#22c55e" />
            </lineChart>
            <donutChart size="280">
              <slice label="Design" value="45" color="theme.accent" />
              <slice label="Code" value="55" color="#38bdf8" />
            </donutChart>
          </column>
        </scene>
      </video>
    `)

    expect(video.config.motionQuality).toBe('premium')
    expect(video.config.scenes[0].camera).toBe('slowPush')
    expect(video.config.scenes[0].mood).toBe('editorial')
    expect(video.config.scenes[0].transition?.type).toBe('blurDissolve')
    const groupEl = video.config.scenes[0].elements[0]
    expect(groupEl.type).toBe('group')
    if (groupEl.type !== 'group') return
    expect(groupEl.children.some((child) => child.type === 'shape' && child.shape.shapeType === 'lineChart')).toBe(true)
    expect(groupEl.children.some((child) => child.type === 'shape' && child.shape.shapeType === 'donutChart')).toBe(true)
  })

  it('compiles flubber morph blobs and premium motion presets', () => {
    const video = createVideoFromMarkup(`
      <video>
        <scene>
          <morphBlob variant="soft" color="theme.accent" width="360" height="360" motion="driftIn" />
        </scene>
      </video>
    `)

    const el = video.config.scenes[0].elements[0]
    expect(el.type).toBe('shape')
    expect(el.type === 'shape' ? el.shape.shapeType : undefined).toBe('morphBlob')
    expect(el.type === 'shape' ? el.shape.paths?.length : 0).toBeGreaterThan(1)
    expect(el.entrance?.animation).toBe('slideUpBlur')
    expect(el.loop?.animation).toBe('float')
  })

  it('resolves theme color tokens for text and charts', () => {
    const video = createVideoFromMarkup(`
      <video theme="linear">
        <scene>
          <column>
            <text value="Theme text" color="theme.text" />
            <barChart>
              <bar label="Accent" value="42" color="theme.accent" />
            </barChart>
          </column>
        </scene>
      </video>
    `)

    const column = video.config.scenes[0].elements[0]
    expect(column.type).toBe('group')
    if (column.type !== 'group') return
    const textEl = column.children.find((child) => child.type === 'text')
    const chartEl = column.children.find((child) => child.type === 'shape')
    expect(textEl?.type === 'text' ? textEl.color : undefined).toBe('#f7f8f8')
    expect(chartEl?.type === 'shape' ? chartEl.shape.data?.[0]?.color : undefined).toBe('#5e6ad2')
  })

  it('detects velox markup', () => {
    expect(isVeloxMarkup('<video><scene><text value="Hi" /></scene></video>')).toBe(true)
    expect(isVeloxMarkup('createVideo({ scenes: [] })')).toBe(false)
  })

  it('rejects group sizing attributes', () => {
    expect(() => createVideoFromMarkup(`
      <video><scene><row width="500"><text value="Bad" /></row></scene></video>
    `)).toThrow(/row.*width\/height/i)
  })

  it('compiles rect stroke as an outline workaround', () => {
    const video = createVideoFromMarkup(`
      <video><scene><rect width="300" height="160" stroke="#fff" color="#111" /></scene></video>
    `)
    expect(video.config.scenes[0].elements[0].type).toBe('group')
  })

  it('rejects object-like placement strings', () => {
    expect(() => createVideoFromMarkup(`
      <video><scene><text value="Bad" placement="{ x: 0.5, y: 0.2 }" /></scene></video>
    `)).toThrow(/placement/i)
  })

  it('positions logo lockups through attributes, not array methods', () => {
    const video = createVideoFromMarkup(`
      <video><scene><logoLockup name="openai" label="OpenAI" placement="center" /></scene></video>
    `)
    expect(video.config.scenes[0].elements[0].type).toBe('group')
  })

  it('accepts common LLM markup quirks without losing children', () => {
    const video = createVideoFromMarkup(`\`\`\`xml
      <video size="9:16" fps="60" theme="obsidian" background="aurora:violet">
        <scene duration="20" background="mesh:neon">
          <center motion="cinematic">
            <text value="Engineering Decay" size="48" color="#fff" weight="600"/>
            <line length="420" color="#67e8f9" thickness="4" motion="drawIn" delay="0.5"/>
            <rect width="420" height="120" color="rgba(255,255,255,0.05)" radius="16" motion="pop"/>
            <logo name="openai" theme="light" size="96" motion="slideIn"/>
          </center>
        </scene>
      </video>
    \`\`\``)

    expect(video.config.scenes).toHaveLength(1)
    expect(video.config.scenes[0].elements[0].type).toBe('group')
    const groupElement = video.config.scenes[0].elements[0]
    expect(groupElement.type === 'group' ? groupElement.children.length : 0).toBe(1)
  })

  it('treats stack with gap as vertical flow to avoid accidental overlap', () => {
    const video = createVideoFromMarkup(`
      <video>
        <scene>
          <stack gap="12">
            <text value="A" />
            <text value="B" />
          </stack>
        </scene>
      </video>
    `)
    const el = video.config.scenes[0].elements[0]
    expect(el.type).toBe('group')
    expect(el.type === 'group' ? el.children[0]?.position?.type : undefined).toBe('absolute')
  })

  it('allows rect container markup and compiles it as a card stack', () => {
    const video = createVideoFromMarkup(`
      <video>
        <scene>
          <rect width="300" height="160" stroke="#fff" color="#111">
            <center><text value="Inside" /></center>
          </rect>
        </scene>
      </video>
    `)
    const el = video.config.scenes[0].elements[0]
    expect(el.type).toBe('group')
    expect(el.type === 'group' ? el.children.length : 0).toBe(2)
  })

  it('accepts VML generated with cards, layout, and charts', () => {
    const video = createVideoFromMarkup(`
      <video size="9:16" fps="60" theme="corporateBlue" background="grid(rgba(15,23,42,0.08), 36)">
        <scene duration="8" background="aurora:blue">
          <card width="680" height="520" placement="center">
            <column gap="28">
              <kicker color="theme.accent">REPORT</kicker>
              <text value="Motion-ready analytics" color="theme.text" size="52" />
              <barChart width="560" height="260">
                <bar label="A" value="52" color="theme.accent" />
                <bar label="B" value="83" color="#22c55e" />
              </barChart>
            </column>
          </card>
        </scene>
      </video>
    `)

    expect(video.config.scenes).toHaveLength(1)
    expect(video.config.scenes[0].elements[0].type).toBe('group')
  })

  it('compiles reel components, captions, placeholders, templates, and audio cues', () => {
    const video = createVideoFromMarkup(`
      <video size="portrait" fps="30" theme="obsidian" music="bg.mp3" musicVolume="0.35">
        <scene duration="6" template="topTextBottomVisual" transition="blurDissolve">
          <announcement slot="top" title="Ship faster" subtitle="Velox reels" badge="NEW" tone="neutral" motion="fade" />
          <asset slot="visual" name="phone-frame" motion="driftIn" />
          <captions text="Ship faster today" style="karaoke" slot="caption" />
          <stock slot="overlay" provider="wikipedia" query="OpenAI_logo" motion="fade" />
          <sfx name="pop" at="0.4" />
          <beat at="1.0" />
          <ranking title="Trending">
            <item>Agents</item>
            <item>Video</item>
          </ranking>
        </scene>
      </video>
    `)

    expect(video.config.scenes[0].elements.length).toBeGreaterThan(3)
    const stockSrc = (
      video.config.scenes[0].elements.find(
        (e) => e.type === 'image' && (e as { src?: string }).src?.startsWith('velox-stock:'),
      ) as { src?: string } | undefined
    )?.src
    expect(stockSrc).toContain('wikipedia')

    expect(video.config.audioPlan?.beats?.length).toBe(1)
    expect(video.config.audioPlan?.sfx?.length).toBe(1)
    expect(video.config.audio).toEqual(expect.objectContaining({ src: 'bg.mp3', volume: 0.35 }))

    const videoCards = createVideoFromMarkup(`
      <video><scene duration="5">
        <githubRepo owner="octocat" repo="Hello-World" />
        <npmPackage name="@velox-video/core" />
        <website url="https://example.com" />
      </scene></video>
    `)
    const imgs = videoCards.config.scenes[0].elements.filter((e) => e.type === 'image') as { src: string }[]
    expect(imgs.some((i) => i.src.startsWith('velox-card:github'))).toBe(true)
    expect(imgs.some((i) => i.src.startsWith('velox-card:npm'))).toBe(true)
    expect(imgs.some((i) => i.src.startsWith('velox-web:'))).toBe(true)
  })

  it('adds fade outs between delayed top-level sections in a long scene', () => {
    const video = createVideoFromMarkup(`
      <video>
        <scene duration="20">
          <center delay="0.3"><text value="One" /></center>
          <center delay="5"><text value="Two" /></center>
        </scene>
      </video>
    `)
    expect(video.config.scenes[0].elements[0].exit?.animation).toBe('fadeOut')
  })

  it('maps heroCinematic motion to maskRevealUp entrance', () => {
    const video = createVideoFromMarkup(`
      <video><scene duration="4" template="topTextBottomVisual">
        <announcement slot="top" title="Hero" motion="heroCinematic" />
      </scene></video>
    `)
    const top = video.config.scenes[0].elements.find((e) => e.type === 'group')
    expect(top?.entrance?.animation).toBe('maskRevealUp')
  })

  it('compiles wipe transition', () => {
    const video = createVideoFromMarkup(`
      <video><scene duration="4" transition="wipe" transitionDuration="0.5">
        <text value="A" />
      </scene><scene duration="4"><text value="B" /></scene></video>
    `)
    expect(video.config.scenes[0].transition?.type).toBe('wipe')
  })

  it('defaults motionQuality to premium for reel template videos', () => {
    const video = createVideoFromMarkup(`
      <video size="portrait">
        <scene duration="4" template="topTextBottomVisual">
          <announcement slot="top" title="Test" />
        </scene>
      </video>
    `)
    expect(video.config.motionQuality).toBe('premium')
  })

  it('locks apple theme backgrounds and canvas from aesthetic pack', () => {
    const video = createVideoFromMarkup(`
      <video theme="apple">
        <scene duration="4"><hero title="Hello" /></scene>
        <scene duration="4" background="theme.canvas"><text value="Alt" /></scene>
      </video>
    `)
    expect(video.config.theme.background).toBe('#000000')
    expect(video.config.background).toBe('#000000')
    expect(video.config.scenes[0].background).toBe('#000000')
    expect(video.config.scenes[1].background).toBe('#000000')
  })

  it('resolves notion and dell-1996 design themes', () => {
    for (const id of ['notion', 'dell-1996'] as const) {
      const video = createVideoFromMarkup(`
        <video theme="${id}"><scene duration="3"><announcement title="Test" /></scene></video>
      `)
      expect(video.config.theme.background).toBeTruthy()
      expect(video.config.scenes[0].background).toBeTruthy()
    }
  })

  it('applies zero vignette from aesthetic even with editorial mood', () => {
    const video = createVideoFromMarkup(`
      <video theme="dell-1996">
        <scene duration="4" mood="editorial"><text value="Clean white scene" /></scene>
      </video>
    `)
    expect(video.config.scenes[0].overlay).toEqual({ vignetteOpacity: 0, grainOpacity: 0 })
  })
})

