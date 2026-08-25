import { useState, useRef, useEffect } from 'react'
import { getScreenshotProviders, getFaviconUrl, extractCleanUrl } from '../lib/screenshots'

interface CardProps {
  domain: string
  url: string
}

const TIMEOUT_MS = 3000

const providerCache = new Map<string, string | null>()

export function Card({ domain, url }: CardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(() => {
    const clean = extractCleanUrl(url).replace(/\?via=404sdesign/g, '')
    return providerCache.get(clean) ?? null
  })
  const [imgLoaded, setImgLoaded] = useState(!!providerCache.get(extractCleanUrl(url).replace(/\?via=404sdesign/g, '')))
  const [imgFailed, setImgFailed] = useState(false)
  const [inView, setInView] = useState(false)
  const [providerIndex, setProviderIndex] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)

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
      { rootMargin: '100px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView])

  useEffect(() => {
    if (!inView || imgSrc || imgFailed || providerIndex >= providers.length) return

    const providerUrl = providers[providerIndex]
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      setProviderIndex(prev => prev + 1)
    }, TIMEOUT_MS)

    const img = new Image()
    img.onload = () => {
      if (!controller.signal.aborted) {
        clearTimeout(timeoutId)
        providerCache.set(extractCleanUrl(url).replace(/\?via=404sdesign/g, ''), providerUrl)
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
  }, [inView, imgSrc, imgFailed, providerIndex, providers, url])

  useEffect(() => {
    if (providerIndex >= providers.length && !imgSrc) {
      providerCache.set(extractCleanUrl(url).replace(/\?via=404sdesign/g, ''), null)
      setImgFailed(true)
    }
  }, [providerIndex, providers.length, imgSrc, url])

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
              onError={() => setProviderIndex(prev => prev + 1)}
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
