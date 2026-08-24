import { Card } from './Card'
import { SkeletonCard } from './SkeletonCard'
import type { SiteEntry } from '../lib/csv'

interface CardGridProps {
  sites: SiteEntry[]
  loading: boolean
}

export function CardGrid({ sites, loading }: CardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (sites.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sites.map((site, i) => (
        <Card
          key={site.url}
          domain={site.domain}
          url={site.url}
          dateAdded={site.dateAdded}
          index={i}
        />
      ))}
    </div>
  )
}
