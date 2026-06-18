import {
  Wallet,
  Target,
  MousePointerClick,
  DollarSign,
  HeartPulse,
  Rocket,
  TrendingUp,
  Settings2,
  PenTool,
  Maximize2,
  CalendarDays,
  Star,
  Check,
  Minus,
  ArrowDown,
  Users,
  Clock,
  ImageOff,
  PersonStanding,
  Pencil,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react'
import { useState, useEffect, useMemo, createContext, useContext } from 'react'
import { apiFetch } from '../../utils/api'
import { getStoredSessionId } from '../../utils/session'
import type { ClientReport, KpiItem, ReportData } from './types'

// ---------------------------------------------------------------------------
// Stylised "Campaign Performance Dashboard" — light-theme landscape one-pager.
// Palette sampled from the agency concept (docs/STYLISED_REPORTS_PLAN.md).
// Renders light regardless of the app's dark theme (explicit colors throughout).
// ---------------------------------------------------------------------------

const C = {
  navy: '#0C2552',
  purple: '#9F86D1',
  purpleDeep: '#6B4FBE',
  teal: '#1BA19D',
  greenBg: '#E3F2E1',
  green: '#56B659',
  red: '#E2574C',
  page: '#E6E6EC',
  card: '#FFFFFF',
  slate: '#283554',
  slate2: '#7E8CB0',
  border: '#E4E4EC',
}

// Donut segment palette (cycled)
const DONUT = [C.navy, C.purple, C.teal, '#7DB0A9', C.slate2, '#C7BCE6', '#A7C7C3', '#D3CFCC']

const printCss = `
@media print {
  @page { size: A4 landscape; margin: 0; }
  html, body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .app-sidebar, .report-actions { display: none !important; }
  .report-onepager {
    background: #fff !important; padding: 0 !important; margin: 0 !important;
    height: auto !important; overflow: visible !important;
    display: flex !important; justify-content: center !important; align-items: flex-start !important;
  }
  /* Keep the design width so the column grids don't reflow, then scale the whole
     page down with zoom so it fits a single A4 landscape sheet. Flex-centre the
     (zoomed) page so it isn't left-aligned when content is wider than the sheet. */
  .report-page {
    box-shadow: none !important; border-radius: 0 !important;
    width: 1180px !important; max-width: none !important;
    margin: 0 !important; padding: 22px !important;
    zoom: 0.8;
  }
}
`

// Turn a slug-ish campaign name ("goodness_goes_great") into a friendly title
const prettifyName = (s: string) =>
  (s || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

const fmtNum = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })
const fmtMoney = (cur: string, n: number) =>
  `${cur} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
// Compact money for tight spots (donut centre): no cents, M-abbreviated above 1M
const sym = (cur: string) => (cur === 'ZAR' ? 'R' : `${cur} `)
const fmtMoneyCompact = (cur: string, n: number) =>
  n >= 1_000_000 ? `${sym(cur)}${(n / 1_000_000).toFixed(2)}M` : `${sym(cur)}${Math.round(n).toLocaleString()}`

// ---------------------------------------------------------------------------
// Manual-edit layer: overrides deep-merge onto report_data and persist via
// manual_overrides, so corrections survive regeneration (overrides win at render).
// ---------------------------------------------------------------------------

type Overrides = Record<string, unknown>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deepMerge = (base: any, over: any): any => {
  if (over === undefined || over === null) return base
  if (Array.isArray(over) || typeof over !== 'object') return over
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return { ...over }
  const out = { ...base }
  for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k])
  return out
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setPath = (obj: any, path: (string | number)[], value: any): any => {
  const next = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) }
  let cur = next
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...(cur[k] ?? {}) }
    cur = cur[k]
  }
  cur[path[path.length - 1]] = value
  return next
}

interface EditState {
  editing: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setField: (path: (string | number)[], value: any) => void
}
const EditContext = createContext<EditState>({ editing: false, setField: () => {} })
const useEdit = () => useContext(EditContext)

const EDIT_INPUT =
  'rounded px-1 py-0.5 outline-none focus:ring-1'
const editStyle = { font: 'inherit', color: C.slate, background: '#FFFFFF', border: `1px solid ${C.purple}` } as React.CSSProperties

// Inline editable text — renders plain value in view mode, an input/textarea in edit mode.
const Editable = ({
  path,
  value,
  multiline = false,
  widthClass = 'w-full',
  rows = 2,
}: {
  path: (string | number)[]
  value: string | number
  multiline?: boolean
  widthClass?: string
  rows?: number
}) => {
  const { editing, setField } = useEdit()
  if (!editing) return <>{value}</>
  if (multiline) {
    return (
      <textarea
        value={String(value ?? '')}
        onChange={(e) => setField(path, e.target.value)}
        rows={rows}
        className={`${EDIT_INPUT} ${widthClass} block resize-none`}
        style={editStyle}
      />
    )
  }
  return (
    <input
      value={String(value ?? '')}
      onChange={(e) => setField(path, e.target.value)}
      className={`${EDIT_INPUT} ${widthClass}`}
      style={editStyle}
    />
  )
}

// Image that falls back to a placeholder when the (often-expiring Meta CDN) URL fails to load.
// When `href` is set, the thumbnail links through to the live post/ad in a new tab.
const ThumbImage = ({
  url,
  className,
  href,
}: {
  url: string | null
  className: string
  href?: string | null
}) => {
  const [failed, setFailed] = useState(false)
  const inner =
    !url || failed ? (
      <div
        className={`${className} flex items-center justify-center`}
        style={{ background: '#F1F1F6', border: `1px solid ${C.border}` }}
      >
        <ImageOff size={18} style={{ color: C.slate2 }} />
      </div>
    ) : (
      <img
        src={url}
        alt=""
        className={className}
        style={{ border: `1px solid ${C.border}`, objectFit: 'cover' }}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0 block">
        {inner}
      </a>
    )
  }
  return inner
}

// Small "View post/ad ↗" link that opens the live post in a new tab.
const ViewLink = ({ href, label }: { href?: string | null; label: string }) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[10px] font-medium inline-flex items-center gap-0.5 mt-1.5"
      style={{ color: C.purpleDeep }}
    >
      {label} <ExternalLink size={10} />
    </a>
  ) : null

export const ReportOnePager = ({
  report,
  onBack,
  saveOverrides,
  printMode = false,
}: {
  report: ClientReport
  onBack: () => void
  saveOverrides?: (reportId: string, overrides: Record<string, unknown>) => Promise<void>
  printMode?: boolean
}) => {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [draft, setDraft] = useState<Overrides>(() => (report.manual_overrides as Overrides) ?? {})

  const baseData = report.report_data
  const savedOverrides = (report.manual_overrides as Overrides) ?? {}
  const overrides = editing ? draft : savedOverrides
  const data = useMemo(
    () => (baseData ? (deepMerge(baseData, overrides) as ReportData) : null),
    [baseData, overrides],
  )

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={onBack} className="text-tertiary paragraph-sm mb-4">
          ← Back
        </button>
        <p className="paragraph-sm text-tertiary">Report data unavailable.</p>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setField = (path: (string | number)[], value: any) =>
    setDraft((prev) => setPath(prev, path, value))

  const startEdit = () => {
    // Seed the draft with full editable sections so array-index edits merge cleanly
    setDraft({
      ...savedOverrides,
      studio_hours: clone(data.studio_hours),
      dashboard: {
        ...((savedOverrides.dashboard as Overrides) ?? {}),
        key_takeaways: clone(data.dashboard.key_takeaways),
        next_steps: clone(data.dashboard.next_steps),
      },
      kpi_performance: { kpis: clone(data.kpi_performance.kpis) },
      ...(data.top_paid_ad ? { top_paid_ad: { why_it_worked: data.top_paid_ad.why_it_worked ?? '' } } : {}),
      top_organic_posts: { posts: clone(data.top_organic_posts.posts) },
    })
    setEditing(true)
  }
  const cancelEdit = () => {
    setDraft(savedOverrides)
    setEditing(false)
  }
  const save = async () => {
    if (!saveOverrides) return
    setSaving(true)
    try {
      await saveOverrides(report.report_id, draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  // Server-side PDF (Playwright) — pixel-perfect single page; falls back to browser print.
  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      const sid = getStoredSessionId() || ''
      const res = await apiFetch(
        `/api/tenants/${report.tenant_id}/reports/${report.report_id}/pdf`,
        { headers: { 'X-Session-ID': sid } },
      )
      if (!res.ok) throw new Error('pdf')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${prettifyName(data.cover.campaign_name)} Report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.print() // fallback if the PDF service is unavailable
    } finally {
      setDownloading(false)
    }
  }
  const cur = data.spend_breakdown.currency || data.dashboard.metrics?.currency || 'R'

  return (
   <EditContext.Provider value={{ editing, setField }}>
    <div
      className={`report-onepager ${printMode ? '' : 'flex flex-col h-full overflow-auto'}`}
      style={{ background: printMode ? '#FFFFFF' : C.page }}
    >
      {!printMode && <style>{printCss}</style>}

      {/* Actions bar — hidden on print + in print-route render */}
      {!printMode && (
      <div className="report-actions w-full max-w-[1180px] mx-auto px-4 pt-4 flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="text-sm font-medium"
          style={{ color: C.slate2 }}
        >
          ← All Reports
        </button>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ border: `1px solid ${C.border}`, color: C.slate2 }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: C.green }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <>
              {saveOverrides && (
                <button
                  onClick={startEdit}
                  className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
                  style={{ border: `1px solid ${C.border}`, color: C.slate }}
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: C.navy }}
              >
                {downloading ? 'Generating…' : 'Download PDF'}
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* The page */}
      <div
        className={`report-page w-full max-w-[1180px] mx-auto rounded-2xl p-6 ${printMode ? '' : 'my-4'}`}
        style={{
          background: C.card,
          color: C.slate,
          ...(printMode ? { boxShadow: 'none', borderRadius: 0 } : { boxShadow: '0 2px 18px rgba(12,37,82,0.08)' }),
        }}
      >
        <Header data={data} />

        {/* Row 1 — KPI cards */}
        <div
          className="grid gap-3 mt-4"
          style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1.3fr' }}
        >
          <KpiCard
            variant="navy"
            icon={<Wallet size={18} />}
            label="Total Ad Spend"
            value={fmtMoney(cur, data.dashboard.metrics?.total_spend.value ?? data.spend_breakdown.total_spend)}
            deltaPct={data.dashboard.metrics?.total_spend.change_pct ?? null}
          />
          <KpiCard
            variant="purple"
            icon={<Target size={18} />}
            label="Conversions"
            value={fmtNum(data.dashboard.metrics?.conversions.value ?? 0)}
            deltaPct={data.dashboard.metrics?.conversions.change_pct ?? null}
          />
          <KpiCard
            variant="teal"
            icon={<MousePointerClick size={18} />}
            label="CTR (All)"
            value={`${data.dashboard.metrics?.ctr.value ?? 0}%`}
            deltaPct={data.dashboard.metrics?.ctr.change_pct ?? null}
          />
          <KpiCard
            variant="green"
            icon={<DollarSign size={18} />}
            label="Cost Per Lead"
            value={
              (data.dashboard.metrics?.cost_per_lead.value ?? 0) > 0
                ? fmtMoney(cur, data.dashboard.metrics!.cost_per_lead.value)
                : '—'
            }
            deltaPct={data.dashboard.metrics?.cost_per_lead.change_pct ?? null}
            invertDelta
          />
          <HealthCard
            status={data.dashboard.campaign_health.status}
            description={data.dashboard.campaign_health.description}
          />
        </div>

        {/* Row 2 — Spend / Paid ad / Organic / KPI table */}
        <div
          className="grid gap-3 mt-3"
          style={{ gridTemplateColumns: '1fr 1.2fr 1.2fr 1.1fr' }}
        >
          <SpendPanel data={data} cur={cur} />
          <PaidAdPanel data={data} />
          <OrganicPanel data={data} />
          <KpiPanel data={data} />
        </div>

        {/* Row 3 — Audience / Studio / Takeaways */}
        <div
          className="grid gap-3 mt-3"
          style={{ gridTemplateColumns: '1.4fr 1.1fr 1.5fr' }}
        >
          <AudiencePanel data={data} />
          <StudioPanel data={data} />
          <TakeawaysPanel data={data} />
        </div>

        {/* Row 4 — Next steps */}
        <NextStepsBar data={data} />

        {/* Footer */}
        <div className="mt-5 pt-3 text-center" style={{ borderTop: `1px solid ${C.border}` }}>
          <p className="text-sm" style={{ color: C.purpleDeep }}>
            Thank you for your continued trust and partnership.
          </p>
          <p className="text-sm font-semibold" style={{ color: C.slate }}>
            Let's keep building momentum!
          </p>
          <p className="text-xs mt-1" style={{ color: C.slate2 }}>
            {data.cover.prepared_by || '11&1 Agency'}
          </p>
        </div>
      </div>
    </div>
   </EditContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

const Header = ({ data }: { data: ReportData }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold leading-tight" style={{ color: C.navy }}>
        Campaign Performance Dashboard
      </h1>
      <p className="text-sm" style={{ color: C.purpleDeep }}>
        Your campaign at a glance.
      </p>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <div className="text-right">
        <p className="text-xs tracking-wide" style={{ color: C.slate2 }}>
          {data.cover.client_name?.toUpperCase()}
        </p>
        <p className="text-sm font-semibold" style={{ color: C.purpleDeep }}>
          {prettifyName(data.cover.campaign_name)}
        </p>
      </div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: '#F4F4F8' }}
      >
        <CalendarDays size={16} style={{ color: C.slate2 }} />
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: C.slate2 }}>
            Reporting Period
          </p>
          <p className="text-xs font-medium" style={{ color: C.slate }}>
            {data.cover.reporting_period_label}
          </p>
        </div>
      </div>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------

const KpiCard = ({
  variant,
  icon,
  label,
  value,
  deltaPct,
  invertDelta = false,
}: {
  variant: 'navy' | 'purple' | 'teal' | 'green'
  icon: React.ReactNode
  label: string
  value: string
  deltaPct: number | null
  invertDelta?: boolean
}) => {
  const dark = variant === 'navy'
  const bg = variant === 'navy' ? C.navy : variant === 'purple' ? C.purple : variant === 'teal' ? C.teal : C.greenBg
  const fg = dark ? '#FFFFFF' : variant === 'green' ? C.slate : '#FFFFFF'
  const iconBg = variant === 'green' ? 'rgba(86,182,89,0.18)' : 'rgba(255,255,255,0.18)'
  const subFg = variant === 'green' ? C.slate2 : 'rgba(255,255,255,0.75)'

  return (
    <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: bg, color: fg }}>
      <div className="flex items-center gap-2">
        <span className="rounded-lg p-1.5" style={{ background: iconBg, color: fg }}>
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ opacity: 0.9 }}>
          {label}
        </span>
      </div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <Delta pct={deltaPct} invert={invertDelta} subFg={subFg} variant={variant} />
    </div>
  )
}

const Delta = ({
  pct,
  invert,
  subFg,
  variant,
}: {
  pct: number | null
  invert: boolean
  subFg: string
  variant: string
}) => {
  if (pct === null || pct === undefined) return <span className="text-[11px]" style={{ color: subFg }}>—</span>
  const good = invert ? pct < 0 : pct > 0
  // On dark cards use white-ish; on light cards use semantic green/red
  const goodColor = variant === 'green' || variant === 'teal' || variant === 'purple' || variant === 'navy' ? '#FFFFFF' : C.green
  const color = variant === 'green' ? (good ? C.green : C.red) : goodColor
  return (
    <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color }}>
      {pct > 0 ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

const HealthCard = ({ status, description }: { status: string; description: string }) => {
  const onTrack = status === 'On Track'
  const mixed = status === 'Mixed'
  const accent = onTrack ? C.green : mixed ? '#E0A93B' : C.red
  return (
    <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div
        className="rounded-full p-2.5 shrink-0"
        style={{ background: `${accent}22`, color: accent }}
      >
        <HeartPulse size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: C.slate2 }}>
          Campaign Health
        </p>
        <p className="text-base font-bold" style={{ color: accent }}>
          {status?.toUpperCase()}
        </p>
        <p className="text-[11px] leading-snug line-clamp-2" style={{ color: C.slate2 }}>
          {description}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel shell
// ---------------------------------------------------------------------------

const Panel = ({
  title,
  subtitle,
  fill,
  children,
}: {
  title: string
  subtitle?: string
  fill?: boolean
  children: React.ReactNode
}) => (
  <div
    className={`rounded-xl p-3 ${fill ? 'flex flex-col' : ''}`}
    style={{ background: C.card, border: `1px solid ${C.border}` }}
  >
    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate }}>
      {title}
    </p>
    {subtitle && (
      <p className="text-[11px] mb-2" style={{ color: C.slate2 }}>
        {subtitle}
      </p>
    )}
    <div className={`${subtitle ? '' : 'mt-2'} ${fill ? 'flex-1 flex items-center' : ''}`}>{children}</div>
  </div>
)

// ---------------------------------------------------------------------------
// Donut (inline SVG)
// ---------------------------------------------------------------------------

const Donut = ({
  segments,
  size = 96,
  thickness = 16,
  centerTop,
  centerBottom,
}: {
  segments: { value: number; color: string }[]
  size?: number
  thickness?: number
  centerTop?: string
  centerBottom?: string
}) => {
  const r = (size - thickness) / 2
  const cx = size / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cy(size)} r={r} fill="none" stroke="#EFEFF4" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const len = (s.value / total) * circ
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy(size)}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy(size)})`}
            strokeLinecap="butt"
          />
        )
        offset += len
        return el
      })}
      {centerTop && (
        <text
          x={cx}
          y={cy(size) - (centerBottom ? 1 : -3)}
          textAnchor="middle"
          fontSize={Math.max(9, Math.round((size - thickness * 2) * 0.19))}
          fontWeight="700"
          fill={C.slate}
        >
          {centerTop}
        </text>
      )}
      {centerBottom && (
        <text x={cx} y={cy(size) + Math.round(size * 0.12)} textAnchor="middle" fontSize={Math.max(6, Math.round(size * 0.075))} fill={C.slate2}>
          {centerBottom}
        </text>
      )}
    </svg>
  )
}
const cy = (size: number) => size / 2

