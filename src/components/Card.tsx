import { useState, useRef, useEffect } from 'react'
import { getFaviconUrl, extractCleanUrl } from '../lib/screenshots'

interface CardProps {
  domain: string
  url: string
}

const PREVIEW_BASE = '/previews/'

function generatePreviewFilename(url: string): string {
  const clean = extractCleanUrl(url)
  const domain = clean.replace(/^https?:\/\//i, '').replace(/\/+$/, '').split('/')[0].replace(/^www\./, '')
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, '-').toLowerCase()
  return `${safeDomain}.jpg`
}

export function Card({ domain, url }: CardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [inView, setInView] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const cleanUrl = extractCleanUrl(url)
  const faviconUrl = getFaviconUrl(cleanUrl)
  const displayName = domain.replace(/^www\./, '').split('.')[0]
  const previewFilename = generatePreviewFilename(url)
  const previewUrl = `${PREVIEW_BASE}${previewFilename}`

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
      { rootMargin: '100px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView])

  useEffect(() => {
    if (!inView || imgSrc || imgFailed) return

    const img = new Image()
    img.onload = () => {
      setImgSrc(previewUrl)
      setImgLoaded(true)
    }
    img.onerror = () => {
      setImgFailed(true)
    }
    img.src = previewUrl

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [inView, imgSrc, imgFailed, previewUrl])

  const firstLetter = displayName.charAt(0).toUpperCase()

  return (
    <article className="card" ref={cardRef}>
      <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="card-link">
        <div className="card-image">
          {!imgSrc && !imgFailed && (
            <div className="card-placeholder">
              <span className="card-placeholder-letter">{firstLetter}</span>
            </div>
          )}
          {imgSrc && (
            <img
              src={imgSrc}
              alt={`${displayName} 404 page`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
              style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
            />
          )}
          {imgFailed && (
            <div className="card-placeholder card-placeholder-error">
              <span className="card-placeholder-letter">{firstLetter}</span>
            </div>
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