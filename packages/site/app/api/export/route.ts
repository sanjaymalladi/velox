import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'path'

const MAX_VIDEO_BYTES = 50 * 1024 * 1024
const ALLOWED_VIDEO_TYPES = new Set(['video/webm', 'video/webm;codecs=vp9'])

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development.' }, { status: 403 })
  }

  try {
    const data = await req.formData()
    const file = data.get('video')
    const name = data.get('name')

    if (!(file instanceof Blob) || typeof name !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid form data.' }, { status: 400 })
    }
    if (!name.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Video size is invalid or exceeds 50MB.' }, { status: 413 })
    }
    if (file.type && !ALLOWED_VIDEO_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported video type: ${file.type}` }, { status: 415 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const outDir = path.resolve(process.cwd(), '../../examples')

    await fs.mkdir(outDir, { recursive: true })

    const cleanName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 80)
    const outputPath = path.join(outDir, `${cleanName || 'untitled'}.webm`)
    await fs.writeFile(outputPath, buffer)

    return NextResponse.json({ ok: true, file: path.basename(outputPath) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export video.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
