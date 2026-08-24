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
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="All 404 page links">
        <div className="modal-header">
          <h2>All Links</h2>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close modal"
          >
            <svg viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 'var(--font-xsm)', color: 'var(--color-foreground-subtler)', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>
            {sites.length} 404 pages archived
          </p>
          <div className="modal-list">
            {sites.map((site) => {
              const cleanUrl = extractCleanUrl(site.url)
              return (
                <a
                  key={site.url}
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-item"
                >
                  <div className="info">
                    <span className="domain">{site.domain}</span>
                    {site.dateAdded && (
                      <span className="date">{site.dateAdded}</span>
                    )}
                  </div>
                  <ExternalLink size={16} className="external-icon" />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}