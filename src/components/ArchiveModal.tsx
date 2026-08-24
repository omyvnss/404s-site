import { useEffect, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'
import type { SiteEntry } from '../lib/csv'
import { extractCleanUrl } from '../lib/screenshots'

interface ArchiveModalProps {
  sites: SiteEntry[]
  isOpen: boolean
  onClose: () => void
}

export function ArchiveModal({ sites, isOpen, onClose }: ArchiveModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="All 404 page links"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl"
        style={{ animation: 'modal-in 0.2s ease-out', maxHeight: '70vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text">All Links</h2>
            <p className="text-sm text-text-muted">
              {sites.length} 404 pages archived
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto divide-y divide-border" style={{ maxHeight: 'calc(70vh - 72px)' }}>
          {sites.map((site) => {
            const cleanUrl = extractCleanUrl(site.url)
            return (
              <a
                key={site.url}
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-surface-hover transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text truncate group-hover:text-white">
                    {site.domain}
                  </div>
                  {site.dateAdded && (
                    <div className="text-xs text-text-muted">
                      {site.dateAdded}
                    </div>
                  )}
                </div>
                <ExternalLink
                  size={14}
                  className="text-text-dim group-hover:text-text-muted flex-shrink-0 transition-colors"
                />
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
