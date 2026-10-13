import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'
import { extractCleanUrl, type SiteEntry } from './urls.js'
import { validateScreenshot } from './validate.js'
import { getImageStats, thumbDiff } from './image-stats.js'

// Shared by generate-screenshots.ts (daily refresh) and discover/ (new sites).

// Card displays at ~356px wide (3:2). 1280x853 captures full desktop layout;
// object-fit: cover crops vertically only, keeping the composition intact.
export const CAPTURE_WIDTH = 1280
export const CAPTURE_HEIGHT = Math.round((CAPTURE_WIDTH * 2) / 3) // 853 ≈ 3:2

// Allow slow real-world sites; not the old 3s client-side timeout.
export const NAVIGATION_TIMEOUT = 30000
export const NETWORK_IDLE_TIMEOUT = 8000
// Progressive settle: re-shoot the same page until preloaders/intros finish.
export const SETTLE_STEPS_MS = [2000, 2000, 3000, 5000]
// Consecutive shots closer than this = the page has finished loading/settling.
export const STABLE_DIFF = 4
export const MAX_ATTEMPTS = 2 // initial navigation + 1 retry
// Fewer content pixels than this (of 640x427) = flat frame: black intro, blank canvas.
export const MIN_CONTENT_PIXELS = 300
// Mean thumbnail diff below this = visually the same page; keep the old file
// so daily runs don't churn ~13MB of JPEGs into git history.
export const UNCHANGED_DIFF = 3

// Common consent/cookie overlays — hidden so they don't cover the 404 design.
export const HIDE_OVERLAYS_CSS = `
  #onetrust-consent-sdk, #CybotCookiebotDialog, #cookiebanner, #cookie-banner,
  #cookie-notice, #cookie-law-info-bar, .cc-window, .cky-consent-container,
  .osano-cm-window, #usercentrics-root, #axeptio_overlay, .iubenda-cs-container,
  #didomi-host, .qc-cmp2-container, #termly-code-snippet-support,
  [aria-label="cookieconsent"], [id*="cookie-consent" i], [class*="cookie-consent" i],
  [class*="CookieBanner" i], [class*="cookie-banner" i],
  #intercom-container, .intercom-lightweight-app, #hubspot-messages-iframe-container,
  .crisp-client, #crisp-chatbox, .drift-frame-controller
  { display: none !important; visibility: hidden !important; }
  html, body { overflow: hidden !important; }
`

export interface ScreenshotResult {
  url: string
  domain: string
  filename: string
  status: 'success' | 'unchanged' | 'blank' | 'dead' | 'failed' | 'cloudflare' | 'error' | 'timeout'
  previousExisted: boolean
  size?: number
  reason?: string
}

