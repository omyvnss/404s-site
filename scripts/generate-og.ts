import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// Renders the social share card (og.png) and apple-touch-icon from the logo
// (public/logo.svg), site type and real gallery previews. Run: npm run generate:og

const PUBLIC_DIR = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'public')

const BG = '#0f0f0f'
const TEXT = '#ffffff'
const MUTED = '#8a8a8a'

// Previews shown in the tilted mosaic — picked for contrast against each other.
const MOSAIC = [
  'significa.co.jpg', 'scope-typeface.com.jpg', 'bear-rabe.com.jpg',
  'vap.studio.jpg', 'orage.studio.jpg', 'filmograph.tv.jpg',
  'hot-corners.com.jpg', 'ariaprotocol.xyz.jpg', 'klim.co.nz.jpg',
  'metronome.com.jpg', 'cossette.com.jpg', '3200kelvin.com.jpg',
]

function dataUri(file: string, mime: string): string {
  return `data:${mime};base64,${readFileSync(join(PUBLIC_DIR, file)).toString('base64')}`
}

function fontFace(family: string, file: string): string {
  return `@font-face{font-family:'${family}';src:url(${dataUri(file, 'font/woff2')}) format('woff2');font-weight:100 900}`
}

const LOGO = readFileSync(join(PUBLIC_DIR, 'logo.svg'), 'utf-8')

const BASE_CSS = `
  ${fontFace('Geist', 'GeistVariableVF.woff2')}
  ${fontFace('Geist Mono', 'GeistMonoVariableVF.woff2')}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:${BG};color:${TEXT};-webkit-font-smoothing:antialiased;overflow:hidden}
`

function ogHtml(): string {
  const shots = MOSAIC.filter(f => existsSync(join(PUBLIC_DIR, 'previews', f)))
    .map(f => `<img src="${dataUri(join('previews', f), 'image/jpeg')}">`)
  const cols = [0, 1, 2].map(c => `<div class="col c${c}">${shots.filter((_, i) => i % 3 === c).join('')}</div>`)

  return `<!doctype html><html><head><style>
  ${BASE_CSS}
  body{width:1200px;height:630px;position:relative}
  .stage{position:absolute;left:560px;top:-140px;width:900px;height:980px;perspective:1800px}
  .grid{display:flex;gap:28px;transform:rotateX(18deg) rotateY(-14deg) rotateZ(-14deg);transform-origin:0 0}
  .col{display:flex;flex-direction:column;gap:28px;width:300px}
  .c1{margin-top:-110px}.c2{margin-top:-30px}
  .col img{width:300px;aspect-ratio:3/2;object-fit:cover;border-radius:8px;
    border:1px solid rgba(255,255,255,0.10);box-shadow:0 24px 48px rgba(0,0,0,0.55)}
  .fade{position:absolute;inset:0;background:linear-gradient(90deg,${BG} 0%,${BG} 44%,rgba(15,15,15,0.75) 56%,rgba(15,15,15,0) 74%)}
  .copy{position:absolute;left:80px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;width:560px}
  .logo{width:56px;height:56px;margin-bottom:48px}
  .logo svg{width:100%;height:100%}
  h1{font-family:'Geist',sans-serif;font-weight:500;font-size:68px;line-height:1;letter-spacing:-0.035em}
  h2{margin-top:30px;font-family:'Geist',sans-serif;font-weight:400;font-size:30px;color:#c8c8c8;letter-spacing:-0.01em}
  p{margin-top:14px;font-family:'Geist',sans-serif;font-size:21px;color:${MUTED}}
  .url{position:absolute;left:80px;bottom:56px;font-family:'Geist Mono',monospace;font-size:17px;color:#9a9a9a;letter-spacing:0.02em}
</style></head><body>
  <div class="stage"><div class="grid">${cols.join('')}</div></div>
  <div class="fade"></div>
  <div class="copy">
    <div class="logo">${LOGO}</div>
    <h1>404s VaultnCo</h1>
    <h2>Curated 404 pages</h2>
    <p>Pages not found, worth finding.</p>
  </div>
  <div class="url">404s.vaultnco.store</div>
</body></html>`
}

const ICON_HTML = `<!doctype html><html><head><style>
  ${BASE_CSS}
  body{width:180px;height:180px;display:flex;align-items:center;justify-content:center;background:#121212}
  svg{width:112px;height:112px}
</style></head><body>${LOGO}</body></html>`

async function main(): Promise<void> {
  const browser = await chromium.launch()

  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await og.setContent(ogHtml())
  await og.evaluate(() => document.fonts.ready)
  await og.screenshot({ path: join(PUBLIC_DIR, 'og.png') })

  const icon = await browser.newPage({ viewport: { width: 180, height: 180 } })
  await icon.setContent(ICON_HTML)
  await icon.screenshot({ path: join(PUBLIC_DIR, 'apple-touch-icon.png') })

  await browser.close()
  console.log('✅ Wrote og.png, apple-touch-icon.png')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
