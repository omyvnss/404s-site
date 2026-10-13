// Candidate sources: public RSS feeds of curated design galleries. Sites that
// get featured there are exactly the ones likely to have a designed 404 page.

export interface FeedItem {
  source: string
  title: string
  description: string
  galleryUrl: string
}

export const FEEDS: Record<string, string> = {
  awwwards: 'https://feeds.feedburner.com/awwwards-sites-of-the-day',
  siteinspire: 'https://www.siteinspire.com/websites/feed',
  'minimal.gallery': 'https://minimal.gallery/feed/',
  onepagelove: 'https://onepagelove.com/feed',
}

export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

const unwrap = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? ''

export async function fetchFeed(source: string, url: string): Promise<FeedItem[]> {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`${source} feed HTTP ${res.status}`)
  const xml = await res.text()
  return xml
    .split('<item>')
    .slice(1)
    .map(item => ({
      source,
      title: unwrap(tag(item, 'title')),
      description: unwrap(tag(item, 'description')).slice(0, 400),
      galleryUrl: unwrap(tag(item, 'link')),
    }))
    .filter(i => i.title && /^https?:\/\//.test(i.galleryUrl))
}

// Hosts that are never the featured site itself.
const NOT_A_SITE =
  /(^|\.)(awwwards|siteinspire|minimal\.gallery|onepagelove|feedburner|twitter|x|facebook|instagram|linkedin|pinterest|google|googleapis|gstatic|youtube|youtu|vimeo|dribbble|behance|cloudflare|apple|github|wordpress|wp|gravatar|w3|schema|jsdelivr|unpkg|typekit|tiktok|threads|bsky|medium|spotify|figma|framer|webflow|shopify|mobbin|ahrefs|gmpg|creativecommons|mailchimp|substack|discord|reddit|t)\.[a-z.]+$/i

/**
 * External hosts linked from a gallery entry page, most-linked first.
 * The featured site is almost always among the top few.
 */
export async function shortlistHosts(galleryUrl: string): Promise<Array<{ host: string; url: string; count: number }>> {
  const res = await fetch(galleryUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`gallery page HTTP ${res.status}`)
  const html = await res.text()
  const hosts = new Map<string, { url: string; count: number }>()
  for (const m of html.matchAll(/href="(https?:\/\/[^"#\s]+)"/g)) {
    let u: URL
    try {
      u = new URL(m[1])
    } catch {
      continue
    }
    const host = u.hostname.toLowerCase()
    if (NOT_A_SITE.test(host) || !host.includes('.')) continue
    const prev = hosts.get(host)
    hosts.set(host, { url: prev?.url ?? `${u.protocol}//${u.host}/`, count: (prev?.count ?? 0) + 1 })
  }
  return [...hosts.entries()]
    .map(([host, v]) => ({ host, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}
