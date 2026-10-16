import { useState } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import { fetchPhaseActuals, type KPIActual } from '../../campaign/services/campaign-tracker-service'
import * as api from '../api'
import type { ResultsKpi } from '../types'
import { Card, Chip, day, money, num } from './parts'

// The Results tab (plan §8.2): how the live campaign is tracking against the plan's targets, read the way each
// target was made, then the debrief once it ends. Actuals are the campaign tracker's (cached, warmed nightly).

type Pace = 'ahead' | 'on_pace' | 'behind' | 'better' | 'close' | 'worse'

// Same rule as services/campaign_builder/results.pace (tested there).
function pace(actual: number | null, k: ResultsKpi, share: number | null): Pace | null {
  if (actual == null || !k.target) return null
  if (k.rate) {
    const ratio = k.lower_is_better ? (actual ? k.target / actual : 0) : actual / k.target
    return ratio >= 1 ? 'better' : ratio >= 0.85 ? 'close' : 'worse'
  }
  if (!share) return null
  const ratio = actual / (k.target * share)
  return ratio >= 1.1 ? 'ahead' : ratio >= 0.9 ? 'on_pace' : 'behind'
}

const PACE_STYLE: Record<Pace, { label: string; cls: string }> = {
  ahead: { label: 'ahead', cls: 'bg-utility-success-100 text-utility-success-700 border-utility-success-300' },
  better: { label: 'better than target', cls: 'bg-utility-success-100 text-utility-success-700 border-utility-success-300' },
  on_pace: { label: 'on pace', cls: 'bg-utility-blue-100 text-utility-blue-700 border-utility-blue-300' },
  close: { label: 'close', cls: 'bg-utility-blue-100 text-utility-blue-700 border-utility-blue-300' },
  behind: { label: 'behind', cls: 'bg-utility-warning-100 text-utility-warning-700 border-utility-warning-300' },
  worse: { label: 'off target', cls: 'bg-utility-warning-100 text-utility-warning-700 border-utility-warning-300' },
}

const POINTS: [string, string][] = [
  ['what_worked', 'What worked'],
  ['what_failed', "What didn't"],
  ['what_to_repeat', 'Do again'],
  ['what_to_avoid', 'Avoid next time'],
]

