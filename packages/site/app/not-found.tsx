import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: '2rem',
      background: '#0f0a06',
      color: '#f7ead7',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    }}>
      <section style={{ maxWidth: 520, textAlign: 'center' }}>
        <p style={{ color: 'rgba(247,234,215,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          404
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', margin: '0 0 1rem' }}>
          Page not found
        </h1>
        <p style={{ color: 'rgba(247,234,215,0.72)', lineHeight: 1.7 }}>
          The page you requested does not exist. Head back to the docs to continue.
        </p>
        <Link
          href="/docs"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.75rem 1.1rem',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #ffbf66, #f08a3c)',
            color: '#24160d',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Back to docs
        </Link>
      </section>
    </main>
  )
}
