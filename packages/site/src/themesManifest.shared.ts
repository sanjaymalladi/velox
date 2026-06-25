export type ThemeEntry = {
  id: string
  name: string
  description: string
  category: string
  preview: string
  colors: { canvas: string; accent: string; text: string }
}

const CATEGORY_LABEL: Record<string, string> = {
  brand: 'Brand',
  frame: 'Frame',
  motion: 'Motion',
  builtin: 'Built-in',
  legacy: 'Legacy',
}

export function categoryLabel(category: string) {
  return CATEGORY_LABEL[category] ?? category
}
