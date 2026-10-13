import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, rmSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'
import { captureSite, launchCaptureBrowser } from '../capture.js'
import { extractDomainFromUrl, generateScreenshotFilename } from '../urls.js'
import { chat, extractJSON, listFreeModels } from './openrouter.js'
import { runStep, StepRejected, trace, type Step } from './pipeline.js'
import { FEEDS, UA, fetchFeed, shortlistHosts, type FeedItem } from './sources.js'

// Daily discovery engine: finds a new designed 404 page and adds it to the
// gallery. Every step is checked by a verifier before the next one runs.
//
//   collect → resolve (AI) → probe → capture → judge (AI) → cross-verify (2nd AI) → publish
//
// Env: OPENROUTER_API_KEY (required), DISCOVER_HOST (submit one specific site,
//      skipping collect/resolve), DISCOVER_MAX_NEW (default 1),
//      DISCOVER_MAX_CANDIDATES (default 15), DISCOVER_MIN_SCORE (default 7)

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DATA_DIR = join(ROOT, 'data')
const DISCOVERED_PATH = join(DATA_DIR, 'discovered.json')
const REJECTED_PATH = join(DATA_DIR, 'rejected.json')
const SITES_PATH = join(ROOT, 'public', 'sites.json')
const PREVIEWS_DIR = join(ROOT, 'public', 'previews')
const REPORT_PATH = join(ROOT, 'discover-report.json')

const MAX_NEW = Number(process.env.DISCOVER_MAX_NEW ?? 1)
const MAX_CANDIDATES = Number(process.env.DISCOVER_MAX_CANDIDATES ?? 15)
const MIN_SCORE = Number(process.env.DISCOVER_MIN_SCORE ?? 7)
const MANUAL_HOST = process.env.DISCOVER_HOST?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')

export interface DiscoveredSite {
  url: string
  domain: string
  dateAdded: string
  title: string
  source: string
  galleryUrl: string
  score: number
  models: { resolve: string; judge: string; verifier: string }
}

// Failures that say nothing about the site itself — never blacklist on these.
const TRANSIENT = /All models failed|OPENROUTER_API_KEY|fetch failed|timeout|aborted|HTTP (408|425|429|5\d\d)|ECONN|ENOTFOUND|EAI_AGAIN/i

type Rejected = Record<string, { step: string; reason: string; date: string }>

const today = () => new Date().toISOString().slice(0, 10)
const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, '')

