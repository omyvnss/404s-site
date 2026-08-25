import { useState, useCallback, useRef, useEffect } from 'react'
import { getFaviconUrl, getPlaceholderSvg, extractCleanUrl } from '../lib/screenshots'

interface CardProps {
  domain: string
  url: string
}

const SCREENSHOT_SERVICE = 'https://image.thum.io/get/width/960/crop/640/noanimate/'

export function Card({ domain, url }: CardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [inView, setInView] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const cleanUrl = extractCleanUrl(url)
  const faviconUrl = getFaviconUrl(cleanUrl)
  const displayName = domain.replace(/^www\./, '').split('.')[0]

  // IntersectionObserver: only load screenshot when card enters viewport
  useEffect(() => {
    if (inView) return
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView])

  // Fetch screenshot only when in view
  useEffect(() => {
    if (!inView || imgSrc || imgError) return

    const screenshotUrl = `${SCREENSHOT_SERVICE}${encodeURIComponent(cleanUrl)}`
    const img = new Image()
    img.onload = () => {
      setImgSrc(screenshotUrl)
      setImgLoaded(true)
    }
    img.onerror = () => {
      setImgError(true)
    }
    img.src = screenshotUrl
  }, [inView, imgSrc, imgError, cleanUrl])

  const handleError = useCallback(() => {
    setImgError(true)
  }, [])

  return (
    <article className="card" ref={cardRef}>
      <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="card-link">
        <div className="card-image">
          {!imgError ? (
            <>
              {!imgLoaded && (
                <div className="placeholder" style={{ backgroundImage: `url(${getPlaceholderSvg(domain)})` }} />
              )}
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt={`${displayName} 404 page`}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setImgLoaded(true)}
                  onError={handleError}
                  className={imgLoaded ? 'opacity-100' : 'opacity-0'}
                  style={{ transition: 'opacity 0.2s' }}
                />
              )}
            </>
          ) : (
            <div className="placeholder" style={{ backgroundImage: `url(${getPlaceholderSvg(domain)})` }} />
          )}
        </div>
      </a>

      <div className="card-meta">
        <img
          src={faviconUrl}
          alt=""
          className="card-favicon"
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <span className="card-name">{displayName}</span>
      </div>
    </article>
  )
}