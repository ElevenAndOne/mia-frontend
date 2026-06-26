/**
 * Live theme editor — MOCK_MODE only.
 *
 * A floating panel that lets a non-technical reviewer (our designer) recolour
 * the whole app live. For each role (brand / semantic / page background) he picks
 * from the 12 official brand swatches (or a custom colour). Picking regenerates
 * that colour's 50–950 ramp in the browser and writes the CSS custom properties
 * on :root — the same tokens the whole app reads — so every page updates instantly
 * in both light and dark. "Export" copies the chosen anchors so we can bake them in.
 *
 * Only the ~90% token-driven colours are editable here; a few hardcoded chart
 * colours (channel-colors.ts) aren't wired in yet.
 */
import { useEffect, useState } from 'react'

// ── the 12 official brand swatches ────────────────────────────────────────────
const PALETTE: { name: string; hex: string }[] = [
  { name: 'Raspberry', hex: '#C54966' },
  { name: 'Golden', hex: '#F4C247' },
  { name: 'Peach', hex: '#FFBE98' },
  { name: 'Sage', hex: '#BABC72' },
  { name: 'Periwinkle', hex: '#8398CA' },
  { name: 'Petrol-Teal', hex: '#007A9B' },
  { name: 'Cream', hex: '#F0EEE9' },
  { name: 'Rose', hex: '#E499BA' },
  { name: 'Mauve', hex: '#9F8286' },
  { name: 'Terracotta', hex: '#E15D44' },
  { name: 'Ink', hex: '#0E131A' },
  { name: 'Turquoise', hex: '#44B8AB' },
]

// ── colour maths (HSL ramp from a single anchor) ──────────────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hue = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue /= 6
    if (hue < 0) hue += 1
  }
  return [hue, s, l]
}
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = l - c / 2
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
  const root = document.documentElement
  for (const st of STEPS) {
    const f = LF[st]
    const L = f >= 0 ? l + (1 - l) * f : l * (1 + f)
    root.style.setProperty(`--color-${ramp}-${st}`, hslToHex(h, Math.min(1, s * SF[st]), Math.max(0, Math.min(1, L))))
  }
}

// role → underlying ramp (legacy primitive names; values are the new palette)
const ROLES: { key: string; label: string; ramp: string; def: string }[] = [
  { key: 'brand', label: 'Brand / primary', ramp: 'purple', def: '#007A9B' },
  { key: 'success', label: 'Success', ramp: 'green', def: '#BABC72' },
  { key: 'warning', label: 'Warning', ramp: 'yellow', def: '#F4C247' },
  { key: 'error', label: 'Error', ramp: 'red', def: '#C54966' },
  { key: 'info', label: 'Info', ramp: 'blue', def: '#8398CA' },
]

// surface roles set a token DIRECTLY (no ramp) — cards/panels/borders
const SURFACES: { key: string; label: string; cssVar: string; def: string; vars?: string[] }[] = [
  { key: 'card', label: 'Card surface', cssVar: '--color-background-primary', def: '#ffffff' },
  { key: 'sidebar', label: 'Sidebar', cssVar: '--ui-sidebar', def: '#ffffff' },
  { key: 'topbar', label: 'Top bar', cssVar: '--ui-topbar', def: '#ffffff' },
  { key: 'chat', label: 'Chat box', cssVar: '--ui-chat', def: '#f6f5f2' },
  { key: 'panel', label: 'Panel / hover', cssVar: '--color-background-secondary', def: '#f8f7f4' },
  // Borders sets all three border tokens so visible borders (mostly tertiary/secondary) change.
  { key: 'border', label: 'Borders', cssVar: '--color-border-tertiary', def: '#d2cec6', vars: ['--color-border-primary', '--color-border-secondary', '--color-border-tertiary'] },
  { key: 'navActive', label: 'Active nav item', cssVar: '--ui-nav-active', def: '#f8f7f4' },
  { key: 'bubbleUser', label: 'Chat bubble (you)', cssVar: '--ui-bubble-user', def: '#f6f5f2' },
  { key: 'bubbleMia', label: 'Chat bubble (Mia)', cssVar: '--ui-bubble-mia', def: '#f8f7f4' },
  { key: 'phase0', label: 'Phase · Awareness', cssVar: '--ui-phase-0', def: '#8398ca' },
  { key: 'phase1', label: 'Phase · Engagement', cssVar: '--ui-phase-1', def: '#44b8ab' },
  { key: 'phase2', label: 'Phase · Conversion', cssVar: '--ui-phase-2', def: '#f4c247' },
  { key: 'phase3', label: 'Phase · Loyalty', cssVar: '--ui-phase-3', def: '#e499ba' },
]
const applySurfaceVars = (s: { cssVar: string; vars?: string[] }, hex: string) =>
  (s.vars ?? [s.cssVar]).forEach((v) => document.documentElement.style.setProperty(v, hex))

