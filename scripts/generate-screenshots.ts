import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parseCSV, deduplicateSites, extractCleanUrl, generateScreenshotFilename } from './urls.js'
import { captureSite, isBlankFile, launchCaptureBrowser, type ScreenshotResult } from './capture.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PROJECT_ROOT = resolve(__dirname, '..')
const PREVIEWS_DIR = join(PROJECT_ROOT, 'public', 'previews')
const MANIFEST_PATH = join(PREVIEWS_DIR, 'manifest.json')
const SITES_PATH = join(PROJECT_ROOT, 'public', 'sites.json')
// Sites added by the discovery engine (scripts/discover), newest first.
const DISCOVERED_PATH = join(PROJECT_ROOT, 'data', 'discovered.json')
// Domains removed by hand (e.g. the domain now hosts something unrelated).
const BLOCKLIST_PATH = join(PROJECT_ROOT, 'data', 'blocklist.json')
const REPORT_PATH = join(PROJECT_ROOT, 'screenshot-report.json')

const MAX_CONCURRENT = 4
const SAVE_EVERY = 5 // persist manifest/report incrementally

// Optional subset for local testing: LIMIT=10 npm run screenshots
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined
// Or target specific domains: ONLY=dogstudio.co,figma.com npm run screenshots
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(d => d.trim()) : undefined

