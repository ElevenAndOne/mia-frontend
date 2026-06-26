/**
 * Live theme editor — MOCK_MODE only.
 *
 * Floating 🎨 panel that recolours the whole app live with no code. Controls are
 * organised into collapsible groups, most-important first (Brand & theme), then
 * status colours, then per-page/component sections. Each control offers the 12
 * brand swatches + a hex field + a native picker. Picking regenerates a colour's
 * 50–950 ramp (for the "ramp" controls) or sets a token directly, by writing CSS
 * custom properties on :root — the same tokens the app reads. "Export" copies the
 * chosen values. Lazy + flag-gated in main.tsx, so it's stripped from production.
 */
import { useEffect, useState } from 'react'

// ── the 12 official brand swatches ────────────────────────────────────────────
const PALETTE: { name: string; hex: string }[] = [
  { name: 'Raspberry', hex: '#C54966' }, { name: 'Golden', hex: '#F4C247' },
  { name: 'Peach', hex: '#FFBE98' }, { name: 'Sage', hex: '#BABC72' },
  { name: 'Periwinkle', hex: '#8398CA' }, { name: 'Petrol-Teal', hex: '#007A9B' },
  { name: 'Cream', hex: '#F0EEE9' }, { name: 'Rose', hex: '#E499BA' },
  { name: 'Mauve', hex: '#9F8286' }, { name: 'Terracotta', hex: '#E15D44' },
  { name: 'Ink', hex: '#0E131A' }, { name: 'Turquoise', hex: '#44B8AB' },
]

// ── colour maths (HSL ramp from a single anchor) ──────────────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let hue = 0
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue /= 6; if (hue < 0) hue += 1
  }
  return [hue, s, l]
}
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h * 6) % 2) - 1)), m = l - c / 2
  let r = 0, g = 0, b = 0
  const seg = Math.floor(h * 6)
  if (seg === 0) [r, g, b] = [c, x, 0]
  else if (seg === 1) [r, g, b] = [x, c, 0]
  else if (seg === 2) [r, g, b] = [0, c, x]
  else if (seg === 3) [r, g, b] = [0, x, c]
  else if (seg === 4) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const LF: Record<number, number> = { 50: 0.92, 100: 0.84, 200: 0.7, 300: 0.45, 400: 0.2, 500: 0, 600: -0.14, 700: -0.28, 800: -0.42, 900: -0.54, 950: -0.67 }
const SF: Record<number, number> = { 50: 0.6, 100: 0.7, 200: 0.82, 300: 0.92, 400: 0.98, 500: 1, 600: 1, 700: 1, 800: 0.97, 900: 0.94, 950: 0.9 }
function applyRamp(ramp: string, anchor: string) {
  const [h, s, l] = hexToHsl(anchor)
  for (const st of STEPS) {
    const f = LF[st], L = f >= 0 ? l + (1 - l) * f : l * (1 + f)
    document.documentElement.style.setProperty(`--color-${ramp}-${st}`, hslToHex(h, Math.min(1, s * SF[st]), Math.max(0, Math.min(1, L))))
  }
}