const read = (v: string, f: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(v).trim() || f
const eqHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const HEX = /^#[0-9a-fA-F]{6}$/
const hexStyle: React.CSSProperties = { width: 74, background: '#0e141b', color: '#f0eee9', border: '1px solid #302e2a', borderRadius: 6, padding: '3px 6px', fontFamily: 'monospace', fontSize: 12 }

export default function ThemeEditor() {
  const [open, setOpen] = useState(false)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [surf, setSurf] = useState<Record<string, string>>({})
  const [canvas, setCanvas] = useState('#f0eee9')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || Object.keys(vals).length) return
    const v: Record<string, string> = {}
    for (const r of ROLES) v[r.key] = read(`--color-${r.ramp}-500`, r.def)
    setVals(v)
    const sv: Record<string, string> = {}
    for (const s of SURFACES) sv[s.key] = read(s.cssVar, s.def)
    setSurf(sv)
    setCanvas(read('--color-background-canvas', '#f0eee9'))
  }, [open, vals])

  const setRole = (key: string, ramp: string, hex: string) => {
    setVals((p) => ({ ...p, [key]: hex }))
    applyRamp(ramp, hex)
  }
  const setSurface = (s: (typeof SURFACES)[number], hex: string) => {
    setSurf((p) => ({ ...p, [s.key]: hex }))
    applySurfaceVars(s, hex)
  }
  const setCanvasColor = (hex: string) => {
    setCanvas(hex)
    document.documentElement.style.setProperty('--color-background-canvas', hex)
  }
  const onExport = () => {
    const out = {
      ...Object.fromEntries(ROLES.map((r) => [r.key, vals[r.key] || r.def])),
      ...Object.fromEntries(SURFACES.map((s) => [s.key, surf[s.key] || s.def])),
      pageBackground: canvas,
    }
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

  // a row of the 12 swatches for one role; active swatch ringed
  const swatchRow = (current: string, onPick: (hex: string) => void) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
      {PALETTE.map((sw) => {
        const active = eqHex(current, sw.hex)
        return (
          <button key={sw.hex} title={sw.name} onClick={() => onPick(sw.hex)}
            style={{
              width: 20, height: 20, borderRadius: 5, cursor: 'pointer', background: sw.hex,
              border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,.25)',
              outline: active ? '2px solid #00a3cf' : 'none', padding: 0,
            }} />
        )
      })}
    </div>
  )

  return (
    <div style={{ ...wrap, width: 300, maxHeight: '85vh', overflowY: 'auto', background: '#1c1a18', color: '#f0eee9', borderRadius: 14, padding: 16, boxShadow: '0 10px 40px rgba(0,0,0,.45)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <strong>Theme editor</strong>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#8596ad', cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      <p style={{ color: '#8596ad', fontSize: 11, margin: '0 0 12px' }}>Pick from the 12 brand colours (or a custom one) per section. Updates the whole app live.</p>

      {ROLES.map((r) => {
        const cur = vals[r.key] ?? r.def
        const valid = HEX.test(cur)
        return (
          <div key={r.key} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ flex: 1 }}>{r.label}</span>
              <input type="text" value={cur} spellCheck={false} placeholder="#000000"
                onChange={(e) => { const v = e.target.value; setVals((p) => ({ ...p, [r.key]: v })); if (HEX.test(v)) applyRamp(r.ramp, v) }}
                style={hexStyle} />
              <input type="color" value={valid ? cur : '#000000'} onChange={(e) => setRole(r.key, r.ramp, e.target.value)}
                title="custom colour" style={{ width: 28, height: 22, border: 'none', background: 'none', cursor: 'pointer' }} />
            </div>
            {swatchRow(cur, (hex) => setRole(r.key, r.ramp, hex))}
          </div>
        )
      })}

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ flex: 1 }}>Page background</span>
          <input type="text" value={canvas} spellCheck={false} placeholder="#000000"
            onChange={(e) => { const v = e.target.value; setCanvas(v); if (HEX.test(v)) document.documentElement.style.setProperty('--color-background-canvas', v) }}
            style={hexStyle} />
          <input type="color" value={HEX.test(canvas) ? canvas : '#000000'} onChange={(e) => setCanvasColor(e.target.value)}
            title="custom colour" style={{ width: 28, height: 22, border: 'none', background: 'none', cursor: 'pointer' }} />
        </div>
        {swatchRow(canvas, setCanvasColor)}
      </div>

      <div style={{ borderTop: '1px solid #302e2a', margin: '4px 0 12px', paddingTop: 10 }}>
        <div style={{ color: '#8596ad', fontSize: 11, marginBottom: 8 }}>SURFACES & COMPONENTS</div>
        {SURFACES.map((s) => {
          const cur = surf[s.key] ?? s.def
          const valid = HEX.test(cur)
          return (
            <div key={s.key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ flex: 1 }}>{s.label}</span>
                <input type="text" value={cur} spellCheck={false} placeholder="#000000"
                  onChange={(e) => { const v = e.target.value; setSurf((p) => ({ ...p, [s.key]: v })); if (HEX.test(v)) applySurfaceVars(s, v) }}
                  style={hexStyle} />
                <input type="color" value={valid ? cur : '#000000'} onChange={(e) => setSurface(s, e.target.value)}
                  title="custom colour" style={{ width: 28, height: 22, border: 'none', background: 'none', cursor: 'pointer' }} />
              </div>
              {swatchRow(cur, (hex) => setSurface(s, hex))}
            </div>
          )
        })}
        <p style={{ color: '#8596ad', fontSize: 11, margin: 0, lineHeight: 1.4 }}>Tip: toggle Light/Dark first, then set surfaces — surface colours differ per theme.</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onExport} style={{ flex: 1, background: '#007a9c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer' }}>{copied ? 'Copied ✓' : 'Export colours'}</button>
        <button onClick={() => location.reload()} style={{ background: '#302e2a', color: '#f0eee9', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Reset</button>
      </div>
      <p style={{ color: '#8596ad', fontSize: 11, marginTop: 10, marginBottom: 0, lineHeight: 1.4 }}>Toggle light/dark in the sidebar to check both. Export copies your choices to share.</p>
    </div>
  )
}
