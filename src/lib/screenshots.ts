export function extractCleanUrl(url: string): string {
  return url.replace(/\?via=404sdesign/g, '').trim()
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

export function getScreenshotProviders(url: string): string[] {
  const cleanUrl = extractCleanUrl(url)
  const encodedUrl = encodeURIComponent(cleanUrl)
  
  return [
    `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url&waitFor=networkidle0&timeout=10000`,
    `https://r.jina.ai/http://${cleanUrl}`,
    `https://image.thum.io/get/width/1200/crop/800/${cleanUrl}`,
  ]
}

export async function fetchScreenshotWithFallback(url: string, timeoutMs = 8000): Promise<string | null> {
  const providers = getScreenshotProviders(url)
  
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
          return provider
        }
        if (contentType.includes('json')) {
          const data = await res.json()
          if (data?.screenshot?.url) return data.screenshot.url
          if (data?.url) return data.url
        }
      }
    } catch {
      continue
    }
  }
  return null
}

export function getFaviconUrl(url: string): string {
  const cleanUrl = extractCleanUrl(url)
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanUrl)}&size=64`
}

export function getPlaceholderSvg(domain: string): string {
  const name = domain.replace(/^www\./, '').split('.')[0].toUpperCase()
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" style="background:#18181b">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="system-ui, sans-serif" font-size="48" font-weight="600" fill="#52525b">
        ${name}
      </text>
    </svg>
  `)}`
}