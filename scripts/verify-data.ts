import { existsSync, readFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// Final gate before deploy: the gallery index, discovered list and previews
// must be consistent. Exits non-zero (blocking the deploy) on any problem.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const errors: string[] = []

function read<T>(rel: string, required: boolean): T | null {
  const path = join(ROOT, rel)
  if (!existsSync(path)) {
    if (required) errors.push(`${rel} is missing`)
    return null
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch (err) {
    errors.push(`${rel} is not valid JSON: ${(err as Error).message}`)
    return null
  }
}

interface IndexEntry {
  url: string
  domain: string
  dateAdded: string
  preview: string | null
  favicon?: string | null
}

const sites = read<IndexEntry[]>('public/sites.json', true) ?? []
if (sites.length < 50) errors.push(`public/sites.json has only ${sites.length} sites — refusing to deploy a gutted gallery`)

const seen = new Set<string>()
for (const s of sites) {
  const where = `sites.json[${s.domain ?? '?'}]`
  if (!/^https?:\/\/[^/\s]+/.test(s.url ?? '')) errors.push(`${where}: bad url ${s.url}`)
  if (!s.domain) errors.push(`${where}: missing domain`)
  if (s.dateAdded && !/^\d{4}-\d{2}-\d{2}$/.test(s.dateAdded)) errors.push(`${where}: bad date ${s.dateAdded}`)
  if (s.preview !== null && !existsSync(join(ROOT, 'public', 'previews', s.preview))) {
    errors.push(`${where}: preview ${s.preview} does not exist`)
  }
  if (s.favicon && !existsSync(join(ROOT, 'public', 'favicons', s.favicon))) {
    errors.push(`${where}: favicon ${s.favicon} does not exist`)
  }
  const key = s.url.toLowerCase()
  if (seen.has(key)) errors.push(`${where}: duplicate url`)
  seen.add(key)
}

const discovered = read<Array<{ url: string; domain: string }>>('data/discovered.json', false) ?? []
const inIndex = new Set(sites.map(s => s.domain))
for (const d of discovered) {
  if (!inIndex.has(d.domain)) errors.push(`discovered ${d.domain} is not in public/sites.json`)
}

if (errors.length) {
  console.error(`❌ Data verification failed (${errors.length}):\n - ${errors.slice(0, 30).join('\n - ')}`)
  process.exit(1)
}
console.log(`✅ Data verified: ${sites.length} sites, ${sites.filter(s => s.preview).length} with previews, ${discovered.length} discovered`)