function loadJSON<T>(path: string, fallback: T): T {
  try {
    return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf-8')) as T) : fallback
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------- steps

const collect: Step<void, FeedItem[]> = {
  name: 'collect',
  async run() {
    const results = await Promise.allSettled(Object.entries(FEEDS).map(([s, u]) => fetchFeed(s, u)))
    const lists = results.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []))
    // Interleave sources so one busy feed can't crowd out the rest.
    const out: FeedItem[] = []
    for (let i = 0; lists.some(l => i < l.length); i++) for (const l of lists) if (l[i]) out.push(l[i])
    return out
  },
  verify(items) {
    if (items.length === 0) return { ok: false, reason: 'no feed returned any items' }
    const bad = items.find(i => !/^https?:\/\/[^/]+\//.test(i.galleryUrl) || !i.title)
    if (bad) return { ok: false, reason: `malformed item: ${JSON.stringify(bad).slice(0, 120)}` }
    return { ok: true, note: `${items.length} items from ${new Set(items.map(i => i.source)).size} feeds` }
  },
}

interface ResolveIn {
  item: FeedItem
  shortlist: Array<{ host: string; url: string; count: number }>
  known: Set<string>
  textModels: string[]
}
interface ResolveOut {
  host: string
  model: string
}

const resolveSite: Step<ResolveIn, ResolveOut> = {
  name: 'resolve',
  attempts: 3,
  async run({ item, shortlist, textModels }, feedback) {
    const { model, text } = await chat({
      models: textModels,
      system:
        'You identify which website a design-gallery entry is featuring. Reply with JSON only: {"host": "<hostname>"}. The host MUST be copied exactly from the candidate list.',
      user: [
        `Gallery: ${item.source}`,
        `Entry title: ${item.title}`,
        `Entry description: ${item.description || '(none)'}`,
        `Candidate hosts linked from the entry page (host — link count):`,
        ...shortlist.map(s => `- ${s.host} — ${s.count}`),
        feedback ? `\nYour previous answer was rejected by the verifier: ${feedback}` : '',
      ].join('\n'),
      maxTokens: 200,
    })
    const parsed = extractJSON(text) as { host?: unknown }
    if (typeof parsed.host !== 'string') throw new Error(`no "host" string in reply: ${text.slice(0, 80)}`)
    return { host: parsed.host.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''), model }
  },
  async verify({ host }, { item, shortlist, known }) {
    if (!shortlist.some(s => s.host === host)) {
      return { ok: false, reason: `"${host}" is not in the candidate list (${shortlist.map(s => s.host).join(', ')})` }
    }
    if (known.has(bareHost(host))) return { ok: false, reason: `${host} is already in the gallery or rejected`, retry: false }

    // The chosen site must actually be the featured one: its homepage title or
    // hostname has to share a word with the gallery entry title.
    const res = await fetch(`https://${host}/`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
    const html = res.ok ? await res.text() : ''
    const haystack = `${host} ${html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? ''} ${html.match(/og:site_name"\s+content="([^"]*)/i)?.[1] ?? ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
    const words = item.title.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !['the', 'and', 'studio', 'website', 'inspiration'].includes(w))
    const hit = words.find(w => haystack.includes(w))
    if (!res.ok) return { ok: false, reason: `homepage of ${host} returned HTTP ${res.status}` }
    if (!hit) return { ok: false, reason: `${host} doesn't match entry "${item.title}" (no shared word in host/title)` }
    return { ok: true, note: `${host} matches "${item.title}" via "${hit}"` }
  },
}

interface ProbeOut {
  url: string
  status: number
}

const probe: Step<{ host: string }, ProbeOut> = {
  name: 'probe',
  async run({ host }) {
    const slug = `404s-vaultnco-${randomBytes(4).toString('hex')}`
    for (const path of ['/404', `/${slug}`]) {
      const url = `https://${host}${path}`
      const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) }).catch(() => null)
      if (!res) continue
      const final = new URL(res.url)
      const sameHost = bareHost(final.hostname) === bareHost(host)
      const stayed = final.pathname.replace(/\/$/, '') === path
      const body = res.status === 200 ? (await res.text()).slice(0, 200000) : ''
      const softNotFound = /\b404\b|not\s+found|doesn.?t\s+exist|page.{0,30}(missing|lost|gone)/i.test(body)
      if (sameHost && stayed && (res.status === 404 || res.status === 410 || (res.status === 200 && softNotFound))) {
        return { url, status: res.status }
      }
    }
    throw new Error('no reachable 404 page (redirects home, blocks bots, or returns a non-404 page)')
  },
  verify({ url, status }, { host }) {
    const u = new URL(url)
    if (bareHost(u.hostname) !== bareHost(host)) return { ok: false, reason: 'probe URL left the site', retry: false }
    if (u.pathname === '/' || u.pathname === '') return { ok: false, reason: 'probe resolved to the homepage', retry: false }
    return { ok: true, note: `${url} → HTTP ${status}` }
  },
}

interface CaptureIn {
  url: string
  host: string
  browser: Awaited<ReturnType<typeof launchCaptureBrowser>>
}

const capture: Step<CaptureIn, { filepath: string; filename: string }> = {
  name: 'capture',
  async run({ url, host, browser }) {
    const filename = generateScreenshotFilename(url)
    const filepath = join(PREVIEWS_DIR, filename)
    const entry = { url, domain: bareHost(host), dateAdded: today() }
    const result = await captureSite(browser.context, browser.scratch, entry, filename, filepath, false)
    if (result.status !== 'success') throw new Error(`${result.status}: ${result.reason ?? ''}`)
    return { filepath, filename }
  },
  verify({ filepath }) {
    // captureSite already rejects blank frames, challenge pages and browser errors.
    if (!existsSync(filepath)) return { ok: false, reason: 'screenshot file missing', retry: false }
    const size = statSync(filepath).size
    if (size < 5000) return { ok: false, reason: `screenshot suspiciously small (${size} bytes)`, retry: false }
    return { ok: true, note: `${(size / 1024).toFixed(0)} KB` }
  },
}

interface Judgement {
  is_error_page: boolean
  is_custom_design: boolean
  score: number
  reason: string
  model: string
}

const JUDGE_PROMPT = `You review screenshots for "404s", a gallery of 404 / page-not-found pages that were deliberately designed.
Answer with JSON only:
{"is_error_page": boolean, "is_custom_design": boolean, "score": integer 1-10, "reason": "<one sentence>"}
- is_error_page: the screenshot clearly shows a 404 / not-found / missing-page state (not a homepage, not a login wall, not a cookie wall).
- is_custom_design: it was designed for this brand (custom type, illustration, motion, copy or layout) — NOT a framework/host default like Next.js, Vercel, Netlify, nginx, Apache, WordPress theme defaults or a plain "Page not found" line.
- score: how much the page is worth featuring: 1-3 default/bland, 4-6 branded but ordinary, 7-8 memorable, 9-10 exceptional.`

