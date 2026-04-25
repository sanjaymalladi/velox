import { getDocsPage, getDocsMarkdown } from '../../../../src/docs'

type RouteProps = {
  params: Promise<{ slug?: string[] }> | { slug?: string[] }
}

export async function GET(_request: Request, { params }: RouteProps) {
  const resolved = 'then' in params ? await params : params
  const page = getDocsPage(resolved.slug ?? [])

  if (!page) {
    return new Response('Not found', { status: 404 })
  }

  const markdown = getDocsMarkdown(resolved.slug ?? [])

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  })
}
