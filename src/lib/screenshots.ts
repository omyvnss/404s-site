export function extractCleanUrl(url: string): string {
  return url.replace(/\?via=404sdesign/g, '').replace(/&via=404sdesign/g, '').trim()
}

export function extractDomain(url: string): string {
  try {
    const cleaned = url.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
    const domain = cleaned.split('/')[0]
    return domain.replace(/^www\./, '')
  } catch {
    return url
  }
}

const screenshotCache = new Map<string, string | null>()

export function getScreenshotProviders(url: string): string[] {
  const cleanUrl = extractCleanUrl(url)
  const encodedUrl = encodeURIComponent(cleanUrl)

  return [
    `https://image.thum.io/get/width/1280/crop/720/noanimate/${cleanUrl}`,
    `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url&waitFor=domcontentloaded&timeout=5000`,
    `https://r.jina.ai/http://${cleanUrl}`,
  ]
}

export async function fetchScreenshotWithFallback(url: string, timeoutMs = 3000): Promise<string | null> {
  const cleanUrl = extractCleanUrl(url)
  if (screenshotCache.has(cleanUrl)) {
    return screenshotCache.get(cleanUrl) ?? null
  }

  const providers = getScreenshotProviders(cleanUrl)

  for (const provider of providers) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch(provider, {
        signal: controller.signal,
        headers: { 'Accept': 'image/*,application/json,*/*' }
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('image')) {
          screenshotCache.set(cleanUrl, provider)
          return provider
        }
        if (contentType.includes('json')) {
          const data = await res.json()
          const imgUrl = data?.screenshot?.url || data?.url || null
          if (imgUrl) {
            screenshotCache.set(cleanUrl, imgUrl)
            return imgUrl
          }
        }
      }
    } catch {
      continue
    }
  }

  screenshotCache.set(cleanUrl, null)
  return null
}

export function getFaviconUrl(url: string): string {
  const cleanUrl = extractCleanUrl(url)
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanUrl)}&size=64`
}

export function getPlaceholderSvg(domain: string): string {
  const name = domain.replace(/^www\./, '').split('.')[0].toUpperCase()
  return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" style="background:#141414">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui, sans-serif" font-size="36" font-weight="500" fill="#262626">
        ${name}
      </text>
    </svg>
  `)}`
}
