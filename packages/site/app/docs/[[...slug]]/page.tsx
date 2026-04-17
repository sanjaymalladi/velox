import { DocsSite, getStaticParams } from '../../../src/docs'

type PageProps = {
  params: Promise<{ slug?: string[] }> | { slug?: string[] }
}

export function generateStaticParams() {
  return getStaticParams()
}

export default async function DocsPage({ params }: PageProps) {
  const resolved = 'then' in params ? await params : params
  return <DocsSite slug={resolved.slug ?? []} />
}
