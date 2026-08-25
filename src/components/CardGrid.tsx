import { Card } from './Card'
import type { SiteEntry } from '../lib/csv'

interface CardGridProps {
  sites: SiteEntry[]
  loading: boolean
}

export function CardGrid({ sites, loading }: CardGridProps) {
  if (loading) {
    return (
      <div className="gallery-grid" role="status" aria-label="Loading gallery">
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

  return (
    <div className="gallery-grid" role="list" aria-label="404 design gallery">
      {sites.map((site) => (
        <Card
          key={site.url}
          domain={site.domain}
          url={site.url}
        />
      ))}
    </div>
  )
}