export async function launchCaptureBrowser() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      // Software WebGL so canvas/three.js 404 pages render instead of black frames.
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--hide-scrollbars',
    ],
  })

  // Match the real bundled Chromium version — a stale UA triggers
  // "Update your browser" banners on some sites.
  const chromeMajor = browser.version().split('.')[0]
  const context = await browser.newContext({
    viewport: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`,
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    colorScheme: 'light',
  })
  // Blank page used only to decode JPEGs for pixel checks.
  const scratch = await context.newPage()
  return { browser, context, scratch }
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

// Click the consent banner's accept button (removes its backdrop too), then hide
// any fixed cookie/consent layer that is left. A string, not a function: tsx
// would inject helpers that don't exist in the page.
const DISMISS_CONSENT_JS = `(() => {
  const WORDS = /cookie|consent|privacy|gdpr|tracking|datenschutz|données/i
  const ACCEPT = /^(accept|accept all|accept cookies|accept all cookies|allow|allow all|allow all cookies|agree|i agree|got it|ok|okay|understood|continue|accepter|tout accepter|j'accepte|akzeptieren|alle akzeptieren|aceptar|accetta|accetto)$/i
  let clicked = 0
  for (const el of document.querySelectorAll('button, a, [role=button], input[type=button], input[type=submit]')) {
    const label = (el.innerText || el.value || '').trim().replace(/\\s+/g, ' ')
    if (!ACCEPT.test(label)) continue
    let node = el
    for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
      if (WORDS.test(node.innerText || '')) { el.click(); clicked++; break }
    }
  }
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue
    const r = el.getBoundingClientRect()
    if (r.width * r.height > innerWidth * innerHeight * 0.6) continue
    if (WORDS.test(el.innerText || '') && (el.innerText || '').length < 1500) el.style.setProperty('display', 'none', 'important')
  }
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  return clicked
})()`

export async function captureSite(
  context: import('playwright').BrowserContext,
  scratch: import('playwright').Page,
  entry: SiteEntry,
  filename: string,
  filepath: string,
  previousExisted: boolean
): Promise<ScreenshotResult> {
  const cleanUrl = extractCleanUrl(entry.url)
  const base = { url: entry.url, domain: entry.domain, filename, previousExisted }
  let lastReason = 'Unknown error'
  let sawBlank = false

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const page = await context.newPage()
    try {
      await page.goto(cleanUrl, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT,
      })

      // Give JS-heavy pages time to render; don't fail hard on network idle.
      await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_TIMEOUT }).catch(() => {})
      await page.addStyleTag({ content: HIDE_OVERLAYS_CSS }).catch(() => {})

      let previousShot: number[] | undefined
      for (const [step, settle] of SETTLE_STEPS_MS.entries()) {
        const lastStep = step === SETTLE_STEPS_MS.length - 1
        await page.waitForTimeout(settle)
        // Banners often mount late, so dismiss on every pass.
        await page.evaluate(DISMISS_CONSENT_JS).catch(() => {})
        await page.waitForTimeout(250)
        await page.evaluate('window.scrollTo(0, 0)').catch(() => {})

        const shot = await page.screenshot({
          type: 'jpeg',
          quality: 82,
          clip: { x: 0, y: 0, width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
          timeout: 20000,
        })

        const validation = await validateScreenshot(page, shot, cleanUrl)
        if (!validation.valid) {
          lastReason = `${validation.reason}${validation.details?.matched ? ` (${String(validation.details.matched)})` : ''}`
          if (validation.reason === 'site_dead') return { ...base, status: 'dead', reason: lastReason }
          break // challenge/error page — waiting longer won't help
        }

        const stats = await getImageStats(scratch, shot)
        if (stats.contentPixels < MIN_CONTENT_PIXELS) {
          // Preloader, black intro or unrendered canvas — wait and re-shoot.
          sawBlank = true
          lastReason = `blank_frame (${stats.contentPixels} content px)`
          continue
        }

        // Loaders and intros: keep waiting until two shots in a row match.
        // Pages that animate forever just get the final, longest-settled shot.
        const settled = previousShot !== undefined && thumbDiff(previousShot, stats.thumb) < STABLE_DIFF
        previousShot = stats.thumb
        if (!settled && !lastStep) continue

        // FORCE_REFRESH=1 rewrites every preview (use after changing capture rules).
        if (previousExisted && !process.env.FORCE_REFRESH) {
          const prev = await getImageStats(scratch, readFileSync(filepath))
          // Never keep an old file that is itself near-blank.
          if (prev.contentPixels >= MIN_CONTENT_PIXELS && thumbDiff(prev.thumb, stats.thumb) < UNCHANGED_DIFF) {
            return { ...base, status: 'unchanged', size: shot.length }
          }
        }

        writeFileSync(filepath, shot)
        return { ...base, status: 'success', size: shot.length }
      }
    } catch (err) {
      lastReason = err instanceof Error ? err.message : String(err)
    } finally {
      // Always close the page so one crash can't poison the shared context.
      await page.close().catch(() => {})
    }
  }

  return {
    ...base,
    status: sawBlank && lastReason.startsWith('blank_frame') ? 'blank' : classifyError(lastReason),
    reason: lastReason.split('\n')[0].slice(0, 120),
  }
}

/** A stored preview that is itself a flat frame is worse than the placeholder. */
export async function isBlankFile(scratch: import('playwright').Page, filepath: string): Promise<boolean> {
  try {
    return (await getImageStats(scratch, readFileSync(filepath))).contentPixels < MIN_CONTENT_PIXELS
  } catch {
    return false // can't tell — never delete on uncertainty
  }
}

