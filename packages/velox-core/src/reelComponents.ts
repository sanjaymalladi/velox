/**
 * High-level reel / announcement components — semantic props, themed via VeloxAesthetic.
 */

import { group } from './elements/Group'
import { shape } from './elements/Shape'
import { text } from './elements/Text'
import { layout } from './layout'
import { themedCards, themedTypography } from './presets'
import { motion } from './presets'
import type { VeloxAesthetic } from './aesthetics/types'
import type { Element } from './core/Element'
import type { ElementConfig } from './types'

type AnyElement = Element<ElementConfig>

function typeText(aesthetic: VeloxAesthetic, content: string, role: keyof VeloxAesthetic['typography']) {
  const s = aesthetic.typography[role]
  return text(content)
    .size(s.fontSize)
    .weight(s.fontWeight)
    .letterSpacing(s.letterSpacing)
    .lineHeight(s.lineHeight)
    .font(s.fontFamily)
    .color(aesthetic.theme.text)
}

function toneColors(aesthetic: VeloxAesthetic, tone?: string): { accent: string; fill: string } {
  switch (tone) {
    case 'danger':
      return { accent: '#f87171', fill: 'rgba(248,113,113,0.12)' }
    case 'success':
      return { accent: '#4ade80', fill: 'rgba(74,222,128,0.12)' }
    case 'warning':
      return { accent: '#fbbf24', fill: 'rgba(251,191,36,0.14)' }
    default:
      return { accent: aesthetic.theme.accent ?? aesthetic.theme.primary, fill: 'rgba(255,255,255,0.08)' }
  }
}

export function reelAnnouncement(
  aesthetic: VeloxAesthetic,
  opts: { title: string; subtitle?: string; badge?: string; tone?: string },
): AnyElement {
  const { accent } = toneColors(aesthetic, opts.tone)
  const typo = themedTypography(aesthetic)
  const cards = themedCards(aesthetic)
  const inner: AnyElement[] = []
  if (opts.badge) inner.push(typo.kicker(opts.badge, accent))
  inner.push(
    typeText(aesthetic, opts.title, 'title').wrap(820).maxHeight(260).align('center'),
  )
  if (opts.subtitle) {
    inner.push(
      typeText(aesthetic, opts.subtitle, 'subtitle')
        .color(aesthetic.theme.muted)
        .wrap(760)
        .maxHeight(160)
        .align('center'),
    )
  }
  return cards.surface(
    [layout.column(inner, { gap: 16, align: 'center' })],
    { width: 980, height: 420, radius: aesthetic.surfaces.card.radius || 36 },
  )
}

export function reelLaunchCard(
  aesthetic: VeloxAesthetic,
  opts: { title: string; subtitle?: string; cta?: string; proof?: string; tone?: string },
): AnyElement {
  const { accent } = toneColors(aesthetic, opts.tone)
  const cards = themedCards(aesthetic)
  const inner: AnyElement[] = [typeText(aesthetic, opts.title, 'title').wrap(720).maxHeight(200)]
  if (opts.subtitle) inner.push(typeText(aesthetic, opts.subtitle, 'subtitle').color(aesthetic.theme.muted).wrap(700))
  if (opts.proof) inner.push(typeText(aesthetic, opts.proof, 'body').color(aesthetic.theme.muted).wrap(680))
  if (opts.cta) {
    inner.push(
      text(opts.cta)
        .size(aesthetic.typography.kicker.fontSize + 6)
        .weight(700)
        .uppercase()
        .letterSpacing(4)
        .font(aesthetic.typography.kicker.fontFamily)
        .color(accent),
    )
  }
  return cards.surface(inner, { width: 860, height: 420, radius: aesthetic.surfaces.card.radius || 38 })
}

export function reelBreakingNews(
  aesthetic: VeloxAesthetic,
  opts: { headline: string; ticker?: string; tone?: string },
): AnyElement {
  const { accent } = toneColors(aesthetic, opts.tone)
  const typo = themedTypography(aesthetic)
  const cards = themedCards(aesthetic)
  const rows: AnyElement[] = [
    typo.kicker('BREAKING', '#fca5a5'),
    typeText(aesthetic, opts.headline, 'title').wrap(840).maxHeight(280),
  ]
  if (opts.ticker) rows.push(typeText(aesthetic, opts.ticker, 'body').color(accent).wrap(760))
  return cards.surface(rows, { width: 900, height: opts.ticker ? 420 : 360, radius: aesthetic.surfaces.card.radius || 28 })
}

export function reelFeatureReveal(
  aesthetic: VeloxAesthetic,
  opts: { title: string; bullets?: string[]; caption?: string },
): AnyElement {
  const cards = themedCards(aesthetic)
  const bulletCount = opts.bullets?.length ?? 0
  const list = bulletCount
    ? text
        .list(opts.bullets!)
        .size(aesthetic.typography.body.fontSize)
        .weight(aesthetic.typography.body.fontWeight)
        .font(aesthetic.typography.body.fontFamily)
        .bullet('›')
        .gap(20)
        .wrap(720)
        .color(aesthetic.theme.text)
    : undefined

  const col = layout.column(
    [
      typeText(aesthetic, opts.title, 'title').wrap(780).maxHeight(180),
      ...(opts.caption
        ? [
            typeText(aesthetic, opts.caption, 'subtitle')
              .color(aesthetic.theme.muted)
              .wrap(700)
              .maxHeight(80),
          ]
        : []),
      ...(list ? [list] : []),
    ],
    { gap: 32, align: 'center' },
  )

  const listHeight = bulletCount * 56
  const captionHeight = opts.caption ? 72 : 0

  return cards.surface([col], {
    width: 900,
    height: Math.min(720, 140 + captionHeight + listHeight + 80),
    radius: aesthetic.surfaces.card.radius || 36,
  })
}

