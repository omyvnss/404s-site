import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// Downloads each site's favicon once into public/favicons/ and records it in
// sites.json, so the gallery makes zero third-party requests (and no 404
// console noise for sites without an icon). Run after generate-screenshots.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITES_PATH = join(ROOT, 'public', 'sites.json')
const DIR = join(ROOT, 'public', 'favicons')

interface Site {
  url: string
  domain: string
  favicon?: string | null
  [key: string]: unknown
}

async function fetchIcon(site: Site): Promise<string | null> {
  const file = `${site.domain.replace(/[^a-z0-9.-]/gi, '-').toLowerCase()}.png`
  if (existsSync(join(DIR, file))) return file
  const host = new URL(site.url).hostname
  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${host}&sz=64`, {
      signal: AbortSignal.timeout(10000),
    })
    // Google answers 404 (with a generic globe) when the site has no icon.
    if (!res.ok) return null
    writeFileSync(join(DIR, file), Buffer.from(await res.arrayBuffer()))
    return file
  } catch {
    return null
  }
}

async function main() {
  mkdirSync(DIR, { recursive: true })
  const sites = JSON.parse(readFileSync(SITES_PATH, 'utf-8')) as Site[]
  const queue = [...sites]
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let site = queue.shift(); site; site = queue.shift()) site.favicon = await fetchIcon(site)
    })
  )
  writeFileSync(SITES_PATH, JSON.stringify(sites, null, 2) + '\n')
  console.log(`✅ Favicons: ${sites.filter(s => s.favicon).length}/${sites.length} sites have an icon`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
