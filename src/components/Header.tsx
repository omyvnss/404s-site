import { Layers } from 'lucide-react'

interface HeaderProps {
  siteCount: number
  onArchiveOpen: () => void
}

export function Header({ siteCount, onArchiveOpen }: HeaderProps) {
  return (
    <header className="container" style={{ paddingTop: '120px', paddingBottom: '60px' }}>
      <div className="flex flex-col items-start gap-6">
        <div className="flex flex-col items-start gap-[6px] font-medium text-foreground text-[var(--font-xl)] leading-[1.1]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 opacity-50 flex-shrink-0">
              <Layers size={28} className="text-foreground" />
            </div>
            <span>404s</span>
          </div>
        </div>
        <p className="text-[var(--font-lg)] text-foreground-subtle font-normal">
          404 pages worth finding
        </p>
        <p className="text-[var(--font-sm)] text-foreground-subtler">
          A curated gallery of creative error page designs
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[var(--font-sm)] text-foreground-subtler">
            <span className="font-mono text-foreground-subtle">{siteCount.toLocaleString()}</span> sites archived
          </span>
          <button
            onClick={onArchiveOpen}
            className="random-button ml-2"
            aria-label="View all links"
          >
            <div><span>Archive</span></div>
            <div><span>All Links</span></div>
          </button>
        </div>
      </div>
    </header>
  )
}