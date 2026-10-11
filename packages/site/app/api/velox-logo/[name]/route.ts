import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getSvglLogosDir } from '../_lib/logosDir'

const SAFE_NAME = /^[a-z0-9_-]+$/i

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const { name: raw } = await context.params
  const base = raw.replace(/\.json$/i, '')
  if (!SAFE_NAME.test(base)) {
    return NextResponse.json({ error: 'Invalid logo name' }, { status: 400 })
  }

  const logosDir = getSvglLogosDir()
  const filePath = path.resolve(logosDir, `${base}.json`)
  const logosRoot = path.resolve(logosDir)
  if (!filePath.startsWith(logosRoot + path.sep) && filePath !== logosRoot) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  try {
    const text = await readFile(filePath, 'utf8')
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Logo not found' }, { status: 404 })
  }
}
