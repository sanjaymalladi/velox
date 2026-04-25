import type { ReactNode } from 'react'

export function VeloxLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#velox-bg)" />
      <path
        d="M18 19H29L24 31H34L28 45"
        stroke="url(#velox-bolt)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="45" cy="19" r="4" fill="#FFD089" fillOpacity="0.9" />
      <defs>
        <linearGradient id="velox-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#171513" />
          <stop offset="1" stopColor="#241A11" />
        </linearGradient>
        <linearGradient id="velox-bolt" x1="20" y1="18" x2="36" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFCF6E" />
          <stop offset="1" stopColor="#FF8C3A" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function VeloxWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`velox-wordmark${compact ? ' velox-wordmark--compact' : ''}`}>
      <VeloxLogoMark className="velox-logo" />
      <span className="velox-wordmark-text">
        <strong>Velox</strong>
        {!compact && <span>Motion graphics for LLM workflows</span>}
      </span>
    </span>
  )
}

export function VeloxPageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <section className="docs-hero">
      <p className="docs-hero-eyebrow">{eyebrow}</p>
      <h1 className="docs-hero-title">{title}</h1>
      <p className="docs-hero-description">{description}</p>
      {children && <div className="docs-hero-actions">{children}</div>}
    </section>
  )
}
