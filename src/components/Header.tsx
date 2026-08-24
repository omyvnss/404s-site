import { Layers } from 'lucide-react'

interface HeaderProps {
  siteCount: number
  onArchiveOpen: () => void
}

export function Header({ siteCount, onArchiveOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center">
            <Layers size={14} className="text-text" />
          </div>
          <span className="text-base font-bold tracking-tight text-text">
            404s
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Entry counter */}
          {siteCount > 0 && (
            <div
              className="px-2.5 py-1 rounded-full bg-surface border border-border text-xs font-semibold text-text-muted tabular-nums"
              style={{ animation: 'counter-pulse 2s ease-in-out infinite' }}
            >
              {siteCount.toLocaleString()}
            </div>
          )}

          {/* Archive button */}
          <button
            onClick={onArchiveOpen}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border text-xs font-semibold text-text-muted hover:text-text hover:border-border-hover hover:bg-surface-hover transition-all"
            aria-label="Open archive of all links"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8v13H3V8" />
              <path d="M1 3h22v5H1z" />
              <path d="M10 12h4" />
            </svg>
            Archive
          </button>
        </div>
      </div>
    </header>
  )
}
