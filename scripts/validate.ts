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

export async function validateScreenshot(
  page: Page,
  screenshotBuffer: Buffer
): Promise<ValidationResult> {
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
