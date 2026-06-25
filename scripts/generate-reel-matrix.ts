#!/usr/bin/env tsx
/** Generate 9 VML files (3 topics × 3 themes) into reels/matrix/ */
import fs from 'fs'
import path from 'path'
import { REEL_TOPICS, REEL_THEMES, transitionForTheme, type ReelTopic, type ReelThemeId } from './reel-matrix/topics'

const OUT = path.join(__dirname, '..', 'reels', 'matrix')

function buildVml(topic: ReelTopic, theme: ReelThemeId): string {
  const t = transitionForTheme(theme)
  const td = '0.25'
  const wordPop = topic.features.items.map((i) => i.split(' ')[0]).join(' ')
  return `<video size="portrait" fps="30" theme="${theme}" motionQuality="premium">
  <!-- ${topic.id} × ${theme} -->

  <scene duration="6.0" template="centerCard" camera="slowPush" mood="neutral" transition="${t}" transitionDuration="${td}">
    <hero slot="center" kicker="${topic.hero.kicker}" title="${topic.hero.title}" subtitle="${topic.hero.subtitle}" motion="heroCinematic" />
    <captions slot="caption" text="${topic.hero.caption}" style="plain" start="3.0" />
  </scene>

  <scene duration="6.5" template="topTextBottomVisual" camera="slowPush" mood="neutral" transition="${t}" transitionDuration="${td}" staggerStep="0.12">
    <announcement slot="top" title="${topic.announcement.title}" subtitle="${topic.announcement.subtitle}" badge="${topic.announcement.badge}" tone="neutral" motion="heroCinematic" />
    <stock slot="visual" query="${topic.stockQuery}" provider="generated" width="480" height="640" radius="0" motion="driftIn" delay="0.25" />
    <captions slot="caption" text="${topic.announcement.caption}" style="pill" start="0.5" />
  </scene>

  <scene duration="6.5" template="centerCard" camera="slowPush" mood="neutral" transition="${t}" transitionDuration="${td}">
    <problemSolution slot="center" problem="${topic.problem.problem}" solution="${topic.problem.solution}" motion="softReveal" />
    <captions slot="caption" text="${topic.problem.caption}" style="highlightKeywords" start="0.6" />
  </scene>

  <scene duration="6.8" template="threeBeatReveal" camera="parallaxDrift" mood="neutral" transition="${t}" transitionDuration="${td}" staggerStep="0.14">
    <featureReveal slot="center" title="${topic.features.title}" caption="${topic.features.caption}" motion="premiumSlide">
      <item>${topic.features.items[0]}</item>
      <item>${topic.features.items[1]}</item>
      <item>${topic.features.items[2]}</item>
    </featureReveal>
    <captions slot="caption" text="${wordPop}" style="wordPop" start="0.9" />
  </scene>

  <scene duration="7.0" template="centerCard" camera="slowPush" mood="neutral" transition="${t}" transitionDuration="${td}">
    <column slot="center" gap="24">
      <kicker>${topic.chart.kicker}</kicker>
      <text value="${topic.chart.headline}" size="40" weight="900" color="theme.text" wrap="760" />
      <lineChart width="760" height="300" curve="smooth" motion="drawIn">
        <series label="Track A" values="12,22,38,58,82" color="theme.accent" />
        <series label="Track B" values="6,14,32,64,96" color="theme.text" />
      </lineChart>
    </column>
    <captions slot="caption" text="${topic.chart.caption}" style="pill" start="0.4" />
  </scene>

  <scene duration="6.0" template="centerCard" camera="handheld" mood="neutral" transition="${t}" transitionDuration="${td}">
    <quoteCard slot="center" quote="${topic.quote.text}" motion="softReveal" />
    <captions slot="caption" text="${topic.quote.caption}" style="plain" />
  </scene>

  <scene duration="6.5" template="splitLeftRight" camera="parallaxDrift" mood="neutral" transition="${t}" transitionDuration="${td}" staggerStep="0.12">
    <launchCard slot="left" title="${topic.launch.title}" subtitle="${topic.launch.subtitle}" cta="${topic.launch.cta}" proof="${topic.launch.proof}" tone="neutral" motion="premiumSlide" />
    <stock slot="right" query="${topic.stockQueryAlt}" provider="generated" width="440" height="600" radius="0" motion="driftIn" delay="0.2" />
    <captions slot="caption" text="${topic.launch.caption}" style="wordPop" start="0.7" />
  </scene>

  <scene duration="6.5" template="centerCard" camera="slowPush" mood="neutral" transition="${t}" transitionDuration="${td}">
    <ranking slot="center" title="${topic.ranking.title}" motion="premiumSlide">
      <item>${topic.ranking.items[0]}</item>
      <item>${topic.ranking.items[1]}</item>
      <item>${topic.ranking.items[2]}</item>
      <item>${topic.ranking.items[3]}</item>
    </ranking>
    <captions slot="caption" text="${topic.ranking.caption}" style="highlightKeywords" />
  </scene>

  <scene duration="6.5" template="centerCard" camera="kenBurns" mood="neutral" transition="${t}" transitionDuration="${td}">
    <column slot="center" gap="28">
      <metricRow gap="24">
        <metric value="10×" label="Faster iteration" motion="magneticPop" delay="0.1" />
        <metric value="30fps" label="Native export" motion="magneticPop" delay="0.25" />
      </metricRow>
      <countdown value="${topic.metrics.countdown}" label="${topic.metrics.countdownLabel}" motion="heroCinematic" delay="0.4" />
    </column>
    <captions slot="caption" text="${topic.metrics.caption}" style="pill" start="0.5" />
  </scene>

  <scene duration="6.75" template="centerCard" camera="slowPush" mood="neutral">
    <finalCTA slot="center" title="${topic.cta.title}" subtitle="${topic.cta.subtitle}" cta="${topic.cta.button}" motion="magneticPop" />
    <icon slot="overlay" name="github" size="72" motion="float" delay="0.5" />
    <captions slot="caption" text="${topic.cta.caption}" style="plain" />
    <sfx name="whoosh" at="0.4" volume="0.7" />
    <beat at="1.2" />
  </scene>
</video>
`
}

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(path.join(OUT, 'out'), { recursive: true })

const manifest: { vml: string; mp4: string; topic: string; theme: string }[] = []

for (const topicId of Object.keys(REEL_TOPICS) as (keyof typeof REEL_TOPICS)[]) {
  const topic = REEL_TOPICS[topicId]
  for (const theme of REEL_THEMES) {
    const base = `${topicId}-${theme}`
    const vmlPath = path.join(OUT, `${base}.vml`)
    fs.writeFileSync(vmlPath, buildVml(topic, theme), 'utf8')
    manifest.push({
      vml: vmlPath,
      mp4: path.join(OUT, 'out', `${base}.mp4`),
      topic: topicId,
      theme,
    })
    console.log(`wrote ${base}.vml`)
  }
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`\n9 VML files → ${OUT}`)
