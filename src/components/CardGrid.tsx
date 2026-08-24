import { Card } from './Card'
import type { SiteEntry } from '../lib/csv'

interface CardGridProps {
  sites: SiteEntry[]
  loading: boolean
}

export function CardGrid({ sites, loading }: CardGridProps) {
  if (loading) {
    return (
      <div className="skeleton-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="image" />
            <div className="details">
              <div className="favicon" />
              <div className="domain" />
              <div className="date" />
              <div className="external" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sites.length === 0) return null

  return (
    <div className="websites archive">
      {sites.map((site, index) => (
        <Card
          key={site.url}
          domain={site.domain}
          url={site.url}
          dateAdded={site.dateAdded}
          index={index}
        />
      ))}
    </div>
  )
}