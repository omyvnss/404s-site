import { Card } from './Card'
import type { SiteEntry } from '../lib/csv'

// Exact order from reference IMAGE 1
const GALLERY_DATA: SiteEntry[] = [
  {
    domain: 'gabrielbeaugnonin.com',
    url: 'https://gabrielbeaugnonin.com/404',
    dateAdded: '2024-01-15',
    name: 'Gabriel Beaugnonin'
  },
  {
    domain: 'anti-average.com',
    url: 'https://anti-average.com/404',
    dateAdded: '2024-01-16',
    name: 'Anti Average'
  },
  {
    domain: 'mobbin.com',
    url: 'https://mobbin.com/404',
    dateAdded: '2024-01-17',
    name: 'Mobbin'
  },
  {
    domain: 'superkeen.com',
    url: 'https://superkeen.com/404',
    dateAdded: '2024-01-18',
    name: 'Super Keen'
  },
  {
    domain: 'jameswalsh.studio',
    url: 'https://jameswalsh.studio/404',
    dateAdded: '2024-01-19',
    name: 'James Walsh Studio'
  },
  {
    domain: 'hellohello.studio',
    url: 'https://hellohello.studio/404',
    dateAdded: '2024-01-20',
    name: '++hellohello'
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