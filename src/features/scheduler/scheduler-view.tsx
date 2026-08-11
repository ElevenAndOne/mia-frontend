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

// ── Result sections ───────────────────────────────────────────────────────────

// ── Plan timeline ─────────────────────────────────────────────────────────────
// One shared date axis, two bands: what the campaign runs, and who is doing the
// work behind it. Read a flight in the top band and its build sits directly
// below in someone's lane.

const PHASE_COLOURS = ['#4f6d9a', '#6b5b9a', '#3f7a63', '#96602f', '#8a4f6d']
const QC_COLOUR = 'var(--brand-600, #6366f1)'
const DAY_PX = 15

/** "Campaign — Reach: meta_ads" → { phase: 'Reach', label: 'Meta ads' } */
function splitName(name: string): { phase: string; label: string } {
  const body = name.replace(/^(Produce|QC): /, '')
  const m = body.match(/—\s*([^:]+?):\s*(.+)$/)
  if (!m) return { phase: '', label: body }
  const label = m[2].replace(/_/g, ' ')
  return { phase: m[1].trim(), label: label.charAt(0).toUpperCase() + label.slice(1) }
}

/** 6 sprint points is a working day, so 3 pt reads as "half a day". */
function fmtEffort(points?: number | null): string {
  if (!points) return ''
  const days = points / 6
  const rough =
    days <= 0.4 ? 'a few hours' : days <= 0.6 ? 'half a day' : `${Math.round(days * 2) / 2} days`
  return `${points} pt · ${rough}`
}

const dayIndex = (iso: string, from: string) =>
  Math.round((new Date(iso).getTime() - new Date(from).getTime()) / 86_400_000)

