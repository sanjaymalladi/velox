import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { parseDesignMd } from './parseDesignMd'
import { buildAestheticFromParsed, buildGenericAesthetic } from './buildFromParsed'
import { parsedDesignSources } from './parsed'

const SOURCES = path.join(__dirname, '..', '..', 'aesthetics', 'sources')

describe('parseDesignMd', () => {
  it('parses apple, notion, and dell-1996 DESIGN.md sources', () => {
    for (const id of ['apple', 'notion', 'dell-1996'] as const) {
      const md = fs.readFileSync(path.join(SOURCES, id, 'DESIGN.md'), 'utf8')
      const parsed = parseDesignMd(md)
      expect(Object.keys(parsed.colors).length).toBeGreaterThan(5)
      const aesthetic = buildAestheticFromParsed(id, parsed)
      expect(aesthetic.typography.display.fontSize).toBeGreaterThan(0)
      expect(aesthetic.theme.background).toBeTruthy()
      expect(aesthetic.id).toBe(id)
    }
  })

  it('builds generic aesthetics for synced getdesign + hyperframes themes', () => {
    expect(Object.keys(parsedDesignSources).length).toBeGreaterThan(15)
    for (const [id, parsed] of Object.entries(parsedDesignSources)) {
      if (['apple', 'notion', 'dell-1996'].includes(id)) continue
      const aesthetic = buildGenericAesthetic(id, parsed)
      expect(aesthetic.id).toBe(id)
      expect(aesthetic.theme.primary).toMatch(/^#|rgba/)
    }
  })
})