// ── control model ─────────────────────────────────────────────────────────────
type Ctl = { key: string; label: string; group: string; def: string; ramp?: string; cssVar?: string; vars?: string[] }
const GROUPS: { id: string; label: string }[] = [
  { id: 'brand', label: 'Brand & theme' },
  { id: 'status', label: 'Status colours' },
  { id: 'chat', label: 'Chat & home' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'metrics', label: 'Metrics & KPI' },
  { id: 'charts', label: 'Chart / channel colours' },
]
const CHART_CONTROLS: Ctl[] = [
  ['organic_social', 'Organic Social', '#8398ca'], ['meta_ads', 'Meta Ads', '#5c78ba'],
  ['google_ads', 'Google Ads', '#f4c247'], ['google_display', 'Google Display', '#e2a50e'],
  ['email', 'Email', '#44b8ab'], ['brevo', 'Brevo', '#e15d44'],
  ['mailchimp', 'Mailchimp', '#ffbe98'], ['website', 'Website', '#e499ba'],
  ['seo', 'SEO', '#007a9b'], ['linkedin_ads', 'LinkedIn Ads', '#3c538b'],
  ['linkedin_organic', 'LinkedIn Organic', '#a1b0d4'], ['tiktok_ads', 'TikTok Ads', '#c54966'],
  ['tiktok_influencers', 'TikTok Influencers', '#df95b6'], ['hubspot', 'HubSpot', '#d88818'],
  ['offline_event', 'Offline Event', '#9f8286'], ['packaging', 'Packaging', '#babc72'],
  ['point_of_sale', 'Point of Sale', '#379086'], ['printing', 'Printing', '#b3361e'],
].map(([k, label, def]) => ({ key: `ch_${k}`, label, group: 'charts', cssVar: `--ch-${k}`, def }))
const CONTROLS: Ctl[] = [
  // Brand & theme (the foundation — most impactful)
  { key: 'brand', label: 'Brand / primary', group: 'brand', ramp: 'purple', def: '#007A9B' },
  { key: 'pagebg', label: 'Page background', group: 'brand', cssVar: '--color-background-canvas', def: '#f0eee9' },
  { key: 'card', label: 'Card surface', group: 'brand', cssVar: '--color-background-primary', def: '#ffffff' },
  { key: 'sidebar', label: 'Sidebar', group: 'brand', cssVar: '--ui-sidebar', def: '#ffffff' },
  { key: 'topbar', label: 'Top bar', group: 'brand', cssVar: '--ui-topbar', def: '#ffffff' },
  { key: 'navActive', label: 'Active nav item', group: 'brand', cssVar: '--ui-nav-active', def: '#f8f7f4' },
  { key: 'panel', label: 'Panel / hover', group: 'brand', cssVar: '--color-background-secondary', def: '#f8f7f4' },
  { key: 'border', label: 'Borders', group: 'brand', cssVar: '--color-border-tertiary', def: '#d2cec6', vars: ['--color-border-primary', '--color-border-secondary', '--color-border-tertiary'] },
  // Status
  { key: 'success', label: 'Success', group: 'status', ramp: 'green', def: '#BABC72' },
  { key: 'warning', label: 'Warning', group: 'status', ramp: 'yellow', def: '#F4C247' },
  { key: 'error', label: 'Error', group: 'status', ramp: 'red', def: '#C54966' },
  { key: 'info', label: 'Info', group: 'status', ramp: 'blue', def: '#8398CA' },
  // Chat & home
  { key: 'chat', label: 'Chat box', group: 'chat', cssVar: '--ui-chat', def: '#f6f5f2' },
  { key: 'bubbleUser', label: 'Chat bubble (you)', group: 'chat', cssVar: '--ui-bubble-user', def: '#f6f5f2' },
  { key: 'bubbleMia', label: 'Chat bubble (Mia)', group: 'chat', cssVar: '--ui-bubble-mia', def: '#f8f7f4' },
  // Campaigns
  { key: 'phase0', label: 'Phase · Awareness', group: 'campaigns', cssVar: '--ui-phase-0', def: '#8398ca' },
  { key: 'phase1', label: 'Phase · Engagement', group: 'campaigns', cssVar: '--ui-phase-1', def: '#44b8ab' },
  { key: 'phase2', label: 'Phase · Conversion', group: 'campaigns', cssVar: '--ui-phase-2', def: '#f4c247' },
  { key: 'phase3', label: 'Phase · Loyalty', group: 'campaigns', cssVar: '--ui-phase-3', def: '#e499ba' },
  // Metrics
  { key: 'metric', label: 'KPI / metric numbers', group: 'metrics', cssVar: '--ui-metric', def: '#1c1a18' },
  // Chart / channel colours (18) — appended from CHART_CONTROLS
  ...CHART_CONTROLS,
]

