import React, { useMemo, useState } from 'react'
import { useSession } from '../../contexts/session-context'
import { TopBar } from '../../components/top-bar'
import { Spinner } from '../../components/spinner'
import { Button } from '../../components/button'
import { useScheduler } from './hooks/use-scheduler'
import type { ResourceUtilization, SchedulerRunResult } from './types'

interface SchedulerViewProps {
  onBack?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function fmtCurrency(amount: number | null | undefined, currency = 'ZAR'): string {
  if (!amount) return ''
  const sym = currency === 'ZAR' ? 'R' : `${currency} `
  return `${sym}${amount.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`
}

function dayDiff(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-secondary border border-secondary rounded-xl p-5 ${className}`}>
      {children}
    </div>
  )
}

function StatChip({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const tones: Record<string, string> = {
    good: 'bg-utility-brand-100 text-utility-brand-700',
    warn: 'bg-utility-warning-100 text-utility-warning-700',
    bad: 'bg-red-100 text-red-700',
    neutral: 'bg-secondary text-secondary border border-secondary',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tones[tone]}`}
    >
      {label}
    </span>
  )
}

// ── Timeline bar (pure CSS — one row per flight) ─────────────────────────────

function TimelineBar({
  start,
  end,
  horizonStart,
  horizonDays,
}: {
  start: string
  end: string
  horizonStart: string
  horizonDays: number
}) {
  const left = Math.max(0, (dayDiff(horizonStart, start) / horizonDays) * 100)
  const width = Math.max(1.5, ((dayDiff(start, end) + 1) / horizonDays) * 100)
  return (
    <div className="relative h-2 rounded-full bg-tertiary/30 overflow-hidden">
      <div
        className="absolute h-2 rounded-full bg-utility-brand-600"
        style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
      />
    </div>
  )
}

// ── Result sections ───────────────────────────────────────────────────────────

