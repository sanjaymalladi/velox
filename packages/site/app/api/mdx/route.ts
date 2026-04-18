import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') ?? 'index'
  
  // Basic security check to prevent directory traversal
  if (slug.includes('..') || slug.startsWith('/')) {
    return new NextResponse('Invalid slug', { status: 400 })
  }

  const filepath = path.join(process.cwd(), 'content', 'docs', `${slug}.mdx`)
  
  try {
    const raw = fs.readFileSync(filepath, 'utf-8')
    return new NextResponse(raw, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (e) {
    return new NextResponse('Not found', { status: 404 })
  }
}
