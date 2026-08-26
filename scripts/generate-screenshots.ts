import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parseCSV, deduplicateSites, extractCleanUrl, generateScreenshotFilename, type SiteEntry } from './urls.js'
import { validateScreenshot } from './validate.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PROJECT_ROOT = resolve(__dirname, '..')
const PREVIEWS_DIR = join(PROJECT_ROOT, 'public', 'previews')
const MANIFEST_PATH = join(PREVIEWS_DIR, 'manifest.json')
const REPORT_PATH = join(PROJECT_ROOT, 'screenshot-report.json')

// Card displays at ~356px wide (3:2). 1280x853 captures full desktop layout;
// object-fit: cover crops vertically only, keeping the composition intact.
const CAPTURE_WIDTH = 1280
const CAPTURE_HEIGHT = Math.round((CAPTURE_WIDTH * 2) / 3) // 853 ≈ 3:2

// Allow slow real-world sites; not the old 3s client-side timeout.
const NAVIGATION_TIMEOUT = 30000
const NETWORK_IDLE_TIMEOUT = 8000
const RENDER_SETTLE_MS = 1500
const MAX_CONCURRENT = 3
const MAX_ATTEMPTS = 2 // initial try + 1 retry
const SAVE_EVERY = 5 // persist manifest/report incrementally

// Optional subset for local testing: LIMIT=10 npm run screenshots
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined

interface ScreenshotResult {
  url: string
  domain: string
  filename: string
  status: 'success' | 'failed' | 'cloudflare' | 'error' | 'timeout'
  previousExisted: boolean
  size?: number
  reason?: string
}

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

function classifyError(message: string): ScreenshotResult['status'] {
  const m = message.toLowerCase()
  if (m.includes('cloudflare') || m.includes('challenge') || m.includes('captcha')) return 'cloudflare'
  if (m.includes('timeout') || m.includes('timed out') || m.includes('navigation')) return 'timeout'
  if (
    m.includes('error_page') ||
    m.includes('blank_page') ||
    m.includes('no_visible_content') ||
    m.includes('dns') ||
    m.includes('connection') ||
    m.includes('net::err')
  ) {
    return 'error'
  }
  return 'failed'
}

async function captureSite(
  context: import('playwright').BrowserContext,
  entry: SiteEntry,
  filename: string,
  filepath: string,
  previousExisted: boolean
): Promise<ScreenshotResult> {
  const cleanUrl = extractCleanUrl(entry.url)
  let lastReason = 'Unknown error'

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const page = await context.newPage()
    try {
      await page.goto(cleanUrl, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT,
      })

      // Give JS-heavy pages time to render; don't fail hard on network idle.
      await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_TIMEOUT }).catch(() => {})
      await page.waitForTimeout(RENDER_SETTLE_MS)

      const screenshotBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        clip: { x: 0, y: 0, width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
        timeout: 20000,
      })

      const validation = await validateScreenshot(page, screenshotBuffer)
      if (!validation.valid) {
        lastReason = `${validation.reason}${validation.details?.matched ? ` (${String(validation.details.matched)})` : ''}`
        continue
      }

      writeFileSync(filepath, screenshotBuffer)
      return {
        url: entry.url,
        domain: entry.domain,
        filename,
        status: 'success',
        previousExisted,
        size: screenshotBuffer.length,
      }
    } catch (err) {
      lastReason = err instanceof Error ? err.message : String(err)
    } finally {
      // Always close the page so one crash can't poison the shared context.
      await page.close().catch(() => {})
    }
  }

  return {
    url: entry.url,
    domain: entry.domain,
    filename,
    status: classifyError(lastReason),
    previousExisted,
    reason: lastReason.split('\n')[0].slice(0, 120),
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

  const sites = parseCSV(csv)
  const all = deduplicateSites(sites)
  const deduped = LIMIT ? all.slice(0, LIMIT) : all
  console.log(`📋 Found ${sites.length} entries, ${deduped.length} after dedup${LIMIT ? ` (limited to ${LIMIT})` : ''}`)

  const manifest = loadJSON<Record<string, string>>(MANIFEST_PATH, {})

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  const context = await browser.newContext({
    viewport: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
    locale: 'en-US',
  })

  const queue = [...deduped]
  let processed = 0
  const results: ScreenshotResult[] = []

  async function flush(): Promise<void> {
    const summary = buildSummary(results, deduped.length)
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
    writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2))
  }

  async function worker(): Promise<void> {
    while (true) {
      const entry = queue.shift()
      if (!entry) break

      const filename = generateScreenshotFilename(entry.url)
      const filepath = join(PREVIEWS_DIR, filename)
      const previousExisted = existsSync(filepath)

      const result = await captureSite(context, entry, filename, filepath, previousExisted)
      results.push(result)
      processed++

      if (result.status === 'success') {
        manifest[extractCleanUrl(entry.url)] = filename
        console.log(
          `✅ [${processed}/${deduped.length}] ${entry.domain} (${result.size ?? 0} bytes)${previousExisted ? ' [updated]' : ' [new]'}`
        )
      } else {
        // Keep previous valid screenshot — do NOT overwrite with bad captures.
        console.log(`❌ [${processed}/${deduped.length}] ${entry.domain}: ${result.status} — ${result.reason}`)
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

  const s = buildSummary(results, deduped.length)
  console.log('\n📊 Screenshot Generation Report:')
  console.log(`   Total:              ${s.total}`)
  console.log(`   Generated:          ${s.generated}`)
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
  return {
    timestamp: new Date().toISOString(),
    total: results.length,
    plannedTotal,
    generated: success.length,
    updated: success.filter(r => r.previousExisted).length,
    new: success.filter(r => !r.previousExisted).length,
    failedKept: results.filter(r => r.previousExisted && r.status !== 'success').length,
    cloudflare: results.filter(r => r.status === 'cloudflare').length,
    timeout: results.filter(r => r.status === 'timeout').length,
    otherErrors: results.filter(r => r.status === 'error' || r.status === 'failed').length,
    details: results.map(({ url: _u, ...rest }) => rest),
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})
