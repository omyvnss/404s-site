import { Card } from './Card'
import type { SiteEntry } from '../lib/csv'

// Hardcoded gallery data matching the spec exactly
const GALLERY_DATA: SiteEntry[] = [
  {
    domain: 'superkeen.com',
    url: 'https://superkeen.com/404',
    dateAdded: '2024-01-15',
    name: 'Super Keen'
  },
  {
    domain: 'jameswalsh.studio',
    url: 'https://jameswalsh.studio/404',
    dateAdded: '2024-01-16',
    name: 'James Walsh Studio'
  },
  {
    domain: 'hellohello.studio',
    url: 'https://hellohello.studio/404',
    dateAdded: '2024-01-17',
    name: '++hellohello'
  },
  {
    domain: 'fakeverything.com',
    url: 'https://fakeverything.com/404',
    dateAdded: '2024-01-18',
    name: 'akiaura, LONOWN — Fake Everything'
  },
  {
    domain: 'maximiliankaspar.com',
    url: 'https://maximiliankaspar.com/404',
    dateAdded: '2024-01-19',
    name: 'Maximilian Kaspar'
  },
  {
    domain: 'cossette.com',
    url: 'https://cossette.com/404',
    dateAdded: '2024-01-20',
    name: 'Cossette'
  }
]

interface CardGridProps {
  loading: boolean
}

export function CardGrid({ loading }: CardGridProps) {
  if (loading) {
    return (
      <div className="skeleton-grid" role="status" aria-label="Loading gallery">
        {Array.from({ length: 6 }).map((_, i) => (
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
      {GALLERY_DATA.map((site, index) => (
        <Card
          key={site.url}
          domain={site.domain}
          url={site.url}
          dateAdded={site.dateAdded}
          index={index}
          name={site.name}
        />
      ))}
    </div>
  )
}