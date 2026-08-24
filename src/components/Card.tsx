import { useState, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'
import { getScreenshotUrl, extractCleanUrl } from '../lib/screenshots'

interface CardProps {
  domain: string
  url: string
  dateAdded: string
  index: number
}

export function Card({ domain, url, dateAdded, index }: CardProps) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const cleanUrl = extractCleanUrl(url)
  const screenshotUrl = getScreenshotUrl(cleanUrl)

  const handleError = useCallback(() => {
    setImgError(true)
  }, [])

  const handleLoad = useCallback(() => {
    setImgLoaded(true)
  }, [])

  const delay = Math.min(index * 30, 300)

  return (
    <article
      className="group relative rounded-xl border border-border overflow-hidden transition-all duration-200 hover:border-border-hover hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(255,255,255,0.03)]"
      style={{
        animation: `fade-in 0.4s ease-out ${delay}ms both`,
      }}
    >
      {/* Screenshot container */}
      <div className="relative aspect-[16/10] w-full bg-surface overflow-hidden">
        {!imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-surface animate-pulse" />
            )}
            <img
              src={screenshotUrl}
              alt={`${domain} 404 page screenshot`}
              loading="lazy"
              decoding="async"
              onLoad={handleLoad}
              onError={handleError}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              } group-hover:opacity-80`}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface">
            <div className="text-center px-4">
              <div className="text-3xl font-bold text-text-dim mb-2">404</div>
              <div className="text-sm text-text-muted font-medium truncate max-w-[180px]">
                {domain}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface border-t border-border">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Favicon */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanUrl)}&size=32`}
            alt=""
            className="w-4 h-4 rounded-sm flex-shrink-0"
            loading="lazy"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-text truncate">
              {domain}
            </div>
            {dateAdded && (
              <div className="text-xs text-text-muted">
                {dateAdded}
              </div>
            )}
          </div>
        </div>

        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          aria-label={`Visit ${domain}`}
          title="Visit site"
        >
          <ExternalLink size={14} strokeWidth={2} />
        </a>
      </div>
    </article>
  )
}
