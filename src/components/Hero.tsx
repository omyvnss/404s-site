import type { SiteEntry } from '../lib/csv'

interface HeroProps {
  sites: SiteEntry[]
  onGridClick?: () => void
  onSurpriseMe?: () => void
}

const FRESH_DAYS = 14

/** Most recent addition, only if it is actually recent — otherwise no "Latest" pill. */
function latestSite(sites: SiteEntry[]): SiteEntry | undefined {
  const latest = sites.reduce<SiteEntry | undefined>(
    (best, s) => (s.dateAdded && (!best || s.dateAdded > best.dateAdded) ? s : best),
    undefined
  )
  if (!latest) return undefined
  const ageDays = (Date.now() - new Date(latest.dateAdded).getTime()) / 86_400_000
  return ageDays <= FRESH_DAYS ? latest : undefined
}

export function Hero({ sites, onGridClick, onSurpriseMe }: HeroProps) {
  const latest = latestSite(sites)
  const shown = sites.filter((s) => s.preview !== null).length

  return (
    <>
      <section className="hero container-page" aria-labelledby="hero-heading">
        <p className="hero-eyebrow">
          <span className="hero-dot" aria-hidden="true" />
          {shown > 0 ? `${shown} pages` : 'Archive'} · updated daily
        </p>

        <h1 id="hero-heading" className="hero-heading">
          Pages <span className="strikethrough">not</span> found
        </h1>

        <div className="hero-foot">
          <p className="hero-subtitle">
            A curated archive of 404 pages worth finding.{' '}
            <br />
            The dead ends studios and brands actually designed.
          </p>

          {latest && (
            <a
              className="hero-latest"
              href={latest.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="hero-latest-label">Latest</span>
              <span className="hero-latest-domain">{latest.domain}</span>
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </section>

      <section className="container-page" aria-label="Gallery controls">
        <div className="toolbar">
          <div className="toolbar-left">
            <button
              className="tool-btn tool-btn-active"
              onClick={onGridClick}
              aria-pressed="true"
              aria-label="Grid view (G)"
            >
              GRID [G]
            </button>
            <button
              className="tool-btn"
              onClick={onSurpriseMe}
              aria-label="Surprise me (S)"
            >
              SURPRISE ME [S]
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