function judgeStep(name: string, system: string): Step<{ filepath: string; models: string[] }, Judgement> {
  return {
    name,
    attempts: 2,
    async run({ filepath, models }, feedback) {
      const image = `data:image/jpeg;base64,${readFileSync(filepath).toString('base64')}`
      const { model, text } = await chat({
        models,
        system,
        user: [
          { type: 'text', text: feedback ? `Your previous reply was invalid: ${feedback}. Reply with the JSON object only.` : 'Review this screenshot.' },
          { type: 'image_url', image_url: { url: image } },
        ],
        maxTokens: 300,
      })
      return { ...(extractJSON(text) as Omit<Judgement, 'model'>), model }
    },
    verify(j) {
      if (typeof j.is_error_page !== 'boolean' || typeof j.is_custom_design !== 'boolean') {
        return { ok: false, reason: 'is_error_page / is_custom_design must be booleans' }
      }
      if (!Number.isInteger(j.score) || j.score < 1 || j.score > 10) return { ok: false, reason: 'score must be an integer 1-10' }
      if (typeof j.reason !== 'string' || j.reason.length < 5) return { ok: false, reason: 'reason must be a sentence' }
      return { ok: true, note: `${j.model}: error=${j.is_error_page} custom=${j.is_custom_design} score=${j.score} — ${j.reason}` }
    },
  }
}

const judge = judgeStep('judge', JUDGE_PROMPT)
// Independent second opinion from a different model, primed to be skeptical.
const crossVerify = judgeStep(
  'cross-verify',
  `${JUDGE_PROMPT}\nYou are the second, skeptical reviewer. Another model already approved this page; only agree if it truly belongs in a curated gallery.`
)

function agreement(a: Judgement, b: Judgement): { ok: true; note: string } | { ok: false; reason: string; retry: false } {
  const issues: string[] = []
  if (!a.is_error_page || !b.is_error_page) issues.push('not clearly a 404 page')
  if (!a.is_custom_design || !b.is_custom_design) issues.push('looks like a default/template 404')
  if (Math.min(a.score, b.score) < MIN_SCORE) issues.push(`score ${a.score}/${b.score} below ${MIN_SCORE}`)
  if (Math.abs(a.score - b.score) > 3) issues.push(`reviewers disagree (${a.score} vs ${b.score})`)
  return issues.length
    ? { ok: false, reason: issues.join('; '), retry: false }
    : { ok: true, note: `both reviewers approve (${a.score}, ${b.score})` }
}

