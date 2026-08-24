import { useState, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'
import { getScreenshotUrl, extractCleanUrl } from '../lib/screenshots'

interface CardProps {
  domain: string
  url: string
  dateAdded: string
  index: number
}

export function Card({ domain, url }: CardProps) {
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

  const displayName = domain.replace(/^www\./, '').split('.')[0]

  return (
    <article className="website">
      {/* Screenshot container */}
      <div className="image">
        {!imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-neutral-100 animate-pulse" />
            )}
            <img
              src={screenshotUrl}
              alt={`${domain} 404 page screenshot`}
              loading="lazy"
              decoding="async"
              onLoad={handleLoad}
              onError={handleError}
              className={`w-full aspect-square object-cover transition-opacity duration-300 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {/* Hover overlay */}
            <div className="overlay">
              <span>{displayName.toUpperCase()}</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
            <div className="text-center px-4">
              <div className="text-3xl font-bold text-neutral-400 mb-2">404</div>
              <div className="text-sm text-neutral-500 font-medium truncate max-w-[180px]">
                {domain}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details row */}
      <div className="details">
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link"
          aria-label={`Visit ${domain}`}
        >
          <ExternalLink size={12} strokeWidth={2} />
        </a>
      </div>
    </article>
  )
}