export function ResultsTab({ campaignId, approved }: { campaignId: string; approved: boolean }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const qc = useQueryClient()
  const key = ['campaign-results', tenantId, campaignId]
  const q = useQuery({ queryKey: key, queryFn: () => api.fetchResults(sessionId!, tenantId!, campaignId), enabled: !!sessionId && !!tenantId && approved })
  const s = q.data
  const fetchable = !!s && s.live && s.when !== 'not_started'
  const actuals = useQueries({
    queries: (s?.phases ?? []).map((p) => ({
      queryKey: ['campaign-results-actuals', tenantId, campaignId, p.phase],
      queryFn: () => fetchPhaseActuals(sessionId!, tenantId!, campaignId, p.phase),
      enabled: fetchable,
      staleTime: 10 * 60 * 1000,
    })),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!approved) return <Card className="paragraph-sm text-secondary">Results start once the plan is approved and the campaign is launched.</Card>
  if (q.isPending) return <p className="paragraph-sm text-tertiary">Loading…</p>
  if (!s) return <p className="paragraph-sm text-error">{(q.error as Error)?.message ?? 'Could not load the results.'}</p>

  const progress = s.share_elapsed != null ? Math.round(s.share_elapsed * 100) : null
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="subheading-md text-primary">
            {!s.live ? 'Not live yet' : s.when === 'not_started' ? 'Live, starts ' + day(s.start_date) : s.when === 'ended' ? 'Ended' : `Day ${s.days_elapsed} of ${s.days_total}`}
          </p>
          <p className="paragraph-xs text-tertiary">
            {day(s.start_date)} – {day(s.end_date)}
            {s.budget_total != null ? ` · ${money(s.budget_total, 'ZAR')}` : ''}
          </p>
        </div>
        {progress != null && s.when === 'running' ? (
          <div className="h-1.5 rounded-full bg-tertiary overflow-hidden" aria-hidden="true">
            <div className="h-full bg-brand-solid" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        <p className="paragraph-xs text-tertiary">
          {!s.live
            ? 'Launch the first job on the Launch tab; results are read from the connected platforms from then on.'
            : s.when === 'not_started'
              ? 'Numbers appear here once the campaign starts. Counts are paced against the share of the target due by today; rates are compared as they stand.'
              : 'Counts are paced against the share of the target due by today; rates are compared as they stand. Numbers refresh nightly.'}
        </p>
      </Card>

      <div className="grid gap-3 @2xl:grid-cols-2">
        {s.phases.map((p, i) => {
          const rows = (actuals[i]?.data as KPIActual[] | null | undefined) ?? []
          const loading = fetchable && actuals[i]?.isPending
          return (
            <section key={p.phase} className="rounded-xl border border-secondary bg-secondary p-3 flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="subheading-md text-primary">{p.phase}</h3>
                <span className="paragraph-xs text-tertiary">{p.budget != null ? money(p.budget, 'ZAR') : ''}</span>
              </div>
              {loading ? <p className="paragraph-xs text-tertiary">Reading the platforms… (up to a minute)</p> : null}
              <ul className="flex flex-col gap-1.5">
                {p.kpis.map((k) => {
                  const a = rows.find((r) => r.kpi_name === k.kpi_name)
                  const value = a?.actual_value ?? null
                  const pc = pace(value, k, s.share_elapsed)
                  return (
                    <li key={k.kpi_name} className="rounded-lg border border-secondary bg-primary px-2 py-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="label-sm text-primary">{k.kpi_name}</span>
                        <span className="paragraph-sm text-primary tabular-nums">
                          {a?.actual_label ?? (value != null ? num(value) : '—')}
                          <span className="text-tertiary"> / {k.target != null ? num(k.target) : 'no target'}</span>
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {pc ? (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 label-xs ${PACE_STYLE[pc].cls}`}>
                            {k.basis === 'budget' && !k.rate ? (pc === 'behind' ? 'buying less than before' : 'buying what it bought before') : PACE_STYLE[pc].label}
                          </span>
                        ) : null}
                        {k.basis === 'budget' ? <Chip>target is what the budget buys</Chip> : k.basis === 'pm' ? <Chip tone="pm">your target</Chip> : null}
                        {a?.state === 'none' ? <span className="paragraph-xs text-tertiary">not tracked yet: set its source on the campaign</span> : null}
                        {a?.as_of ? <span className="paragraph-xs text-tertiary">as of {day(a.as_of)}</span> : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <Card className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="subheading-md text-primary">Debrief</p>
          {s.can_debrief ? (
            <Button size="sm" variant={s.debrief ? 'secondary' : 'primary'} loading={busy}
              onClick={async () => {
                setBusy(true)
                setError(null)
                try {
                  const r = await api.writeDebrief(sessionId!, tenantId!, campaignId)
                  if (r.status === 'skipped') setError(`Not written: ${r.reason}`)
                  await qc.invalidateQueries({ queryKey: key })
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not write the debrief')
                } finally {
                  setBusy(false)
                }
              }}>
              {s.debrief ? 'Write it again' : 'Write the debrief'}
            </Button>
          ) : null}
        </div>
        {s.debrief ? (
          <>
            <p className="paragraph-sm text-primary">{s.debrief.headline}</p>
            <div className="grid gap-3 @xl:grid-cols-2">
              {POINTS.map(([k, label]) =>
                (s.debrief!.points[k] ?? []).length ? (
                  <div key={k}>
                    <p className="label-xs text-secondary">{label}</p>
                    <ul className="mt-1 flex flex-col gap-1 paragraph-sm text-primary">
                      {s.debrief!.points[k].map((p) => (
                        <li key={p.point}>
                          {p.point} <span className="paragraph-xs text-tertiary">({p.evidence})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
            {s.debrief.data_gaps.length ? (
              <details className="paragraph-xs text-tertiary">
                <summary className="cursor-pointer">What the numbers couldn't show ({s.debrief.data_gaps.length})</summary>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {s.debrief.data_gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            <p className="paragraph-xs text-tertiary">
              Written {day(s.debrief.written_at)}. Every number in it was checked against the results; what it learned feeds the next
              plan for this client.
            </p>
          </>
        ) : (
          <p className="paragraph-sm text-secondary">
            {s.can_debrief
              ? 'Mia writes what worked, what didn’t and what to do again, checked against the results. It feeds the next plan for this client.'
              : `Written when the campaign ends${s.end_date ? ` (${day(s.end_date)})` : ''}.`}
          </p>
        )}
        {error ? <p className="paragraph-xs text-utility-warning-700">{error}</p> : null}
      </Card>
    </div>
  )
}

