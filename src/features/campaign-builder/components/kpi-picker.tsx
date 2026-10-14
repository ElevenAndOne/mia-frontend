import { useMemo, useState } from 'react'
import type { KpiGroup, KpiOption } from '../types'
import { num } from './parts'

// Pick KPIs from mia-cube's KPI list (analytics.kpi_registry): the same list the tracker measures
// against, so every KPI a plan carries can be tracked. Grouped as the list groups them, with the
// client's last result beside each so the choice is informed. Adding one works out its target
// at once (from history, or "no basis: you set it").

export const kpiValue = (v: number | null | undefined, unit: string | null | undefined) => {
  if (v == null) return '—'
  if (unit === 'currency') return `R${num(v)}`
  if (unit === 'fraction') return `${num(v)}%`
  return num(v)
}

export function lastResultText(k: KpiOption) {
  if (k.last_result) {
    const t = k.last_result.target != null ? ` vs ${kpiValue(k.last_result.target, k.unit)} target` : ''
    return `Last: ${kpiValue(k.last_result.value, k.unit)}${t} · ${k.last_result.campaign}`
  }
  if (k.account_90d != null) return `Account, last 90 days: ${kpiValue(k.account_90d, k.unit)}`
  return 'No result on file yet'
}

export function KpiPicker({
  groups,
  taken,
  onPick,
  onClose,
  busy,
}: {
  groups: KpiGroup[]
  taken: Set<string>
  onPick: (key: string) => void
  onClose: () => void
  busy: boolean
}) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return groups
      .map((g) => ({ ...g, kpis: g.kpis.filter((k) => !t || k.name.toLowerCase().includes(t) || k.kpi_key.includes(t)) }))
      .filter((g) => g.kpis.length)
  }, [groups, q])

  return (
    <div className="rounded-lg border border-brand bg-primary p-2 flex flex-col gap-2" role="dialog" aria-label="Add a KPI">
      <div className="flex items-center gap-2">
        <label htmlFor="kpi-search" className="sr-only">
          Search the KPI list
        </label>
        <input
          id="kpi-search"
          autoFocus
          className="flex-1 min-w-0 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary"
          placeholder="Search the KPI list"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />
        <button type="button" className="paragraph-xs text-tertiary hover:text-primary" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto flex flex-col gap-2">
        {groups.length === 0 ? <p className="paragraph-xs text-tertiary px-1">Loading the KPI list…</p> : null}
        {shown.map((g) => (
          <div key={g.family}>
            <p className="label-xs text-tertiary px-1">{g.label}</p>
            <ul className="flex flex-col">
              {g.kpis.map((k) => {
                const has = taken.has(k.kpi_key)
                return (
                  <li key={k.kpi_key}>
                    <button
                      type="button"
                      disabled={has || busy}
                      onClick={() => onPick(k.kpi_key)}
                      title={k.description ?? undefined}
                      className="w-full text-left rounded-md px-2 py-1.5 hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="paragraph-sm text-primary">
                        {k.name}
                        {has ? ' · already in this phase' : ''}
                      </span>
                      <span className="block paragraph-xs text-tertiary">
                        {lastResultText(k)}
                        {k.needs_source ? ' · needs its source (a HubSpot or Brevo list) set after approval' : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