const Legend = ({ items }: { items: { label: string; color: string; value: string }[] }) => (
  <div className="flex-1 space-y-1">
    {items.map((it, i) => (
      <div key={i} className="flex items-center gap-1.5 text-[11px]">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: it.color }} />
        <span className="flex-1 truncate" style={{ color: C.slate }}>
          {it.label}
        </span>
        <span className="font-semibold" style={{ color: C.slate }}>
          {it.value}
        </span>
      </div>
    ))}
  </div>
)

// ---------------------------------------------------------------------------
// Spend breakdown
// ---------------------------------------------------------------------------

const SpendPanel = ({ data, cur }: { data: ReportData; cur: string }) => {
  const split = data.spend_breakdown.channel_split
  const total = data.spend_breakdown.total_spend
  if (!split.length) {
    return (
      <Panel title="Spend Breakdown" subtitle="Where your budget is used">
        <p className="text-[11px]" style={{ color: C.slate2 }}>
          No spend data for this period.
        </p>
      </Panel>
    )
  }
  return (
    <Panel title="Spend Breakdown" subtitle="Where your budget is used" fill>
      <div className="flex items-center gap-3 w-full">
        <Donut
          size={108}
          thickness={18}
          segments={split.map((s, i) => ({ value: s.percentage, color: DONUT[i % DONUT.length] }))}
          centerTop={fmtMoneyCompact(cur, total)}
          centerBottom="TOTAL SPEND"
        />
        <Legend
          items={split.map((s, i) => ({
            label: s.platform,
            color: DONUT[i % DONUT.length],
            value: `${s.percentage}%`,
          }))}
        />
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Top paid ad
// ---------------------------------------------------------------------------

const StatChip = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-[11px] py-0.5">
    <span style={{ color: C.slate2 }}>{label}</span>
    <span className="font-semibold" style={{ color: C.slate }}>
      {value}
    </span>
  </div>
)

const PaidAdPanel = ({ data }: { data: ReportData }) => {
  const ad = data.top_paid_ad
  const adUrl = ad
    ? ad.post_url ||
      (ad.ad_id ? `https://www.facebook.com/ads/library/?id=${ad.ad_id}&active_status=all` : null)
    : null
  return (
    <Panel title="Top Performing Paid Ad">
      {!ad ? (
        <p className="text-[11px]" style={{ color: C.slate2 }}>
          No paid ad data for this period.
        </p>
      ) : (
        <>
          <div className="flex gap-2.5">
            <ThumbImage
              url={ad.image_url || ad.thumbnail_url}
              href={adUrl}
              className="w-[88px] h-[88px] rounded-lg shrink-0"
            />
            <div className="flex-1 min-w-0">
              <StatChip label="CTR" value={`${ad.ctr}%`} />
              <StatChip label="CPC" value={`R ${ad.cpc.toFixed(2)}`} />
              <StatChip label="Conversions" value={String(ad.conversions)} />
              <StatChip label="Clicks" value={fmtNum(ad.clicks)} />
            </div>
          </div>
          <Callout
            text={ad.why_it_worked || ad.headline || ad.body || ad.ad_name}
            editPath={['top_paid_ad', 'why_it_worked']}
          />
          <ViewLink href={adUrl} label="View ad" />
        </>
      )}
    </Panel>
  )
}

const Callout = ({
  text,
  label = 'Why it worked',
  editPath,
}: {
  text: string
  label?: string
  editPath?: (string | number)[]
}) => {
  const { editing } = useEdit()
  return (
    <div className="mt-2 rounded-lg p-2.5 flex gap-1.5 items-start min-h-[64px]" style={{ background: C.greenBg }}>
      <Star size={13} className="shrink-0 mt-0.5" style={{ color: C.green }} />
      {editing && editPath ? (
        <div className="flex-1 text-[10.5px] leading-snug" style={{ color: C.slate }}>
          <span className="font-semibold">{label}: </span>
          <Editable path={editPath} value={text} multiline rows={3} />
        </div>
      ) : (
        <p className="text-[10.5px] leading-snug" style={{ color: C.slate }}>
          <span className="font-semibold">{label}: </span>
          {text}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Top organic post
// ---------------------------------------------------------------------------

const OrganicPanel = ({ data }: { data: ReportData }) => {
  const post = data.top_organic_posts.posts[0]
  return (
    <Panel title="Top Performing Organic Post">
      {!post ? (
        <p className="text-[11px]" style={{ color: C.slate2 }}>
          No organic posts for this period.
        </p>
      ) : (
        <>
          <div className="flex gap-2.5">
            <ThumbImage
              url={post.image_url}
              href={post.post_url}
              className="w-[88px] h-[88px] rounded-lg shrink-0"
            />
            <div className="flex-1 min-w-0">
              <StatChip label="Engagements" value={fmtNum(post.engaged_users)} />
              <StatChip label="Reactions" value={fmtNum(post.reactions)} />
              <StatChip label="Clicks" value={fmtNum(post.clicks)} />
              <StatChip label="Reach" value={post.reach ? fmtNum(post.reach) : '—'} />
            </div>
          </div>
          <Callout
            label="Why it resonated"
            text={post.why_it_worked || post.description}
            editPath={['top_organic_posts', 'posts', 0, 'why_it_worked']}
          />
          <ViewLink href={post.post_url} label="View post" />
        </>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// KPI performance table
// ---------------------------------------------------------------------------

const KpiStatus = ({ status }: { status: KpiItem['status'] }) => {
  if (status === 'on_track')
    return (
      <span className="inline-flex rounded-full p-0.5" style={{ background: `${C.green}22`, color: C.green }}>
        <Check size={11} />
      </span>
    )
  if (status === 'behind')
    return (
      <span className="inline-flex rounded-full p-0.5" style={{ background: `${C.red}22`, color: C.red }}>
        <ArrowDown size={11} />
      </span>
    )
  if (status === 'close')
    return (
      <span className="inline-flex rounded-full p-0.5" style={{ background: '#E0A93B22', color: '#E0A93B' }}>
        <Minus size={11} />
      </span>
    )
  return <span style={{ color: C.slate2 }}>—</span>
}

const KPI_STATUSES: KpiItem['status'][] = ['on_track', 'close', 'behind', 'no_target', 'unknown']

const KpiPanel = ({ data }: { data: ReportData }) => {
  const { editing, setField } = useEdit()
  const kpis = data.kpi_performance.kpis.slice(0, 6)
  return (
    <Panel title="KPI Performance" subtitle="Performance against targets">
      {kpis.length === 0 ? (
        <p className="text-[11px]" style={{ color: C.slate2 }}>
          No KPI targets set.
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-[9px] uppercase tracking-wide" style={{ color: C.slate2 }}>
              <th className="text-left font-semibold pb-1">KPI</th>
              <th className="text-right font-semibold pb-1">Target</th>
              <th className="text-right font-semibold pb-1">Current</th>
              <th className="text-right font-semibold pb-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {kpis.map((k, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td className="text-[10px] py-1 pr-1 truncate" style={{ color: C.slate, maxWidth: 90 }}>
                  {k.kpi}
                </td>
                <td className="text-[10px] py-1 text-right" style={{ color: C.slate2 }}>
                  {editing ? (
                    <Editable path={['kpi_performance', 'kpis', i, 'target']} value={k.target ?? ''} widthClass="w-14 text-right" />
                  ) : (
                    k.target || '—'
                  )}
                </td>
                <td className="text-[10px] py-1 text-right font-semibold" style={{ color: C.slate }}>
                  {editing ? (
                    <Editable path={['kpi_performance', 'kpis', i, 'current']} value={k.current ?? ''} widthClass="w-14 text-right" />
                  ) : (
                    k.current || '—'
                  )}
                </td>
                <td className="py-1 text-right">
                  {editing ? (
                    <select
                      value={k.status}
                      onChange={(e) => setField(['kpi_performance', 'kpis', i, 'status'], e.target.value)}
                      className="text-[9px] rounded px-0.5"
                      style={{ border: `1px solid ${C.purple}`, color: C.slate }}
                    >
                      {KPI_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <KpiStatus status={k.status} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Audience insights
// ---------------------------------------------------------------------------

const AudiencePanel = ({ data }: { data: ReportData }) => {
  const ai = data.audience_insights
  // Top 4 age groups by share (drop 0% / "unknown" noise); donut + legend stay in sync
  const ages = (ai.age_groups ?? [])
    .filter((a) => a.percentage > 0 && !/unknown/i.test(a.range))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 4)
  const gender = ai.gender_split ?? {}
  const male = Math.round(gender.male ?? gender.Male ?? 0)
  const female = Math.round(gender.female ?? gender.Female ?? 0)
  const locations = (ai.top_locations ?? []).slice(0, 5)

  if (!ages.length && !locations.length) {
    return (
      <Panel title="Audience Insights" subtitle="Who we are reaching">
        <p className="text-[11px]" style={{ color: C.slate2 }}>
          No audience data. Connect Meta Ads to enable this.
        </p>
      </Panel>
    )
  }

  return (
    <Panel title="Audience Insights" subtitle="Who we are reaching">
      <div className="grid gap-2" style={{ gridTemplateColumns: '1.1fr 0.8fr 1.1fr' }}>
        {/* Age donut */}
        <div>
          <p className="text-[9px] uppercase tracking-wide font-semibold mb-1" style={{ color: C.slate2 }}>
            Age
          </p>
          <div className="flex items-center gap-2">
            <Donut
              size={68}
              thickness={12}
              segments={ages.map((a, i) => ({ value: a.percentage, color: DONUT[i % DONUT.length] }))}
            />
            <div className="space-y-[3px]">
              {ages.map((a, i) => (
                <div key={i} className="flex items-center gap-1 text-[9px] leading-none whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: DONUT[i % DONUT.length] }} />
                  <span className="shrink-0" style={{ color: C.slate2 }}>{a.range}</span>
                  <span className="font-semibold shrink-0" style={{ color: C.slate }}>
                    {a.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Gender */}
        <div className="flex flex-col">
          <p className="text-[9px] uppercase tracking-wide font-semibold mb-1 text-center" style={{ color: C.slate2 }}>
            Gender
          </p>
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="text-center">
              <PersonStanding size={42} strokeWidth={2.2} style={{ color: C.navy }} className="mx-auto" />
              <p className="text-base font-bold leading-none mt-1" style={{ color: C.navy }}>
                {male}%
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: C.slate2 }}>
                Male
              </p>
            </div>
            <div className="text-center">
              <PersonStanding size={42} strokeWidth={2.2} style={{ color: C.purple }} className="mx-auto" />
              <p className="text-base font-bold leading-none mt-1" style={{ color: C.purple }}>
                {female}%
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: C.slate2 }}>
                Female
              </p>
            </div>
          </div>
        </div>
        {/* Locations */}
        <div>
          <p className="text-[9px] uppercase tracking-wide font-semibold mb-1" style={{ color: C.slate2 }}>
            Top Locations
          </p>
          <div className="space-y-0.5">
            {locations.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="truncate" style={{ color: C.slate2 }}>
                  {i + 1}. {l.location}
                </span>
                <span className="font-semibold" style={{ color: C.slate }}>
                  {l.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Studio hours
// ---------------------------------------------------------------------------

const StudioPanel = ({ data }: { data: ReportData }) => {
  const { editing, setField } = useEdit()
  const sh = data.studio_hours
  const entries = Object.entries(sh.breakdown ?? {}) as [string, number][]
  const [rows, setRows] = useState<[string, number][]>([])
  useEffect(() => {
    if (editing) setRows(Object.entries(sh.breakdown ?? {}) as [string, number][])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  // Persist edited rows back to the override draft (rebuild object + total, mark manual)
  const commit = (next: [string, number][]) => {
    setRows(next)
    const breakdown: Record<string, number> = {}
    for (const [cat, hrs] of next) {
      const key = cat.trim()
      if (key) breakdown[key] = Number(hrs) || 0
    }
    setField(['studio_hours', 'breakdown'], breakdown)
    setField(
      ['studio_hours', 'total_hours'],
      Object.values(breakdown).reduce((s, h) => s + h, 0),
    )
    setField(['studio_hours', 'source'], 'manual')
  }

  if (editing) {
    return (
      <Panel title="Studio Hours" subtitle="Total studio hours used">
        <div className="space-y-1">
          {rows.map(([cat, hrs], i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={cat}
                placeholder="Category name"
                onChange={(e) => commit(rows.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))}
                className={`${EDIT_INPUT} flex-1 text-[11px]`}
                style={editStyle}
              />
              <input
                value={String(hrs)}
                onChange={(e) => commit(rows.map((r, j) => (j === i ? [r[0], Number(e.target.value) || 0] : r)))}
                className={`${EDIT_INPUT} w-12 text-[11px] text-right`}
                style={editStyle}
              />
              <span className="text-[10px]" style={{ color: C.slate2 }}>
                h
              </span>
              <button onClick={() => commit(rows.filter((_, j) => j !== i))} style={{ color: C.slate2 }}>
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => commit([...rows, ['', 0]])}
            className="flex items-center gap-1 text-[10px] font-medium"
            style={{ color: C.purpleDeep }}
          >
            <Plus size={11} /> Add category
          </button>
          <p className="text-[10px] pt-1" style={{ color: C.slate2 }}>
            Total: {rows.reduce((s, [, h]) => s + (Number(h) || 0), 0)}h
          </p>
        </div>
      </Panel>
    )
  }

  if (sh.source === 'not_linked' || sh.total_hours === 0 || entries.length === 0) {
    return (
      <Panel title="Studio Hours" subtitle="Total studio hours used">
        <div className="flex items-center gap-2">
          <Clock size={28} style={{ color: C.slate2 }} />
          <p className="text-[11px]" style={{ color: C.slate2 }}>
            {sh.source === 'not_linked'
              ? 'Link a ClickUp list, or click Edit to add hours manually.'
              : 'No time tracked — click Edit to add hours manually.'}
          </p>
        </div>
      </Panel>
    )
  }
  return (
    <Panel title="Studio Hours" subtitle="Total studio hours used">
      <div className="flex items-center gap-3">
        <Donut
          size={72}
          thickness={12}
          segments={entries.map(([, hrs], i) => ({ value: hrs, color: DONUT[i % DONUT.length] }))}
          centerTop={`${sh.total_hours}`}
          centerBottom="HOURS"
        />
        <Legend
          items={entries.map(([cat, hrs], i) => ({
            label: cat,
            color: DONUT[i % DONUT.length],
            value: `${hrs}h`,
          }))}
        />
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Key takeaways
// ---------------------------------------------------------------------------

const TAKEAWAY_ICONS = [TrendingUp, DollarSign, Users, Rocket]
const TAKEAWAY_COLORS = [C.green, '#E0A93B', C.purple, C.navy]

const TakeawaysPanel = ({ data }: { data: ReportData }) => {
  const { editing, setField } = useEdit()
  const all = data.dashboard.key_takeaways
  const items = editing ? all : all.slice(0, 4)
  return (
    <Panel title="Key Takeaways">
      {items.length === 0 && !editing ? (
        <p className="text-[11px]" style={{ color: C.slate2 }}>
          No takeaways generated.
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((t, i) => {
            const Icon = TAKEAWAY_ICONS[i % TAKEAWAY_ICONS.length]
            const color = TAKEAWAY_COLORS[i % TAKEAWAY_COLORS.length]
            return (
              <div key={i} className="flex gap-2 items-start">
                <span className="rounded-full p-1 shrink-0 mt-0.5" style={{ background: `${color}22`, color }}>
                  <Icon size={12} />
                </span>
                {editing ? (
                  <div className="flex-1 flex items-start gap-1">
                    <Editable path={['dashboard', 'key_takeaways', i]} value={t} multiline rows={2} />
                    <button
                      onClick={() => setField(['dashboard', 'key_takeaways'], all.filter((_, j) => j !== i))}
                      style={{ color: C.slate2 }}
                      className="mt-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] leading-snug" style={{ color: C.slate }}>
                    {t}
                  </p>
                )}
              </div>
            )
          })}
          {editing && (
            <button
              onClick={() => setField(['dashboard', 'key_takeaways'], [...all, ''])}
              className="flex items-center gap-1 text-[10px] font-medium"
              style={{ color: C.purpleDeep }}
            >
              <Plus size={11} /> Add takeaway
            </button>
          )}
        </div>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Next steps bar
// ---------------------------------------------------------------------------

const STEP_ICONS = [Rocket, TrendingUp, Settings2, PenTool, Maximize2]
const STEP_COLORS = [C.navy, C.green, C.slate, C.purple, '#E0A93B']

const NextStepsBar = ({ data }: { data: ReportData }) => {
  const steps = data.dashboard.next_steps.slice(0, 4)
  return (
    <div className="mt-3 rounded-xl p-3 flex items-center gap-3" style={{ background: '#F4F4F8' }}>
      <div className="flex items-center gap-2 pr-3 shrink-0" style={{ borderRight: `1px solid ${C.border}` }}>
        <span className="rounded-full p-1.5" style={{ background: C.navy, color: '#fff' }}>
          <Rocket size={16} />
        </span>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: C.slate }}>
          Next Steps
        </span>
      </div>
      <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: `repeat(${steps.length || 1}, 1fr)` }}>
        {steps.map((s, i) => {
          const Icon = STEP_ICONS[(i + 1) % STEP_ICONS.length]
          const color = STEP_COLORS[(i + 1) % STEP_COLORS.length]
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="rounded-full p-1.5 shrink-0" style={{ background: `${color}22`, color }}>
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold" style={{ color: C.slate }}>
                  <Editable path={['dashboard', 'next_steps', i, 'label']} value={s.label} />
                </p>
                <p className="text-[10px] leading-snug line-clamp-2" style={{ color: C.slate2 }}>
                  <Editable path={['dashboard', 'next_steps', i, 'description']} value={s.description} multiline rows={2} />
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="pl-3 shrink-0 text-right" style={{ borderLeft: `1px solid ${C.border}` }}>
        <p className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: C.slate2 }}>
          Next Report
        </p>
        <p className="text-[11px] font-medium" style={{ color: C.slate }}>
          {data.dashboard.next_report_period}
        </p>
      </div>
    </div>
  )
}
