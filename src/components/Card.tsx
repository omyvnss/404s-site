import { useState, useCallback, useEffect } from 'react'
import { getScreenshotProviders, getFaviconUrl, getPlaceholderSvg } from '../lib/screenshots'

interface CardProps {
  domain: string
  url: string
  dateAdded: string
  index: number
  name?: string
}

export function Card({ domain, url, index, name }: CardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [providerIndex, setProviderIndex] = useState(0)

  const cleanUrl = url.replace(/\?via=404sdesign/g, '').trim()
  const providers = getScreenshotProviders(cleanUrl)
  const faviconUrl = getFaviconUrl(cleanUrl)
  const displayName = name || domain

  const tryNextProvider = useCallback(() => {
    if (providerIndex < providers.length - 1) {
      setProviderIndex(prev => prev + 1)
      setImgError(false)
      setImgLoaded(false)
    } else {
      setImgError(true)
    }
  }, [providerIndex, providers.length])

  useEffect(() => {
    if (!imgError && providerIndex < providers.length) {
      const providerUrl = providers[providerIndex]
      const img = new Image()
      img.onload = () => {
        setImgSrc(providerUrl)
        setImgLoaded(true)
        setImgError(false)
      }
      img.onerror = () => {
        tryNextProvider()
      }
      img.src = providerUrl
    }
  }, [providerIndex, providers, imgError, tryNextProvider])

  const handleLoad = useCallback(() => {
    setImgLoaded(true)
  }, [])

  const handleError = useCallback(() => {
    tryNextProvider()
  }, [tryNextProvider])

  const delay = Math.min(index * 20, 200)

  return (
    <article className="card" style={{ animationDelay: `${delay}ms` }}>
      <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="card-link" aria-label={`View ${displayName} 404 page`}>
        <div className="card-image">
          {!imgError ? (
            <>
              {!imgLoaded && (
                <div className="placeholder" style={{ backgroundImage: `url(${getPlaceholderSvg(domain)})` }} />
              )}
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt={`${displayName} 404 page screenshot`}
                  loading="lazy"
                  decoding="async"
                  onLoad={handleLoad}
                  onError={handleError}
                  className={`w-full h-full object-contain transition-opacity duration-200 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
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
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <span className="card-name">{displayName}</span>
      </div>
    </article>
  )
}