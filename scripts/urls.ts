export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1FZhps3kBU8d4Kk9EHRmRfpH1J28B1YezrZkt7peTyCI/export?format=csv'

export interface SiteEntry {
  domain: string
  url: string
  dateAdded: string
  name?: string
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      fields.push(field)
      field = ''
    } else {
      field += c
    }
  }
  fields.push(field)
  return fields
}

function extractDomain(url: string): string {
  try {
    const cleaned = url.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
    const domain = cleaned.split('/')[0]
    const withoutWww = domain.replace(/^www\./, '')
    return withoutWww
  } catch {
    return url
  }
}

export function extractCleanUrl(url: string): string {
  return url.replace(/\?via=404sdesign/g, '').replace(/&via=404sdesign/g, '').trim()
}

export function extractDomainFromUrl(url: string): string {
  return extractDomain(url)
}

export function parseCSV(csv: string): SiteEntry[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  return lines.slice(1).reduce<SiteEntry[]>((acc, line) => {
    const trimmed = line.trim()
    if (!trimmed) return acc

    const [urlRaw, dateRaw] = parseCSVLine(trimmed)
    const url = (urlRaw ?? '').trim()
    const dateAdded = (dateRaw ?? '').trim()

    if (!url) return acc

    const domain = extractDomain(url)

    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(domain)) return acc

    acc.push({ domain, url, dateAdded })
    return acc
  }, [])
}

export function deduplicateSites(sites: SiteEntry[]): SiteEntry[] {
  const seen = new Set<string>()
  return sites.filter(entry => {
    const clean = extractCleanUrl(entry.url).toLowerCase()
    if (seen.has(clean)) return false
    seen.add(clean)
    return true
  })
}

export function generateScreenshotFilename(url: string): string {
  const clean = extractCleanUrl(url)
  const domain = extractDomain(clean)
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, '-').toLowerCase()
  return `${safeDomain}.jpg`
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