function FlightList({ result, currency }: { result: SchedulerRunResult; currency: string }) {
  const horizonStart = result.horizon_start ?? ''
  const horizonDays = result.horizon_days ?? 1

  // People come back on prep tasks — index them by action for the flight rows.
  const peopleByAction = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const a of result.assignments ?? []) {
      if (a.is_prep && a.scheduled) {
        map[a.task_id.replace(/^prep_/, '')] = a.assigned_people
      }
    }
    return map
  }, [result.assignments])

  const assignments = result.assignments ?? []

  const flights = assignments.filter((a) => !a.is_prep)
  const scheduled = flights.filter((f) => f.scheduled && f.start_date)
  const dropped = flights.filter((f) => !f.scheduled)
  const overdue = new Set(result.production_overdue ?? [])

  return (
    <>
      <SectionCard>
        <h3 className="text-md font-semibold text-primary mb-1">Campaign timeline</h3>
        <p className="text-sm text-tertiary mb-4">
          {fmtDate(horizonStart)} –{' '}
          {fmtDate(
            new Date(
              new Date(horizonStart).getTime() + (horizonDays - 1) * 86_400_000
            ).toISOString()
          )}{' '}
          · {scheduled.length} of {flights.length} flights placed
        </p>
        <div className="space-y-4">
          {scheduled.map((f) => (
            <div key={f.task_id}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-primary truncate block">
                    {f.name}
                    {overdue.has(f.action_id ?? '') && (
                      <span className="ml-2 text-xs text-warning">production overdue</span>
                    )}
                  </span>
                  <span className="text-xs text-tertiary">
                    {fmtDate(f.start_date)} → {fmtDate(f.end_date)}
                    {peopleByAction[f.action_id ?? '']?.length
                      ? ` · ${peopleByAction[f.action_id ?? ''].join(', ')}`
                      : ''}
                    {f.value > 1 ? ` · ${fmtCurrency(f.value, currency)}` : ''}
                  </span>
                </div>
              </div>
              <TimelineBar
                start={f.start_date!}
                end={f.end_date!}
                horizonStart={horizonStart}
                horizonDays={horizonDays}
              />
            </div>
          ))}
          {scheduled.length === 0 && (
            <p className="text-sm text-tertiary">No flights could be placed.</p>
          )}
        </div>
      </SectionCard>

      {dropped.length > 0 && (
        <SectionCard>
          <h3 className="text-md font-semibold text-primary mb-1">
            Not scheduled ({dropped.length})
          </h3>
          <p className="text-sm text-tertiary mb-3">
            These flights didn't fit the team's capacity, their dates, or the budget.
          </p>
          <div className="space-y-2">
            {dropped.map((f) => (
              <div key={f.task_id} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                <div>
                  <span className="text-primary font-medium">{f.name}</span>
                  <span className="text-tertiary"> — {f.reason ?? 'no reason returned'}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {(result.skipped_actions?.length ?? 0) > 0 && (
        <p className="text-xs text-tertiary px-1">
          Not sent to the scheduler:{' '}
          {result.skipped_actions!.map((s) => `${s.channel} (${s.reason})`).join('; ')}
        </p>
      )}
    </>
  )
}

function ProductionList({ result }: { result: SchedulerRunResult }) {
  const preps = (result.assignments ?? []).filter((a) => a.is_prep && a.scheduled)
  if (preps.length === 0) return null
  return (
    <SectionCard>
      <h3 className="text-md font-semibold text-primary mb-1">Production work</h3>
      <p className="text-sm text-tertiary mb-3">Who builds what, before each flight goes live.</p>
      <div className="space-y-2">
        {preps.map((p) => (
          <div key={p.task_id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-primary truncate">{p.name.replace(/^Produce: /, '')}</span>
            <span className="text-secondary whitespace-nowrap">
              {p.assigned_people.join(', ') || '—'}
              <span className="text-tertiary">
                {' '}
                · {fmtDate(p.start_date)} → {fmtDate(p.end_date)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ── Team capacity grid ────────────────────────────────────────────────────────

function capacityCellClass(free: number, capacity: number): string {
  if (capacity <= 0) return 'bg-tertiary/30'
  const ratio = free / capacity
  if (ratio >= 0.99) return 'bg-emerald-500/70'
  if (ratio > 0) return 'bg-amber-400/80'
  return 'bg-red-500/80'
}

function CapacityGrid({ resources }: { resources: ResourceUtilization[] }) {
  const people = resources.filter((r) => r.kind === 'renewable')
  if (people.length === 0) return null
  const days = people[0]?.by_slot ?? []
  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit">
        <div className="flex items-center gap-1 mb-1 pl-36">
          {days.map((d) => (
            <span key={d.slot} className="w-6 text-center text-[10px] text-tertiary shrink-0">
              {d.date ? new Date(d.date).getDate() : d.slot}
            </span>
          ))}
        </div>
        {people.map((p) => (
          <div key={p.resource_id} className="flex items-center gap-1 mb-1">
            <span className="w-36 shrink-0 text-xs text-secondary truncate pr-2">{p.name}</span>
            {p.by_slot.map((d) => (
              <span
                key={d.slot}
                title={`${p.name} · ${d.date ?? `day ${d.slot}`} — free ${d.free.toFixed(1)} of ${d.capacity}`}
                className={`w-6 h-5 rounded-sm shrink-0 ${capacityCellClass(d.free, d.capacity)}`}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-4 mt-3 text-xs text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/70" /> free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-400/80" /> partly booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500/80" /> fully booked (ClickUp)
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

const SchedulerView = ({ onBack }: SchedulerViewProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id

  const {
    campaigns,
    isLoading,
    loadError,
    reload,
    runs,
    isRunning,
    result,
    error,
    run,
    availability,
    isLoadingAvailability,
    loadAvailability,
    isApplying,
    applyResult,
    apply,
    reset,
  } = useScheduler(sessionId, tenantId)

  const [campaignId, setCampaignId] = useState('')
  const selected = campaigns.find((c) => c.campaign_id === campaignId) ?? campaigns[0]
  const currency = selected?.budget_currency ?? 'ZAR'

  const handleRun = () => {
    if (selected) void run(selected.campaign_id)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Scheduler" onBack={onBack} className="border-b border-tertiary" />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" variant="primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Scheduler" onBack={onBack} className="border-b border-tertiary" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {loadError && (
            <SectionCard>
              <p className="text-sm text-secondary mb-3">
                Couldn't load your campaigns. Please try again.
              </p>
              <Button variant="secondary" onClick={() => void reload()}>
                Retry
              </Button>
            </SectionCard>
          )}

          {!loadError && (
            <SectionCard>
              <h3 className="text-md font-semibold text-primary mb-1">Build a schedule</h3>
              <p className="text-sm text-tertiary mb-4">
                Places this campaign's flights on the timeline against the team's real ClickUp
                availability and the campaign budget.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selected?.campaign_id ?? ''}
                  onChange={(e) => {
                    setCampaignId(e.target.value)
                    reset()
                  }}
                  className="flex-1 bg-primary border border-secondary rounded-lg px-3 py-2 text-sm text-primary"
                >
                  {campaigns.map((c) => (
                    <option key={c.campaign_id} value={c.campaign_id}>
                      {c.campaign_name}
                      {c.client_name ? ` — ${c.client_name}` : ''} ({c.status})
                    </option>
                  ))}
                </select>
                <Button variant="primary" onClick={handleRun} disabled={!selected || isRunning}>
                  {isRunning ? 'Scheduling…' : 'Build schedule'}
                </Button>
              </div>
              {selected && (
                <p className="text-xs text-tertiary mt-2">
                  {fmtDate(selected.start_date)} → {fmtDate(selected.end_date)}
                  {selected.budget_total
                    ? ` · budget ${fmtCurrency(selected.budget_total, currency)}`
                    : ''}
                </p>
              )}
              {error && <p className="text-sm text-warning mt-3">{error}</p>}
            </SectionCard>
          )}

          {isRunning && (
            <SectionCard className="text-center py-10">
              <Spinner size="lg" variant="primary" className="mx-auto mb-3" />
              <p className="text-sm text-tertiary">
                Checking team availability in ClickUp and solving the timeline…
              </p>
            </SectionCard>
          )}

          {result && !isRunning && !result.success && (
            <SectionCard>
              <h3 className="text-md font-semibold text-primary mb-2">Couldn't build a schedule</h3>
              {result.stage === 'validate' &&
                result.validation?.errors.map((e, i) => (
                  <p key={i} className="text-sm text-warning">
                    {e.message}
                  </p>
                ))}
              {result.error && <p className="text-sm text-warning">{result.error}</p>}
              <p className="text-xs text-tertiary mt-2">
                Usually this means fixed flight dates collide with team capacity — try adjusting
                dates on the campaign, or freeing up the team in ClickUp.
              </p>
            </SectionCard>
          )}

          {result && !isRunning && result.success && (
            <>
              <div className="flex flex-wrap gap-2">
                <StatChip
                  tone="good"
                  label={`${result.diagnostics?.scheduled_tasks ?? 0}/${result.diagnostics?.requested_tasks ?? 0} tasks placed`}
                />
                {(result.diagnostics?.dropped_tasks.length ?? 0) > 0 && (
                  <StatChip
                    tone="warn"
                    label={`${result.diagnostics!.dropped_tasks.length} dropped`}
                  />
                )}
                {(result.production_overdue?.length ?? 0) > 0 && (
                  <StatChip
                    tone="bad"
                    label={`${result.production_overdue!.length} production overdue`}
                  />
                )}
                <StatChip
                  tone="neutral"
                  label={
                    result.optimizer_allocations_used
                      ? 'Budgets from optimizer plan'
                      : 'Budgets from campaign'
                  }
                />
              </div>

              <FlightList result={result} currency={currency} />
              <ProductionList result={result} />

              <SectionCard>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-md font-semibold text-primary">Apply this schedule</h3>
                    <p className="text-sm text-tertiary">
                      Writes the placed dates onto the campaign's channel flights — the campaign
                      page and calendar update immediately.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => void apply(result.run_id)}
                    disabled={isApplying || !!applyResult}
                  >
                    {isApplying ? 'Applying…' : applyResult ? 'Applied' : 'Apply'}
                  </Button>
                </div>
                {applyResult && (
                  <p className="text-sm text-secondary mt-3">
                    Updated {applyResult.applied.length} flights
                    {applyResult.skipped.length > 0
                      ? ` · ${applyResult.skipped.length} left untouched (live or dropped)`
                      : ''}
                    .
                  </p>
                )}
              </SectionCard>
            </>
          )}

          {!loadError && (
            <SectionCard>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-md font-semibold text-primary">Team capacity</h3>
                  <p className="text-sm text-tertiary">
                    Next two weeks, straight from ClickUp bookings.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void loadAvailability(14)}
                  disabled={isLoadingAvailability}
                >
                  {isLoadingAvailability ? 'Loading…' : availability ? 'Refresh' : 'Show'}
                </Button>
              </div>
              {isLoadingAvailability && !availability && (
                <div className="py-6 text-center">
                  <Spinner size="sm" variant="primary" />
                </div>
              )}
              {availability && <CapacityGrid resources={availability.resources} />}
            </SectionCard>
          )}

          {runs.length > 0 && (
            <SectionCard>
              <h3 className="text-md font-semibold text-primary mb-3">Previous runs</h3>
              <div className="space-y-1.5">
                {runs.slice(0, 8).map((r) => (
                  <div
                    key={r.run_id}
                    className="flex items-center justify-between text-xs text-tertiary"
                  >
                    <span>
                      {r.created_at ? new Date(r.created_at).toLocaleString('en-ZA') : '—'} ·{' '}
                      {r.scheduled_tasks ?? 0}/{r.requested_tasks ?? 0} placed
                    </span>
                    <span>{r.applied_at ? 'applied' : r.success ? 'not applied' : 'failed'}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}

export default SchedulerView
