export interface MarkupNode {
  tag: string
  attrs: Record<string, string>
  children: MarkupNode[]
  text: string
}

function normalizeMarkup(markup: string): string {
  const trimmed = markup.trim()
  const fenced = trimmed.match(/^```(?:xml)?\s*([\s\S]*?)\s*```$/i)
  return (fenced ? fenced[1] : trimmed).trim()
}

const allowedTags = new Set([
  'video', 'scene',
  'center', 'row', 'column', 'stack',
  'text', 'kicker', 'hero', 'list', 'item',
  'logo', 'logoLockup', 'image', 'stock',
  'rect', 'circle', 'line', 'progress', 'metric', 'metricRow', 'glassList', 'card',
  'barChart', 'bar', 'lineChart', 'series', 'donutChart', 'slice', 'morphBlob',
])

const voidTags = new Set(['hero', 'logo', 'logoLockup', 'image', 'stock', 'circle', 'line', 'progress', 'metric', 'bar', 'series', 'slice', 'morphBlob'])

function fail(message: string): never {
  throw new Error(`[velox markup] ${message}`)
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function parseAttrs(source: string, tag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrRegex = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g
  let consumed = ''
  let match: RegExpExecArray | null
  while ((match = attrRegex.exec(source)) !== null) {
    const [, key, value] = match
    attrs[key] = decodeEntities(value)
    consumed += match[0]
  }
  const leftover = source.replace(attrRegex, '').trim()
  if (leftover.length > 0) fail(`<${tag}> has invalid attributes: ${leftover}. Use double-quoted attributes like key="value".`)
  return attrs
}

export function parseVeloxMarkup(markup: string): MarkupNode {
  const input = normalizeMarkup(markup)
  if (!input.startsWith('<video')) fail('Markup must start with <video>.')

  const root: MarkupNode = { tag: '__root__', attrs: {}, children: [], text: '' }
  const stack: MarkupNode[] = [root]
  const tokenRegex = /<[^>]+>|[^<]+/g
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(input)) !== null) {
    const token = match[0]
    const current = stack[stack.length - 1]

    if (!token.startsWith('<')) {
      const text = decodeEntities(token).replace(/\s+/g, ' ').trim()
      if (text) current.text += (current.text ? ' ' : '') + text
      continue
    }

    if (token.startsWith('<!--')) continue
    if (token.startsWith('</')) {
      const tag = token.slice(2, -1).trim()
      const node = stack.pop()
      if (!node || node.tag !== tag) fail(`Unexpected closing tag </${tag}>.`)
      continue
    }

    const selfClosing = token.endsWith('/>')
    const inner = token.slice(1, selfClosing ? -2 : -1).trim()
    const space = inner.search(/\s/)
    const tag = space === -1 ? inner : inner.slice(0, space)
    const attrSource = space === -1 ? '' : inner.slice(space + 1)

    if (!allowedTags.has(tag)) fail(`Unsupported tag <${tag}>.`)
    if (voidTags.has(tag) && !selfClosing && tag !== 'card') fail(`<${tag}> must be self-closing.`)

    const node: MarkupNode = { tag, attrs: parseAttrs(attrSource, tag), children: [], text: '' }
    current.children.push(node)
    if (!selfClosing) stack.push(node)
  }

  if (stack.length !== 1) fail(`Unclosed tag <${stack[stack.length - 1].tag}>.`)
  if (root.children.length !== 1 || root.children[0].tag !== 'video') fail('Markup must contain exactly one <video> root.')
  return root.children[0]
}

export function isVeloxMarkup(value: string): boolean {
  return normalizeMarkup(value).startsWith('<video')
}

