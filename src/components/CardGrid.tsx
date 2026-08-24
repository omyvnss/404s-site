import { Card } from './Card'
import type { SiteEntry } from '../lib/csv'

interface CardGridProps {
  sites: SiteEntry[]
  loading: boolean
}

export function CardGrid({ sites, loading }: CardGridProps) {
  if (loading) {
    return (
      <div className="skeleton-grid" role="status" aria-label="Loading gallery">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-image" />
            <div className="skeleton-meta">
              <div className="skeleton-favicon" />
              <div className="skeleton-name" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Sort sites by dateAdded descending (newest first)
  const sortedSites = [...sites].sort((a, b) => 
    new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  )

  return (
    <div className="gallery-grid" role="list" aria-label="404 design gallery">
      {sortedSites.map((site, index) => (
        <Card
          key={site.url}
          domain={site.domain}
          url={site.url}
          dateAdded={site.dateAdded}
          index={index}
          name={site.name || site.domain}
        />
      ))}
    </div>
  )
}