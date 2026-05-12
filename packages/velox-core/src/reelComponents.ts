/**
 * High-level reel / announcement components — semantic props only.
 */

import { group } from './elements/Group'
import { shape } from './elements/Shape'
import { text } from './elements/Text'
import { layout } from './layout'
import { typography, cards, motion } from './presets'
import type { Element } from './core/Element'
import type { ElementConfig } from './types'

type AnyElement = Element<ElementConfig>

function toneColors(tone?: string): { accent: string; fill: string } {
  switch (tone) {
    case 'danger':
      return { accent: '#f87171', fill: 'rgba(248,113,113,0.12)' }
    case 'success':
      return { accent: '#4ade80', fill: 'rgba(74,222,128,0.12)' }
    case 'warning':
      return { accent: '#fbbf24', fill: 'rgba(251,191,36,0.14)' }
    default:
      return { accent: '#67e8f9', fill: 'rgba(103,232,249,0.12)' }
  }
}

/** Breaking-news style announcement */
export function reelAnnouncement(opts: {
  title: string
  subtitle?: string
  badge?: string
  tone?: string
}): AnyElement {
  const { accent } = toneColors(opts.tone)
  const inner: AnyElement[] = []
  if (opts.badge) inner.push(typography.kicker(opts.badge, accent))
  inner.push(
    text(opts.title).size(72).weight(900).lineHeight(1.05).color('#ffffff').wrap(820).maxHeight(260),
  )
  if (opts.subtitle) {
    inner.push(
      text(opts.subtitle).size(28).lineHeight(1.35).color('rgba(255,255,255,0.75)').wrap(760).maxHeight(160),
    )
  }
  return cards.glass(inner, { width: 900, height: 400, radius: 36 })
}

export function reelLaunchCard(opts: {
  title: string
  subtitle?: string
  cta?: string
  proof?: string
  tone?: string
}): AnyElement {
  const { accent } = toneColors(opts.tone)
  const inner: AnyElement[] = [
    text(opts.title).size(62).weight(900).color('#fff').wrap(720).maxHeight(200),
  ]
  if (opts.subtitle) inner.push(text(opts.subtitle).size(26).color('rgba(255,255,255,0.72)').wrap(700))
  if (opts.proof) inner.push(text(opts.proof).size(22).color('rgba(255,255,255,0.55)').wrap(680))
  if (opts.cta)
    inner.push(text(opts.cta).size(28).weight(800).uppercase().letterSpacing(3).color(accent))

  return cards.glass(inner, { width: 860, height: 420, radius: 38 })
}

export function reelBreakingNews(opts: {
  headline: string
  ticker?: string
  tone?: string
}): AnyElement {
  const { accent } = toneColors(opts.tone)
  const rows: AnyElement[] = [
    typography.kicker('BREAKING', '#fca5a5'),
    text(opts.headline).size(68).weight(900).color('#fff').wrap(840).maxHeight(280),
  ]
  if (opts.ticker) rows.push(text(opts.ticker).size(26).color(accent).wrap(760))

  return cards.glass(rows, {
    width: 900,
    height: opts.ticker ? 420 : 360,
    radius: 28,
  })
}

export function reelFeatureReveal(opts: {
  title: string
  bullets?: string[]
  caption?: string
}): AnyElement {
  const list = opts.bullets?.length
    ? text.list(opts.bullets).size(30).weight(600).bullet('›').gap(18).wrap(760).color('#e2e8f0')
    : undefined

  const col = layout.column(
    [
      text(opts.title).size(62).weight(900).color('#fff').wrap(780).maxHeight(200),
      ...(list ? [list] : []),
      ...(opts.caption
        ? [text(opts.caption).size(22).color('rgba(226,232,240,0.65)').wrap(720)]
        : []),
    ],
    { gap: 26, align: 'center' },
  )

  return cards.glass([col], {
    width: 900,
    height: Math.min(560, 200 + (opts.bullets?.length ?? 0) * 48 + 80),
    radius: 36,
  })
}

export function reelProblemSolution(opts: {
  problem: string
  solution: string
}): AnyElement {
  const problemCard = cards.glass(
    [
      typography.kicker('Problem', '#f97316'),
      text(opts.problem).size(32).weight(700).wrap(390).color('#fff'),
    ],
    { width: 460, height: 320 },
  )

  const solutionCard = cards.glass(
    [
      typography.kicker('Solution', '#34d399'),
      text(opts.solution).size(32).weight(700).wrap(390).color('#fff'),
    ],
    { width: 460, height: 320 },
  )

  return layout.row([problemCard, solutionCard], { gap: 36, align: 'center' })
}

export function reelBeforeAfter(opts: { before: string; after: string }): AnyElement {
  return reelProblemSolution({ problem: opts.before, solution: opts.after })
}

export function reelQuoteCard(opts: { quote: string; author?: string; role?: string }): AnyElement {
  const subtitle = opts.author
    ? `${opts.author}${opts.role ? ` — ${opts.role}` : ''}`
    : undefined
  return cards.glass(
    [
      text(`“${opts.quote}”`).size(36).weight(600).lineHeight(1.35).color('#fff').wrap(760).maxHeight(320),
      ...(subtitle
        ? [text(subtitle).size(22).color('rgba(255,255,255,0.6)').wrap(700)]
        : []),
    ],
    { width: 860, height: 380, radius: 40 },
  )
}

export function reelRanking(opts: { title?: string; items: string[] }): AnyElement {
  const rows = opts.items.map((label, i) =>
    layout.row(
      [
        text(`#${i + 1}`).size(28).weight(900).color('#67e8f9'),
        text(label).size(30).weight(700).color('#fff').wrap(620),
      ],
      { gap: 20, align: 'center' },
    ),
  )
  const parts: AnyElement[] = []
  if (opts.title) parts.push(text(opts.title).size(44).weight(900).color('#fff').wrap(800))
  parts.push(layout.column(rows, { gap: 18, align: 'center' }))
  return cards.glass(parts, {
    width: 900,
    height: Math.min(640, 120 + opts.items.length * 66),
    radius: 36,
  })
}

export function reelCountdown(opts: {
  value: number | string
  label?: string
}): AnyElement {
  return cards.glass(
    [
      text(String(opts.value)).size(120).weight(900).color('#fff'),
      ...(opts.label ? [text(opts.label).size(28).color('rgba(255,255,255,0.7)').wrap(720)] : []),
    ],
    { width: 760, height: 320 },
  )
}

export function reelFinalCTA(opts: {
  title: string
  subtitle?: string
  cta: string
}): AnyElement {
  const stack = group([
    shape.rect(620, 64).color('rgba(34,211,238,0.95)').radius(18),
    text(opts.cta).size(26).weight(900).uppercase().letterSpacing(2).color('#0f172a'),
  ]).stack()

  const inner = layout.column(
    [
      text(opts.title).size(54).weight(900).wrap(760).color('#fff'),
      ...(opts.subtitle
        ? [text(opts.subtitle).size(26).color('rgba(255,255,255,0.7)').wrap(720)]
        : []),
      stack,
    ],
    { gap: 20, align: 'center' },
  )

  return motion.magneticPop(cards.glass([inner], { width: 860, height: 380, radius: 36 }))
}
