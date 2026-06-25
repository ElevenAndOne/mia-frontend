// @ts-nocheck
/**
 * Capture a full-page screenshot of every MIA route in light + dark themes,
 * for the lead designer's color/UI review. See docs/COLOR_OVERHAUL_PLAN.md §4.
 *
 * Prerequisites:
 *   1. Install the browser once:  npx playwright install chromium
 *   2. Serve the mock build, EITHER:
 *        - npm run dev:mock                 (dev server,  http://localhost:5180)
 *        - npm run build:mock && npm run preview:mock   (prod build, http://localhost:5180)
 *   3. Run:  PREVIEW_URL=http://localhost:5180 npm run screenshots
 *
 * Port 5180 is used (not 5173) so this never collides with the real frontend dev server.
 *
 * Output: screenshots/<theme>/<route>.png  (+ an index.html gallery)
 *
 * Resilient by design: a route that errors is logged and skipped so one broken
 * page never aborts the whole run.
 */
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const BASE = process.env.PREVIEW_URL || 'http://localhost:5180'
const OUT = 'screenshots'
const THEMES = ['light', 'dark']
const VIEWPORT = { width: 1440, height: 900 }

// name → path. Param routes use a mock id; they render only once the matching
// fixture exists (grow handlers.ts). Keep names filesystem-safe.
const ROUTES = [
  ['intro', '/'],
  ['home-chat', '/home'],
  ['integrations', '/integrations'],
  ['help', '/help'],
  // Campaigns is a single route; overview/calendar/builder are in-app tabs.
  ['campaigns', '/campaigns'],
  ['insights-grow', '/insights/grow'],
  ['insights-optimize', '/insights/optimize'],
  ['insights-protect', '/insights/protect'],
  ['insights-summary', '/insights/summary'],
  ['insights-strategise', '/insights/strategise'],
  ['reports', '/reports'],
  ['predict', '/predict'],
  ['budget-tracker', '/budget-tracker'],
  ['creative-studio', '/creative-studio'],
  ['settings-workspace', '/settings/workspace'],
  ['onboarding', '/onboarding'],
]

async function run() {
  const browser = await chromium.launch()
  const captured = { light: [], dark: [] }

  for (const theme of THEMES) {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
    // Seed theme + a session id before any app code runs.
    await context.addInitScript(
      ([t]) => {
        localStorage.setItem('mia_theme', t)
        localStorage.setItem('mia_session_id', 'mock_session_design_preview')
      },
      [theme]
    )
    const page = await context.newPage()

    for (const [name, path] of ROUTES) {
      const file = join(OUT, theme, `${name}.png`)
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 30000 })
        // Wait for data fetches to settle (campaigns does list→set-primary→detail).
        // Capped + caught so pages with a looping video/live connection (intro)
        // that never reach idle just proceed after the timeout.
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
        await page.waitForTimeout(900) // let animations/charts paint
        await mkdir(dirname(file), { recursive: true })
        await page.screenshot({ path: file, fullPage: true })
        captured[theme].push({ name, path, file })
        console.log(`✓ ${theme.padEnd(5)} ${path}`)
      } catch (err) {
        console.warn(`✗ ${theme.padEnd(5)} ${path} — ${err.message.split('\n')[0]}`)
      }
    }
    await context.close()
  }

  await writeGallery(captured)
  await browser.close()
  console.log(`\nDone. Open ${join(OUT, 'index.html')}`)
}

async function writeGallery(captured) {
  const rows = ROUTES.map(([name, path]) => {
    const cell = (theme) =>
      `<td><div class="lbl">${theme}</div><img src="${theme}/${name}.png" loading="lazy" alt="${name} ${theme}"/></td>`
    return `<tr><th>${name}<br><code>${path}</code></th>${cell('light')}${cell('dark')}</tr>`
  }).join('\n')

  const html = `<!doctype html><meta charset="utf-8"><title>MIA — page gallery</title>
<style>
  body{font-family:ui-sans-serif,system-ui;margin:24px;background:#f6f6f6;color:#1a1a1a}
  h1{font-size:20px} table{border-collapse:collapse;width:100%}
  th{text-align:left;vertical-align:top;padding:12px;width:160px;font-size:13px}
  td{padding:12px;width:50%} code{font-size:11px;color:#666}
  img{width:100%;border:1px solid #ddd;border-radius:8px;display:block}
  .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:6px}
  tr{border-bottom:1px solid #e3e3e3}
</style>
<h1>MIA page gallery — light vs dark</h1>
<table><tr><th></th><th>Light</th><th>Dark</th></tr>
${rows}
</table>`
  await mkdir(OUT, { recursive: true })
  await writeFile(join(OUT, 'index.html'), html)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
