import { useState, useCallback, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { getScreenshotProviders, getFaviconUrl, getPlaceholderSvg, extractDomain } from '../lib/screenshots'

interface CardProps {
  domain: string
  url: string
  dateAdded: string
  index: number
}

export function Card({ domain, url, dateAdded, index }: CardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [providerIndex, setProviderIndex] = useState(0)

  const cleanUrl = url.replace(/\?via=404sdesign/g, '').trim()
  const providers = getScreenshotProviders(cleanUrl)
  const faviconUrl = getFaviconUrl(cleanUrl)
  const displayName = extractDomain(domain)

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
    <article className="website" style={{ animationDelay: `${delay}ms` }}>
      <div className="image">
        {!imgError ? (
          <>
            {!imgLoaded && (
              <div className="placeholder" style={{ backgroundImage: `url(${getPlaceholderSvg(domain)})` }} />
            )}
            {imgSrc && (
              <img
                src={imgSrc}
                alt={`${domain} 404 page screenshot`}
                loading="lazy"
                decoding="async"
                onLoad={handleLoad}
                onError={handleError}
                className={`w-full aspect-square object-cover transition-opacity duration-200 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
            <div className="overlay">
              <span>{displayName.toUpperCase()}</span>
            </div>
          </>
        ) : (
          <div className="placeholder" style={{ backgroundImage: `url(${getPlaceholderSvg(domain)})` }} />
        )}
      </div>

      <div className="details">
        <img
          src={faviconUrl}
          alt=""
          className="favicon"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <span className="domain-name">{domain}</span>
        {dateAdded && <time className="date" dateTime={dateAdded}>{dateAdded}</time>}
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="external-link"
          aria-label={`Visit ${domain}`}
        >
          <ExternalLink size={12} strokeWidth={2} />
        </a>
      </div>
    </article>
  )
}