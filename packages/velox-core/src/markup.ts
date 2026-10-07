export interface MarkupNode {
  tag: string
  attrs: Record<string, string>
  attributeLocations: Record<string, MarkupLocation>
  children: MarkupNode[]
  text: string
  location: MarkupLocation
}

export interface MarkupLocation {
  offset: number
  line: number
  column: number
}

function locationAt(input: string, offset: number): MarkupLocation {
  const before = input.slice(0, offset)
  const lines = before.split('\n')
  return { offset, line: lines.length, column: lines[lines.length - 1].length + 1 }
}

function syntaxError(input: string, offset: number, message: string): Error {
  const loc = locationAt(input, offset)
  return new Error(`[velox markup] ${message} (line ${loc.line}, column ${loc.column})`)
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
  'logo', 'logoLockup', 'image', 'stock', 'stockVideo',
  'rect', 'circle', 'line', 'progress', 'metric', 'metricRow', 'glassList', 'card',
  'barChart', 'bar', 'lineChart', 'series', 'donutChart', 'slice', 'morphBlob',
  // reels / production
  'announcement', 'launchCard', 'breakingNews', 'featureReveal', 'problemSolution',
  'beforeAfter', 'quoteCard', 'ranking', 'countdown', 'finalCTA',
  'asset', 'assetPack', 'icon',
  'captions', 'caption',
  'website', 'githubRepo', 'npmPackage', 'brandCard',
  'audio', 'sfx', 'beat',
  'fx',
])

const voidTags = new Set([
  'hero', 'logo', 'logoLockup', 'image', 'stock', 'stockVideo',
  'circle', 'line', 'progress', 'metric', 'bar', 'series', 'slice', 'morphBlob',
  'announcement', 'launchCard', 'breakingNews', 'problemSolution',
  'beforeAfter', 'quoteCard', 'countdown', 'finalCTA',
  'asset', 'assetPack', 'icon',
  'caption',
  'website', 'githubRepo', 'npmPackage', 'brandCard',
  'audio', 'sfx', 'beat',
])

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

function parseAttrs(source: string, tag: string, input: string, sourceOffset: number): { attrs: Record<string, string>; locations: Record<string, MarkupLocation> } {
  const attrs: Record<string, string> = {}
  const locations: Record<string, MarkupLocation> = {}
  const attrRegex = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = attrRegex.exec(source)) !== null) {
    const [, key, value] = match
    if (Object.hasOwn(attrs, key)) {
      throw syntaxError(input, sourceOffset + match.index, `Duplicate attribute "${key}" on <${tag}>.`)
    }
    attrs[key] = decodeEntities(value)
    locations[key] = locationAt(input, sourceOffset + match.index)
  }
  const leftover = source.replace(attrRegex, '').trim()
  if (leftover.length > 0) throw syntaxError(input, sourceOffset, `<${tag}> has invalid attributes: ${leftover}. Use double-quoted attributes like key="value".`)
  return { attrs, locations }
}

export function parseVeloxMarkup(markup: string): MarkupNode {
  const input = normalizeMarkup(markup)
  if (!input.startsWith('<video')) fail('Markup must start with <video>.')

  const root: MarkupNode = { tag: '__root__', attrs: {}, attributeLocations: {}, children: [], text: '', location: locationAt(input, 0) }
  const stack: MarkupNode[] = [root]
  const tokenRegex = /<[^>]+>|[^<]+/g
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(input)) !== null) {
    const token = match[0]
    const tokenOffset = match.index
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
      if (!node || node.tag !== tag) throw syntaxError(input, tokenOffset, `Unexpected closing tag </${tag}>.`)
      continue
    }

    const selfClosing = token.endsWith('/>')
    const inner = token.slice(1, selfClosing ? -2 : -1).trim()
    const space = inner.search(/\s/)
    const tag = space === -1 ? inner : inner.slice(0, space)
    const attrSource = space === -1 ? '' : inner.slice(space + 1)
    const attrOffset = space === -1 ? tokenOffset + 1 + inner.length : tokenOffset + 1 + space + 1

    if (!allowedTags.has(tag)) throw syntaxError(input, tokenOffset, `Unsupported tag <${tag}>.`)
    if (voidTags.has(tag) && !selfClosing && tag !== 'card')
      throw syntaxError(input, tokenOffset, `<${tag}> must be self-closing.`)

    let parsedAttrs: { attrs: Record<string, string>; locations: Record<string, MarkupLocation> }
    try {
      parsedAttrs = parseAttrs(attrSource, tag, input, attrOffset)
    } catch (err) {
      if (err instanceof Error && /\(line \d+, column \d+\)$/.test(err.message)) throw err
      throw syntaxError(input, tokenOffset, err instanceof Error ? err.message : String(err))
    }
    const node: MarkupNode = { tag, attrs: parsedAttrs.attrs, attributeLocations: parsedAttrs.locations, children: [], text: '', location: locationAt(input, tokenOffset) }
    current.children.push(node)
    if (!selfClosing) stack.push(node)
  }

  if (stack.length !== 1) {
    const open = stack[stack.length - 1]
    throw syntaxError(input, open.location.offset, `Unclosed tag <${open.tag}>.`)
  }
  if (root.children.length !== 1 || root.children[0].tag !== 'video') throw syntaxError(input, 0, 'Markup must contain exactly one <video> root.')
  return root.children[0]
}

export function isVeloxMarkup(value: string): boolean {
  return normalizeMarkup(value).startsWith('<video')
}

