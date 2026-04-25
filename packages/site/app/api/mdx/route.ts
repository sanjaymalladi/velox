import { NextRequest, NextResponse } from 'next/server'
import { getDocsMarkdown } from '../../../src/docs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') ?? 'index'
  
  // Basic security check to prevent directory traversal
  if (slug.includes('..') || slug.startsWith('/')) {
    return new NextResponse('Invalid slug', { status: 400 })
  }

  const segments = slug === 'index' ? [] : slug.split('/')
  const markdown = getDocsMarkdown(segments)

  if (!markdown) {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