function fetchCSV(): Promise<string> {
  return fetch(
    'https://docs.google.com/spreadsheets/d/1FZhps3kBU8d4Kk9EHRmRfpH1J28B1YezrZkt7peTyCI/export?format=csv',
    { headers: { Accept: 'text/csv,text/plain,*/*' } }
  ).then(res => {
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`)
    return res.text()
  })
}

function loadJSON<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return fallback
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting screenshot generation...')

  mkdirSync(PREVIEWS_DIR, { recursive: true })

  let csv: string
  try {
    csv = await fetchCSV()
  } catch (err) {
    // Sheet unavailable → keep existing screenshots untouched.
    console.error('❌ Google Sheet unavailable, aborting without changes:', err)
    process.exit(1)
  }

  const discovered = loadJSON<Array<{ url: string; domain: string; dateAdded: string }>>(DISCOVERED_PATH, [])
  const sites = [...discovered, ...parseCSV(csv)]
  const blocklist = new Set(Object.keys(loadJSON<Record<string, string>>(BLOCKLIST_PATH, {})))
  const all = deduplicateSites(sites).filter(s => !blocklist.has(s.domain))
  const subset = ONLY ? all.filter(e => ONLY.includes(e.domain)) : all
  const deduped = LIMIT ? subset.slice(0, LIMIT) : subset
  const partial = Boolean(LIMIT || ONLY)
  console.log(`📋 Found ${sites.length} entries, ${deduped.length} to process${partial ? ' (partial run)' : ''}`)

  const manifest = loadJSON<Record<string, string>>(MANIFEST_PATH, {})

  const { browser, context, scratch } = await launchCaptureBrowser()

  const queue = [...deduped]
  let processed = 0
  const results: ScreenshotResult[] = []

  async function flush(): Promise<void> {
    const summary = buildSummary(results, deduped.length)
    writeFileSync(MANIFEST_PATH, JSON.stringify(sortKeys(manifest), null, 2) + '\n')
    writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2))
  }

  async function worker(): Promise<void> {
    while (true) {
      const entry = queue.shift()
      if (!entry) break

      const filename = generateScreenshotFilename(entry.url)
      const filepath = join(PREVIEWS_DIR, filename)
      const cleanUrl = extractCleanUrl(entry.url)
      const previousExisted = existsSync(filepath)

      const result = await captureSite(context, scratch, entry, filename, filepath, previousExisted)
      results.push(result)
      processed++
      const tag = `[${processed}/${deduped.length}] ${entry.domain}`

      if (result.status === 'success' || result.status === 'unchanged') {
        manifest[cleanUrl] = filename
        const note = result.status === 'unchanged' ? ' [unchanged]' : previousExisted ? ' [updated]' : ' [new]'
        console.log(`✅ ${tag} (${result.size ?? 0} bytes)${note}`)
      } else if (result.status === 'dead') {
        // Parked / suspended / bare server page — the design is gone.
        if (previousExisted) unlinkSync(filepath)
        delete manifest[cleanUrl]
        console.log(`💀 ${tag}: ${result.reason}`)
      } else {
        // Keep previous valid screenshot — but drop one that is itself a flat
        // black/blank frame, the card placeholder looks better than that.
        if (previousExisted && (await isBlankFile(scratch, filepath))) {
          unlinkSync(filepath)
          delete manifest[cleanUrl]
          console.log(`🗑️  ${tag}: removed stale blank preview`)
        }
        console.log(`❌ ${tag}: ${result.status} — ${result.reason}`)
      }

      if (processed % SAVE_EVERY === 0) {
        await flush()
      }
    }
  }

  await Promise.all(Array.from({ length: MAX_CONCURRENT }, () => worker()))

  await context.close().catch(() => {})
  await browser.close().catch(() => {})

  await flush()

  // Static site index the frontend loads instead of hitting the Sheet live.
  // Skipped for partial runs so a local test can't truncate the gallery.
  if (!partial) {
    // Domains that no longer exist are dropped from the gallery (re-checked daily,
    // so a one-off DNS blip only hides a site for a day).
    const dead = new Set(
      results.filter(r => r.status === 'dead' || /ERR_NAME_NOT_RESOLVED/.test(r.reason ?? '')).map(r => r.url)
    )
    const siteIndex = all.filter(entry => !dead.has(entry.url)).map(entry => {
      const filename = generateScreenshotFilename(entry.url)
      return {
        url: extractCleanUrl(entry.url),
        domain: entry.domain,
        dateAdded: entry.dateAdded,
        preview: existsSync(join(PREVIEWS_DIR, filename)) ? filename : null,
      }
    })
    writeFileSync(SITES_PATH, JSON.stringify(siteIndex, null, 2) + '\n')
    console.log(`🗂️  Wrote ${siteIndex.length} sites to ${SITES_PATH} (${dead.size} dead domains hidden)`)
  }

  const s = buildSummary(results, deduped.length)
  console.log('\n📊 Screenshot Generation Report:')
  console.log(`   Total:              ${s.total}`)
  console.log(`   Generated:          ${s.generated}`)
  console.log(`   Unchanged (kept):   ${s.unchanged}`)
  console.log(`   Blank frames:       ${s.blank}`)
  console.log(`   Updated:            ${s.updated}`)
  console.log(`   New:                ${s.new}`)
  console.log(`   Failed (kept prev): ${s.failedKept}`)
  console.log(`   Cloudflare rejected:${s.cloudflare}`)
  console.log(`   Timeouts:           ${s.timeout}`)
  console.log(`   Other errors:       ${s.otherErrors}`)
  console.log(`\n📁 Manifest: ${MANIFEST_PATH}`)
  console.log(`📄 Report:   ${REPORT_PATH}`)
}

function buildSummary(results: ScreenshotResult[], plannedTotal: number) {
  const success = results.filter(r => r.status === 'success')
  const ok = (r: ScreenshotResult) => r.status === 'success' || r.status === 'unchanged'
  return {
    timestamp: new Date().toISOString(),
    total: results.length,
    plannedTotal,
    generated: success.length,
    updated: success.filter(r => r.previousExisted).length,
    new: success.filter(r => !r.previousExisted).length,
    unchanged: results.filter(r => r.status === 'unchanged').length,
    blank: results.filter(r => r.status === 'blank').length,
    failedKept: results.filter(r => r.previousExisted && !ok(r)).length,
    cloudflare: results.filter(r => r.status === 'cloudflare').length,
    timeout: results.filter(r => r.status === 'timeout').length,
    otherErrors: results.filter(r => r.status === 'error' || r.status === 'failed').length,
    details: results.map(({ url: _u, ...rest }) => rest),
  }
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}

main().catch(err => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