const publish: Step<DiscoveredSite, DiscoveredSite[]> = {
  name: 'publish',
  async run(site) {
    const list = loadJSON<DiscoveredSite[]>(DISCOVERED_PATH, [])
    list.unshift(site)
    writeFileSync(DISCOVERED_PATH, JSON.stringify(list, null, 2) + '\n')
    return loadJSON<DiscoveredSite[]>(DISCOVERED_PATH, [])
  },
  verify(list, site) {
    const mine = list.filter(s => s.domain === site.domain)
    if (mine.length !== 1) return { ok: false, reason: `expected 1 entry for ${site.domain}, found ${mine.length}`, retry: false }
    const broken = list.find(s => !/^https:\/\//.test(s.url) || !s.domain || !/^\d{4}-\d{2}-\d{2}$/.test(s.dateAdded))
    if (broken) return { ok: false, reason: `invalid entry ${JSON.stringify(broken).slice(0, 120)}`, retry: false }
    if (!existsSync(join(PREVIEWS_DIR, generateScreenshotFilename(site.url)))) {
      return { ok: false, reason: 'preview file missing after publish', retry: false }
    }
    return { ok: true, note: `${site.domain} added (${list.length} discovered total)` }
  },
}

// ---------------------------------------------------------------- main

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    // Not fatal: the daily screenshot refresh still runs without discovery.
    console.log('::warning::OPENROUTER_API_KEY not set — skipping discovery')
    return
  }
  mkdirSync(DATA_DIR, { recursive: true })
  const discovered = loadJSON<DiscoveredSite[]>(DISCOVERED_PATH, [])
  const rejected = loadJSON<Rejected>(REJECTED_PATH, {})
  const sites = loadJSON<Array<{ url: string }>>(SITES_PATH, [])

  const known = new Set<string>([
    ...sites.map(s => bareHost(extractDomainFromUrl(s.url))),
    ...discovered.map(s => bareHost(s.domain)),
    ...Object.keys(rejected).filter(k => !k.startsWith('http')),
    ...Object.keys(loadJSON<Record<string, string>>(join(DATA_DIR, 'blocklist.json'), {})),
  ])

  const models = await listFreeModels()
  const textModels = models.map(m => m.id)
  const visionModels = models.filter(m => m.vision).map(m => m.id)
  if (visionModels.length < 2) throw new Error(`need 2 free vision models for judge + verifier, found ${visionModels.length}`)
  console.log(`🤖 ${models.length} free models (${visionModels.length} vision): ${visionModels.slice(0, 4).join(', ')}…`)

  const items = MANUAL_HOST
    ? [{ source: 'manual', title: MANUAL_HOST, description: '', galleryUrl: `manual:${MANUAL_HOST}` }]
    : (await runStep(collect, undefined, 'feeds')).filter(i => !rejected[i.galleryUrl])
  const browser = await launchCaptureBrowser()
  const added: DiscoveredSite[] = []
  let tried = 0

  const reject = (key: string, err: unknown) => {
    // Only remember real verdicts — transient API/network failures get retried tomorrow.
    if (err instanceof StepRejected && !TRANSIENT.test(err.reason)) {
      rejected[key] = { step: err.step, reason: err.reason.slice(0, 200), date: today() }
    }
  }

  try {
    for (const item of items) {
      if (added.length >= MAX_NEW || tried >= MAX_CANDIDATES) break
      tried++
      console.log(`\n🔎 [${tried}] ${item.title} (${item.source})`)

      let host: string
      let resolveModel: string
      try {
        if (MANUAL_HOST) {
          if (known.has(bareHost(MANUAL_HOST))) throw new StepRejected('resolve', `${MANUAL_HOST} is already in the gallery`)
          host = MANUAL_HOST
          resolveModel = 'manual'
        } else {
          const shortlist = await shortlistHosts(item.galleryUrl)
          if (shortlist.length === 0) throw new StepRejected('resolve', 'no external links on gallery page')
          const r = await runStep(resolveSite, { item, shortlist, known, textModels }, item.title)
          host = r.host
          resolveModel = r.model
        }
      } catch (err) {
        console.log(`  ↳ skipped: ${err instanceof Error ? err.message : err}`)
        reject(item.galleryUrl, err instanceof StepRejected ? err : new StepRejected('resolve', err instanceof Error ? err.message : String(err)))
        continue
      }

      let previewPath: string | undefined
      try {
        const { url } = await runStep(probe, { host }, host)
        const shot = await runStep(capture, { url, host, browser }, host)
        previewPath = shot.filepath
        const a = await runStep(judge, { filepath: shot.filepath, models: visionModels }, host)
        // Verifier must be a different model than the judge.
        const b = await runStep(crossVerify, { filepath: shot.filepath, models: visionModels.filter(m => m !== a.model) }, host)
        await runStep({ name: 'consensus', run: async () => agreement(a, b), verify: v => v }, undefined, host)

        const site: DiscoveredSite = {
          url,
          domain: bareHost(host),
          dateAdded: today(),
          title: item.title,
          source: item.source,
          galleryUrl: item.galleryUrl,
          score: Math.round((a.score + b.score) / 2),
          models: { resolve: resolveModel, judge: a.model, verifier: b.model },
        }
        await runStep(publish, site, host)
        added.push(site)
        known.add(site.domain)
        console.log(`  🎉 added ${site.domain}`)
        previewPath = undefined
      } catch (err) {
        // Anything that didn't make it into the gallery leaves no preview behind.
        if (previewPath) rmSync(previewPath, { force: true })
        if (err instanceof StepRejected && /HTTP 401|HTTP 402/.test(err.reason)) {
          throw new Error(`OpenRouter rejected the API key or account (${err.reason.match(/HTTP 40[12]/)?.[0]}) — aborting`)
        }
        console.log(`  ↳ rejected: ${err instanceof Error ? err.message : err}`)
        reject(bareHost(host), err)
        reject(item.galleryUrl, err)
        known.add(bareHost(host))
      }
    }
  } finally {
    await browser.browser.close().catch(() => {})
    writeFileSync(REJECTED_PATH, JSON.stringify(rejected, null, 2) + '\n')
    writeFileSync(REPORT_PATH, JSON.stringify({ date: today(), tried, added, trace }, null, 2))
  }

  console.log(`\n📊 tried ${tried}, added ${added.length}: ${added.map(a => a.domain).join(', ') || '—'}`)
}

main().catch(err => {
  console.error('💥', err instanceof Error ? err.message : err)
  process.exit(1)
})
