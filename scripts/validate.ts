import type { Page } from 'playwright'

export interface ValidationResult {
  valid: boolean
  reason?: string
  details?: Record<string, unknown>
}

/**
 * Challenge/block pages detected via TITLE and visible BODY TEXT.
 * NOTE: we deliberately do NOT scan raw HTML for "cloudflare" — most legit
 * sites include Cloudflare's CDN script, which would false-positive.
 * Also note: "page not found" / "404" are NOT error indicators here —
 * every site in this gallery intentionally serves a designed 404 page.
 */
const CHALLENGE_TITLE_PATTERNS = [
  'just a moment',
  'attention required',
  'access denied',
  'please wait',
  'security check',
  'checking your browser',
]

const CHALLENGE_TEXT_PATTERNS = [
  'checking your browser before accessing',
  'verify you are human',
  "verify you're human",
  'confirm you are human',
  'enable javascript and cookies to continue',
  'needs to review the security of your connection',
  'ddos protection by',
  'completing the challenge',
  'captcha-delivery.com',
  'px-captcha',
  'cf-challenge',
  'cf_chl_opt',
  'turnstile',
]

/** Browser-level failure pages (Chrome error screens have no useful content). */
const BROWSER_ERROR_PATTERNS = [
  'this site can’t be reached',
  "this site can't be reached",
  'server ip address could not be found',
  'dns_probe_finished_nxdomain',
  'err_connection_refused',
  'err_connection_timed_out',
  'err_name_not_resolved',
  'err_ssl_protocol_error',
  'err_cert_common_name_invalid',
  'your connection is not private',
]

/**
 * The site itself is gone or replaced — parked domain, suspended host, paused
 * deployment, Cloudflare origin error. These are hidden from the gallery.
 */
const DEAD_SITE_PATTERNS = [
  'this service has been suspended',
  'account has been suspended',
  'this account has been suspended',
  'deployment is temporarily paused',
  'this deployment has been disabled',
  'deployment_not_found',
  'domain is for sale',
  'domain for sale',
  'domain may be for sale',
  'buy this domain',
  'this domain is parked',
  'domain has expired',
  "there isn't a github pages site here",
  'site not found · github pages',
  'project not found',
  'web server is down',
  'connection timed out error code',
  'origin is unreachable',
  'cloudflare ray id',
]

const PARKING_HOSTS =
  /^(expireddomains|afternic|godaddy|sedo|dan|hugedomains|undeveloped|parkingcrew|bodis|namecheap|porkbun|squadhelp|atom|spaceship|domainmarket|brandbucket|sav|epik|uniregistry|above|parklogic|domainnamesales)\.(com|net|io|co)$/

/** "studio.co.uk" for "www.studio.co.uk" — good enough to spot off-site redirects. */
function siteKey(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, '').split('.')
  const twoPartTld = parts.length > 2 && parts[parts.length - 2].length <= 3 && parts[parts.length - 1].length === 2
  return parts.slice(twoPartTld ? -3 : -2).join('.')
}

export async function validateScreenshot(
  page: Page,
  screenshotBuffer: Buffer,
  requestedUrl?: string
): Promise<ValidationResult> {
  // Redirected to a different site (domain marketplace, parked page, rebrand).
  if (requestedUrl) {
    try {
      const from = siteKey(new URL(requestedUrl).hostname)
      const to = siteKey(new URL(page.url()).hostname)
      // A rebrand (vana.com → vana.org) still shows the brand's own 404; only
      // domain marketplaces and parking hosts mean the site is gone.
      if (from !== to && PARKING_HOSTS.test(to)) {
        return { valid: false, reason: 'site_dead', details: { matched: `redirected to ${to}` } }
      }
    } catch {
      /* ignore unparsable URLs */
    }
  }

  // 1. Screenshot sanity checks (JPEG: FF D8 FF)
  if (screenshotBuffer.length < 3000) {
    return {
      valid: false,
      reason: 'screenshot_too_small',
      details: { size: screenshotBuffer.length },
    }
  }
  const sig = screenshotBuffer.subarray(0, 3)
  const isJpeg = sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff
  if (!isJpeg) {
    return { valid: false, reason: 'invalid_image_format' }
  }

  // 2. Title-based challenge detection
  let title = ''
  try {
    title = (await page.title()).toLowerCase()
  } catch {
    /* ignore */
  }
  for (const pattern of CHALLENGE_TITLE_PATTERNS) {
    if (title.includes(pattern)) {
      return {
        valid: false,
        reason: 'challenge_detected',
        details: { matched: pattern, source: 'title' },
      }
    }
  }

  // 3. Visible-text-based detection
  let bodyText = ''
  try {
    bodyText = ((await page.textContent('body')) || '').toLowerCase()
  } catch {
    /* ignore */
  }

  for (const pattern of CHALLENGE_TEXT_PATTERNS) {
    if (bodyText.includes(pattern)) {
      return {
        valid: false,
        reason: 'challenge_detected',
        details: { matched: pattern, source: 'text' },
      }
    }
  }

  for (const pattern of BROWSER_ERROR_PATTERNS) {
    if (bodyText.includes(pattern)) {
      return {
        valid: false,
        reason: 'browser_error_page',
        details: { matched: pattern },
      }
    }
  }

  for (const pattern of DEAD_SITE_PATTERNS) {
    if (bodyText.includes(pattern)) {
      return { valid: false, reason: 'site_dead', details: { matched: pattern } }
    }
  }

  // Unstyled server text ("HTTP Status: 404", "Not Found") — not a designed page.
  const bare = await page
    .evaluate(`(() => {
      const visual = document.querySelectorAll('img, svg, canvas, video, picture, iframe').length
      // Ignore the overlay-hiding sheet and inline styles our capture injects.
      const sheets = [...document.styleSheets].filter(s => !(s.ownerNode && (s.ownerNode.textContent || '').includes('onetrust-consent-sdk')))
      const styled = sheets.length + document.querySelectorAll('body [style]:not([style*="display: none"])').length
      return visual === 0 && styled === 0
    })()`)
    .catch(() => false)
  if (bare && bodyText.replace(/\s+/g, ' ').trim().length < 200) {
    return { valid: false, reason: 'site_dead', details: { matched: 'unstyled server page' } }
  }

  // 4. Blank-page detection: near-empty body with no meaningful title
  const trimmed = bodyText.replace(/\s+/g, '')
  if (trimmed.length < 20 && title.trim().length === 0) {
    return {
      valid: false,
      reason: 'blank_page',
      details: { bodyLength: trimmed.length },
    }
  }

  return { valid: true }
}
