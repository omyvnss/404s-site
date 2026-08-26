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

export function getFaviconUrl(url: string): string {
  const cleanUrl = extractCleanUrl(url)
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanUrl)}&size=64`
}

export function getPlaceholderSvg(domain: string): string {
  const name = domain.replace(/^www\./, '').split('.')[0].toUpperCase()
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" style="background:#282828">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui, sans-serif" font-size="36" font-weight="500" fill="#333333">
        ${name}
      </text>
    </svg>
  `)}`
}