export function reelProblemSolution(
  aesthetic: VeloxAesthetic,
  opts: { problem: string; solution: string },
): AnyElement {
  const cards = themedCards(aesthetic)
  const typo = themedTypography(aesthetic)
  const cardW = 860
  const textW = cardW - 96
  const body = (content: string) =>
    typeText(aesthetic, content, 'body').align('center').wrap(textW).maxHeight(150)
  const section = (label: string, content: string, accent: string) =>
    layout.column(
      [typo.kicker(label, accent), body(content)],
      { gap: 14, align: 'center' },
    )
  return cards.surface(
    [
      layout.column(
        [
          section('Problem', opts.problem, aesthetic.surfaces.button.fill),
          section('Solution', opts.solution, aesthetic.theme.accent ?? '#34d399'),
        ],
        { gap: 32, align: 'center' },
      ),
    ],
    { width: cardW, height: 620 },
  )
}

export function reelBeforeAfter(aesthetic: VeloxAesthetic, opts: { before: string; after: string }): AnyElement {
  return reelProblemSolution(aesthetic, { problem: opts.before, solution: opts.after })
}

export function reelQuoteCard(
  aesthetic: VeloxAesthetic,
  opts: { quote: string; author?: string; role?: string },
): AnyElement {
  const cards = themedCards(aesthetic)
  const subtitle = opts.author?.trim()
    ? `${opts.author}${opts.role?.trim() ? ` — ${opts.role}` : ''}`
    : opts.role?.trim() || undefined
  return cards.surface(
    [
      typeText(aesthetic, `“${opts.quote}”`, 'body').lineHeight(1.35).wrap(760).maxHeight(320).align('center'),
      ...(subtitle
        ? [typeText(aesthetic, subtitle, 'caption').color(aesthetic.theme.muted).wrap(700)]
        : []),
    ],
    { width: 860, height: 380, radius: aesthetic.surfaces.card.radius || 40 },
  )
}

export function reelRanking(aesthetic: VeloxAesthetic, opts: { title?: string; items: string[] }): AnyElement {
  const cards = themedCards(aesthetic)
  const innerW = 780
  const rows = opts.items.map((label, i) =>
    layout.row(
      [
        text(`#${i + 1}`)
          .size(aesthetic.typography.kicker.fontSize + 10)
          .weight(900)
          .font(primaryFontStack(aesthetic.typography.kicker.fontFamily))
          .color(aesthetic.theme.accent ?? aesthetic.theme.primary),
        typeText(aesthetic, label, 'body')
          .weight(600)
          .align('left')
          .wrap(innerW - 100)
          .maxHeight(80),
      ],
      { gap: 12, align: 'start' },
    ),
  )
  const parts: AnyElement[] = []
  if (opts.title) {
    parts.push(
      typeText(aesthetic, opts.title, 'title')
        .wrap(innerW)
        .align('center'),
    )
  }
  parts.push(layout.column(rows, { gap: 16, align: 'center' }))
  return cards.surface([layout.column(parts, { gap: 22, align: 'center' })], {
    width: 900,
    height: Math.min(720, 130 + opts.items.length * 96),
    radius: aesthetic.surfaces.card.radius || 36,
  })
}

function primaryFontStack(family: string): string {
  return family.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? family
}

export function reelCountdown(
  aesthetic: VeloxAesthetic,
  opts: { value: number | string; label?: string },
): AnyElement {
  const cards = themedCards(aesthetic)
  return cards.surface(
    [
      typeText(aesthetic, String(opts.value), 'display'),
      ...(opts.label
        ? [typeText(aesthetic, opts.label, 'subtitle').color(aesthetic.theme.muted).wrap(720)]
        : []),
    ],
    { width: 760, height: 320 },
  )
}

export function reelFinalCTA(
  aesthetic: VeloxAesthetic,
  opts: { title: string; subtitle?: string; cta: string },
): AnyElement {
  const btn = aesthetic.surfaces.button
  const stack = group([
    shape.rect(620, 64).color(btn.fill).radius(btn.radius),
    text(opts.cta)
      .size(aesthetic.typography.kicker.fontSize + 8)
      .weight(700)
      .uppercase()
      .letterSpacing(2)
      .font(aesthetic.typography.kicker.fontFamily)
      .color(btn.text),
  ]).stack()

  const cards = themedCards(aesthetic)
  const inner = layout.column(
    [
      typeText(aesthetic, opts.title, 'title').wrap(760),
      ...(opts.subtitle
        ? [typeText(aesthetic, opts.subtitle, 'subtitle').color(aesthetic.theme.muted).wrap(720)]
        : []),
      stack,
    ],
    { gap: 20, align: 'center' },
  )

  return motion.magneticPop(
    cards.surface([inner], { width: 860, height: 380, radius: aesthetic.surfaces.card.radius || 36 }),
  )
}
