import { useState } from 'react'
import { patchKpi } from '../../campaigns/services/campaign-api'
import type { KPIActual } from '../services/campaign-tracker-service'

// A KPI's own counting dates and the dates it's compared with (26 Nov 2026, Cherry Time: "the online store was open
// 12 Oct - 15 Nov 2026 and 3 Nov - 11 Dec 2025; measure apples with apples"). The server counts both from the analytics
// store (services/kpi_dates.py) and says in words when it can't.

const fmt = (iso?: string | null, year = true) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) })
    : ''
const range = (a?: string | null, b?: string | null) => `${fmt(a, false)} – ${fmt(b)}`
const perDay = (v?: number | null) => (v == null ? null : `${Math.round(v).toLocaleString()} a day`)

export function KpiDatesLine({ actual }: { actual: KPIActual }) {
  const own = actual.count_window
  const cmp = actual.compare
  if (!own && !cmp) return null
  return (
    <div className="flex flex-col gap-0.5 paragraph-xs text-tertiary">
      {own ? (
        <span>
          Counts {range(own[0], own[1])}
          {actual.per_day != null ? ` · ${perDay(actual.per_day)}` : ''}
        </span>
      ) : actual.per_day != null ? (
        <span>{perDay(actual.per_day)}</span>
      ) : null}
      {cmp ? (
        <span title={cmp.reason ?? undefined}>
          {range(cmp.from, cmp.to)}:{' '}
          {cmp.label ?? cmp.value?.toLocaleString() ?? cmp.reason ?? '—'}
          {cmp.per_day != null ? ` · ${perDay(cmp.per_day)}` : ''}
        </span>
      ) : null}
    </div>
  )
}

type Dates = { count_from: string; count_to: string; compare_from: string; compare_to: string }

export function KpiDatesEditor({
  sessionId,
  tenantId,
  campaignId,
  kpiId,
  initial,
  onSaved,
}: {
  sessionId: string
  tenantId: string
  campaignId: string
  kpiId: number
  initial: Partial<Record<keyof Dates, string | null>>
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const fromSaved = (): Dates => ({
    count_from: initial.count_from ?? '',
    count_to: initial.count_to ?? '',
    compare_from: initial.compare_from ?? '',
    compare_to: initial.compare_to ?? '',
  })
  const [d, setD] = useState<Dates>(fromSaved)
  // every open starts from the saved dates (after a save or Clear the props change; Cancel drops what was typed)
  const openEditor = () => {
    setD(fromSaved())
    setError(null)
    setOpen(true)
  }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const has = Object.values(initial).some(Boolean)

  const save = async (next: Dates) => {
    setBusy(true)
    setError(null)
    try {
      const res = await patchKpi(sessionId, tenantId, campaignId, kpiId, {
        count_from: next.count_from || null,
        count_to: next.count_to || null,
        compare_from: next.compare_from || null,
        compare_to: next.compare_to || null,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const detail = body?.detail
        // our 422s are a sentence; a validation error is a list, which must never reach the screen as an object
        setError(typeof detail === 'string' && detail ? detail : "Couldn't save the dates. Check both dates of each pair.")
        return
      }
      setOpen(false)
      onSaved()
    } catch {
      setError("Couldn't save the dates.")
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
      <button
        type="button"
        // unset: shown on the row's hover only, so the tracker stays quiet (less text, 20 Nov)
        // touch screens have no hover: always shown there (pointer-coarse)
        className={`paragraph-xs text-brand-secondary hover:underline ${has ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100 pointer-coarse:opacity-100'}`}
        onClick={openEditor}
      >
        {has ? 'Change dates' : 'Count own dates'}
      </button>
    )
  const input = 'rounded border border-secondary bg-primary px-1.5 py-0.5 paragraph-xs text-primary'
  const pair = (label: string, a: keyof Dates, b: keyof Dates) => (
    <label className="flex flex-wrap items-center gap-1.5 paragraph-xs text-secondary">
      <span className="w-24 shrink-0">{label}</span>
      <input type="date" className={input} value={d[a]} onChange={(e) => setD({ ...d, [a]: e.target.value })} />
      <span>to</span>
      <input type="date" className={input} value={d[b]} onChange={(e) => setD({ ...d, [b]: e.target.value })} />
    </label>
  )
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-secondary p-2 mt-1">
      {pair('Count only', 'count_from', 'count_to')}
      {pair('Compare with', 'compare_from', 'compare_to')}
      <p className="paragraph-xs text-tertiary">
        Leave a pair empty to skip it. Comparing works for website numbers (Google Analytics).
      </p>
      {error ? <p className="paragraph-xs text-error">{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" disabled={busy} className="paragraph-xs font-medium text-brand-secondary hover:underline" onClick={() => void save(d)}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {has ? (
          <button
            type="button"
            disabled={busy}
            className="paragraph-xs text-tertiary hover:underline"
            onClick={() => void save({ count_from: '', count_to: '', compare_from: '', compare_to: '' })}
          >
            Clear dates
          </button>
        ) : null}
        <button type="button" disabled={busy} className="paragraph-xs text-tertiary hover:underline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