function PlanTimeline({ result, currency }: { result: SchedulerRunResult; currency: string }) {
  const horizonStart = result.horizon_start ?? ''
  const assignments = useMemo(() => result.assignments ?? [], [result.assignments])

  const model = useMemo(() => {
    const scheduled = assignments.filter((a) => a.scheduled && a.start_date && a.end_date)
    if (!horizonStart || scheduled.length === 0) return null

    // Show only the span that actually has something in it, not the whole horizon.
    const starts = scheduled.map((a) => dayIndex(a.start_date!, horizonStart))
    const ends = scheduled.map((a) => dayIndex(a.end_date!, horizonStart))
    const from = Math.max(0, Math.min(...starts))
    const to = Math.max(...ends)
    const span = Math.max(1, to - from + 1)
    const windowStart = new Date(new Date(horizonStart).getTime() + from * 86_400_000)

    const phases: string[] = []
    for (const f of assignments.filter((a) => a.kind === 'flight')) {
      const { phase } = splitName(f.name)
      if (phase && !phases.includes(phase)) phases.push(phase)
    }
    const colourOf = (phase: string) =>
      PHASE_COLOURS[Math.max(0, phases.indexOf(phase)) % PHASE_COLOURS.length]

    // Build/sign-off work, grouped by the person doing it.
    const workByPerson: Record<string, typeof assignments> = {}
    for (const a of scheduled) {
      if (a.kind === 'flight') continue
      for (const who of a.assigned_people.length ? a.assigned_people : ['Unassigned']) {
        ;(workByPerson[who] ||= []).push(a)
      }
    }

    return { from, span, windowStart, phases, colourOf, workByPerson }
  }, [assignments, horizonStart])

  if (!model) return null
  const { from, span, windowStart, phases, colourOf, workByPerson } = model
  const pct = (n: number) => (n / span) * 100
  const posOf = (a: (typeof assignments)[number]) => {
    const s = dayIndex(a.start_date!, horizonStart) - from
    const e = dayIndex(a.end_date!, horizonStart) - from
    return { left: pct(s), width: Math.max(pct(e - s + 1), 1.2) }
  }

  const flights = assignments.filter((a) => a.kind === 'flight' && a.scheduled && a.start_date)
  const overdue = new Set(result.production_overdue ?? [])
  // Everyone in the pod, busy first — seeing who sat free while someone else
  // was buried is half the point of this view.
  const calendar = [...(result.resource_calendar ?? [])].sort(
    (a, b) => (workByPerson[b.name]?.length ?? 0) - (workByPerson[a.name]?.length ?? 0)
  )

  const ticks: number[] = []
  for (let i = 0; i < span; i += 7) ticks.push(i)
  const todayOffset = dayIndex(new Date().toISOString().slice(0, 10), horizonStart) - from

  return (
    <SectionCard className="overflow-hidden">
      <h3 className="text-md font-semibold text-primary mb-1">The plan</h3>
      <p className="text-sm text-tertiary mb-3">
        What runs when, and who is building it. Hover anything for detail.
      </p>

      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ minWidth: `${Math.max(span * DAY_PX + 150, 600)}px` }}>
          {/* date ruler */}
          <div className="flex">
            <div className="w-[150px] shrink-0" />
            <div className="relative flex-1 h-5 border-b border-secondary">
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute top-0 h-full pl-1 text-[10px] leading-5 text-tertiary border-l border-secondary"
                  style={{ left: `${pct(t)}%` }}
                >
                  {new Date(windowStart.getTime() + t * 86_400_000).toLocaleDateString('en-ZA', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              ))}
              {todayOffset >= 0 && todayOffset < span && (
                <span
                  className="absolute top-0 bottom-0 w-px bg-red-400/80 z-10"
                  style={{ left: `${pct(todayOffset)}%` }}
                  title="Today"
                />
              )}
            </div>
          </div>

          {/* band 1 — the campaign */}
          {phases.map((phase) => {
            const rows = flights.filter((f) => splitName(f.name).phase === phase)
            if (rows.length === 0) return null
            const spend = rows.reduce((s, f) => s + (f.budget || 0), 0)
            return (
              <div key={phase} className="mt-3">
                <div className="flex">
                  <div className="w-[150px] shrink-0" />
                  <div className="flex-1 flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                      {phase}
                    </span>
                    <span className="text-[10px] text-tertiary">
                      {rows.length} flight{rows.length === 1 ? '' : 's'}
                      {spend > 0 ? ` · ${fmtCurrency(spend, currency)}` : ''}
                    </span>
                  </div>
                </div>
                {rows.map((f) => {
                  const p = posOf(f)
                  return (
                    <div key={f.task_id} className="flex items-center min-h-[26px]">
                      <div className="w-[150px] shrink-0 pr-2 text-xs text-primary truncate">
                        {splitName(f.name).label}
                        {overdue.has(f.action_id ?? '') && (
                          <span className="ml-1 text-[10px] text-warning">overdue</span>
                        )}
                      </div>
                      <div className="relative flex-1 h-[22px]">
                        <span className="absolute inset-x-0 top-1/2 h-px bg-tertiary/30" />
                        <span
                          className="absolute top-1/2 -translate-y-1/2 h-[9px] rounded-sm"
                          style={{
                            left: `${p.left}%`,
                            width: `${p.width}%`,
                            background: colourOf(phase),
                          }}
                          title={`${splitName(f.name).label} runs ${fmtDate(f.start_date)} – ${fmtDate(f.end_date)}${f.budget > 0 ? ` · ${fmtCurrency(f.budget, currency)}` : ''}`}
                          aria-label={splitName(f.name).label}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* band 2 — the team */}
          {calendar.length > 0 && (
            <div className="mt-5 pt-3 border-t border-secondary">
              <div className="flex mb-1">
                <div className="w-[150px] shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  Who&rsquo;s doing it
                </span>
              </div>
              {calendar.map((person) => {
                const work = workByPerson[person.name] ?? []
                return (
                  <div
                    key={person.resource_id}
                    className="flex items-center min-h-[34px] border-t border-secondary/40"
                  >
                    <div className="w-[150px] shrink-0 pr-2">
                      <span className="block text-xs font-medium text-primary truncate">
                        {person.name}
                      </span>
                      <span className="block text-[10px] text-tertiary truncate">
                        {person.role ?? ''}
                      </span>
                    </div>
                    <div className="relative flex-1 h-[30px]">
                      {/* existing commitments */}
                      <div
                        className="absolute inset-x-0 top-1 h-[5px] rounded-sm overflow-hidden grid"
                        style={{ gridTemplateColumns: `repeat(${span}, 1fr)` }}
                      >
                        {Array.from({ length: span }, (_, i) => {
                          const state = person.days[from + i]
                          const cls =
                            state === 'booked'
                              ? 'bg-red-500/55'
                              : state === 'leave'
                                ? 'bg-amber-400/70'
                                : state === 'holiday'
                                  ? 'bg-sky-400/50'
                                  : state === 'off'
                                    ? 'bg-transparent'
                                    : 'bg-emerald-500/20'
                          const label =
                            state === 'booked'
                              ? 'already booked in ClickUp'
                              : state === 'leave'
                                ? 'on leave'
                                : state === 'holiday'
                                  ? 'public holiday'
                                  : state === 'off'
                                    ? 'weekend or not in'
                                    : 'free'
                          return (
                            <span
                              key={i}
                              className={cls}
                              title={`${person.name} · ${new Date(windowStart.getTime() + i * 86_400_000).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })} — ${label}`}
                            />
                          )
                        })}
                      </div>
                      {/* what we're adding */}
                      {work.map((w) => {
                        const p = posOf(w)
                        const { phase, label } = splitName(w.name)
                        const isQc = w.kind === 'qc'
                        return (
                          <span
                            key={w.task_id}
                            className="absolute top-[10px] h-[17px] rounded-sm flex items-center px-1 text-[9px] text-white overflow-hidden whitespace-nowrap"
                            style={{
                              left: `${p.left}%`,
                              width: `${p.width}%`,
                              background: isQc ? QC_COLOUR : colourOf(phase),
                            }}
                            title={`${person.name} — ${isQc ? 'signs off' : 'builds'} ${label}${
                              isQc ? '' : fmtEffort(w.points) ? ` (${fmtEffort(w.points)})` : ''
                            } · ${fmtDate(w.start_date)}${w.start_date !== w.end_date ? ` – ${fmtDate(w.end_date)}` : ''}`}
                          >
                            {isQc
                              ? 'QC'
                              : p.width > 10 && w.points
                                ? `${label} · ${w.points}pt`
                                : p.width > 6
                                  ? label
                                  : ''}
                          </span>
                        )
                      })}
                    </div>
                    <span className="w-14 shrink-0 text-right text-[10px] text-tertiary">
                      {work.length ? `${work.length} job${work.length === 1 ? '' : 's'}` : 'free'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px] text-tertiary">
        <span className="flex items-center gap-1.5">
          <i className="w-3 h-1.5 rounded-sm bg-red-500/55" /> already booked
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-3 h-1.5 rounded-sm bg-amber-400/70" /> on leave
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-3 h-1.5 rounded-sm bg-sky-400/50" /> public holiday
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-3 h-1.5 rounded-sm bg-emerald-500/20" /> free
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-3 h-2 rounded-sm" style={{ background: QC_COLOUR }} /> sign-off
        </span>
      </div>
    </SectionCard>
  )
}

function DroppedList({ result }: { result: SchedulerRunResult }) {
  const flights = (result.assignments ?? []).filter((a) => a.kind === 'flight')
  const dropped = flights.filter((f) => !f.scheduled)

  return (
    <>
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
                  <span className="text-primary font-medium">
                    {splitName(f.name).phase} · {splitName(f.name).label}
                  </span>
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
                {result.pod && (
                  <StatChip
                    tone="neutral"
                    label={`Pod ${result.pod} · ${result.intensity ?? 'medium'} intensity`}
                  />
                )}
                {result.client_mapped === false && (
                  <StatChip tone="warn" label="Client not assigned to a pod — using whole team" />
                )}
                {result.pins_relaxed && (
                  <StatChip
                    tone="warn"
                    label="Account owner was full — the pod covered some work"
                  />
                )}
                {result.campaign_ended && (
                  <StatChip
                    tone="bad"
                    label={`Campaign ended ${fmtDate(result.campaign_end_date)} — planning past its end date`}
                  />
                )}
              </div>

              <PlanTimeline result={result} currency={currency} />
              <DroppedList result={result} />

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
