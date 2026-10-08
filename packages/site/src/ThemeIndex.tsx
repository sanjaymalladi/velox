import { categoryLabel } from './themesManifest.shared'

type ThemeRow = {
  id: string
  category: string
  colors: { canvas: string; accent: string; text: string }
}

const CATEGORY_ORDER = ['brand', 'frame', 'motion', 'builtin', 'legacy']

export function ThemeIndex({ themes }: { themes: ThemeRow[] }) {
  const groups = new Map<string, ThemeRow[]>()
  for (const theme of themes) {
    const list = groups.get(theme.category) ?? []
    list.push(theme)
    groups.set(theme.category, list)
  }

  const categories = [
    ...CATEGORY_ORDER.filter((id) => groups.has(id)),
    ...[...groups.keys()].filter((id) => !CATEGORY_ORDER.includes(id)),
  ]

  return (
    <div className="theme-index">
      <p className="theme-index-note">
        These are the values for <code>theme=&quot;…&quot;</code>. Each strip is canvas, accent, and text.
        Preview one in the studio with <code>velox preview reel.vml</code>.
      </p>
      {categories.map((category) => (
        <section key={category} className="theme-index-group">
          <h2>{categoryLabel(category)}</h2>
          <ul>
            {(groups.get(category) ?? []).map((theme) => (
              <li key={theme.id}>
                <span className="theme-palette" aria-hidden="true">
                  <span style={{ background: theme.colors.canvas }} />
                  <span style={{ background: theme.colors.accent }} />
                  <span style={{ background: theme.colors.text }} />
                </span>
                <code>{theme.id}</code>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