const HEX = /^#[0-9a-fA-F]{6}$/
const read = (v: string, f: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || f
const eqHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const hexStyle: React.CSSProperties = { width: 74, background: '#0e141b', color: '#f0eee9', border: '1px solid #302e2a', borderRadius: 6, padding: '3px 6px', fontFamily: 'monospace', fontSize: 12 }

function applyCtl(c: Ctl, hex: string) {
  if (c.ramp) applyRamp(c.ramp, hex)
  else (c.vars ?? [c.cssVar!]).forEach((v) => document.documentElement.style.setProperty(v, hex))
}
function seedCtl(c: Ctl): string {
  if (c.ramp) return read(`--color-${c.ramp}-500`, c.def)
  return read(c.cssVar ?? c.vars?.[0] ?? '', c.def)
}

export default function ThemeEditor() {
  const [open, setOpen] = useState(false)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ brand: true })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || Object.keys(vals).length) return
    const v: Record<string, string> = {}
    for (const c of CONTROLS) v[c.key] = seedCtl(c)
    setVals(v)
  }, [open, vals])

  const setVal = (c: Ctl, hex: string) => { setVals((p) => ({ ...p, [c.key]: hex })); applyCtl(c, hex) }
  const onExport = () => {
    const out = Object.fromEntries(CONTROLS.map((c) => [c.key, vals[c.key] || c.def]))
    navigator.clipboard?.writeText(JSON.stringify(out, null, 2))
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const wrap: React.CSSProperties = { position: 'fixed', right: 16, bottom: 16, zIndex: 99999, fontFamily: 'ui-sans-serif, system-ui', fontSize: 13 }
  if (!open) {
    return (
      <div style={wrap}>
        <button onClick={() => setOpen(true)} style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 16px', boxShadow: '0 4px 16px rgba(0,0,0,.3)', cursor: 'pointer' }}>🎨 Theme</button>
      </div>
    )
  }

  const swatchRow = (current: string, onPick: (hex: string) => void) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
      {PALETTE.map((sw) => {
        const active = eqHex(current, sw.hex)
        return (
          <button key={sw.hex} title={sw.name} onClick={() => onPick(sw.hex)}
            style={{ width: 20, height: 20, borderRadius: 5, cursor: 'pointer', background: sw.hex, border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,.25)', outline: active ? '2px solid #00a3cf' : 'none', padding: 0 }} />
        )
      })}
    </div>
  )

  const row = (c: Ctl) => {
    const cur = vals[c.key] ?? c.def
    const valid = HEX.test(cur)
    return (
      <div key={c.key} style={{ marginBottom: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ flex: 1 }}>{c.label}</span>
          <input type="text" value={cur} spellCheck={false} placeholder="#000000"
            onChange={(e) => { const v = e.target.value; setVals((p) => ({ ...p, [c.key]: v })); if (HEX.test(v)) applyCtl(c, v) }}
            style={hexStyle} />
          <input type="color" value={valid ? cur : '#000000'} onChange={(e) => setVal(c, e.target.value)}
            title="custom colour" style={{ width: 28, height: 22, border: 'none', background: 'none', cursor: 'pointer' }} />
        </div>
        {swatchRow(cur, (hex) => setVal(c, hex))}
      </div>
    )
  }

  return (
    <div style={{ ...wrap, width: 300, maxHeight: '88vh', overflowY: 'auto', background: '#1c1a18', color: '#f0eee9', borderRadius: 14, padding: 16, boxShadow: '0 10px 40px rgba(0,0,0,.45)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <strong>Theme editor</strong>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#8596ad', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      <p style={{ color: '#8596ad', fontSize: 11, margin: '0 0 12px' }}>12 brand colours (or custom hex) per item. Toggle Light/Dark in the sidebar to check both.</p>

      {GROUPS.map((g) => {
        const items = CONTROLS.filter((c) => c.group === g.id)
        const isOpen = !!openGroups[g.id]
        return (
          <div key={g.id} style={{ borderTop: '1px solid #302e2a', marginBottom: 8, paddingTop: 8 }}>
            <button onClick={() => setOpenGroups((p) => ({ ...p, [g.id]: !p[g.id] }))}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', color: '#f0eee9', cursor: 'pointer', padding: '2px 0', fontSize: 12, fontWeight: 600, letterSpacing: '.03em' }}>
              <span style={{ textTransform: 'uppercase', color: '#cfd1a4' }}>{g.label}</span>
              <span style={{ color: '#8596ad' }}>{isOpen ? '▾' : '▸'} {items.length}</span>
            </button>
            {isOpen && <div style={{ marginTop: 10 }}>{items.map(row)}</div>}
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={onExport} style={{ flex: 1, background: '#007a9c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer' }}>{copied ? 'Copied ✓' : 'Export colours'}</button>
        <button onClick={() => location.reload()} style={{ background: '#302e2a', color: '#f0eee9', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Reset</button>
      </div>
    </div>
  )
}
