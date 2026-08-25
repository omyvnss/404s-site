import { useState, useRef, useEffect } from 'react'
import { getScreenshotProviders, getFaviconUrl, extractCleanUrl } from '../lib/screenshots'

interface CardProps {
  domain: string
  url: string
}

const TIMEOUT_MS = 8000

export function Card({ domain, url }: CardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [inView, setInView] = useState(false)
  const [providerIndex, setProviderIndex] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const cleanUrl = extractCleanUrl(url)
  const faviconUrl = getFaviconUrl(cleanUrl)
  const displayName = domain.replace(/^www\./, '').split('.')[0]
  const providers = getScreenshotProviders(cleanUrl)

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
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView])

  useEffect(() => {
    if (!inView || imgSrc || imgError || providerIndex >= providers.length) return

    const providerUrl = providers[providerIndex]
    const controller = new AbortController()
    abortRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const img = new Image()
    img.onload = () => {
      if (!controller.signal.aborted) {
        setImgSrc(providerUrl)
        setImgLoaded(true)
      }
    }
    img.onerror = () => {
      if (!controller.signal.aborted) {
        clearTimeout(timeoutId)
        setProviderIndex(prev => prev + 1)
      }
    }

    img.src = providerUrl

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [inView, imgSrc, imgError, providerIndex, providers])

  useEffect(() => {
    if (providerIndex >= providers.length && !imgSrc) {
      setImgError(true)
    }
  }, [providerIndex, providers.length, imgSrc])

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const firstLetter = displayName.charAt(0).toUpperCase()

  return (
    <article className="card" ref={cardRef}>
      <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="card-link">
        <div className="card-image">
          {!imgSrc && !imgError && (
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
              onError={() => setProviderIndex(prev => prev + 1)}
              style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            />
          )}
          {imgError && (
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