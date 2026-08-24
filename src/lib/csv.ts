export interface SiteEntry {
  domain: string
  url: string
  dateAdded: string
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

export function parseCSV(csv: string): SiteEntry[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  // Skip header row
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
