import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { fetchPlaybooks } from '../api'
import { KpiPicker } from './kpi-picker'
import { JobWords, WordsCard } from './final-words'
import { Button } from '../../../components/button'
import type { BudgetChannel, BuildState, CreativeBrief, KpiGroup, KpiTarget, Plan, PlanAsset, PlanOp, PlanReview } from '../types'
import { Card, Chip, NeedsYou, RunFailed, RunProgress, channelLabel, day, money, num } from './parts'

// Plan tab (plan §8.2): the concept, one column per phase (budget, why, KPI targets with their
// basis), the jobs for the studio with their designer briefs and credits, then Approve.
// Edits save as you leave a field; the server re-prices and re-checks the plan.

interface Props {
  state: BuildState
  kpiGroups: KpiGroup[]
  busy: string | null
  onEdit: (ops: PlanOp[]) => Promise<unknown>
  onMakePlan: () => Promise<unknown>
  onApprove: () => Promise<unknown>
  onWriteWords: (jobIds?: string[], rewrite?: boolean) => Promise<unknown>
  onSaveBrief: (fields: { playbook: string | null }) => Promise<unknown>
  onReprice: () => Promise<unknown>
}

export function PlanTab({ state, kpiGroups, busy, onEdit, onMakePlan, onApprove, onWriteWords, onSaveBrief, onReprice }: Props) {
  const [picking, setPicking] = useState<string | null>(null) // the phase whose KPI picker is open
  const [openJobs, setOpenJobs] = useState<Set<number>>(() => new Set())
  const needsSource = new Set(kpiGroups.flatMap((g) => g.kpis.filter((k) => k.needs_source).map((k) => k.kpi_key)))
  const run = state.plan_run
  const plan = state.plan
  const locked = !state.campaign.building

  if (run?.status === 'running') return <RunProgress run={run} what="plan" />
  if (!plan) {
    if (run?.status === 'failed') return <RunFailed run={run} what="plan" busy={!!busy} onRetry={() => onMakePlan()} />
    return (
      <Card>
        <p className="paragraph-sm text-secondary">No plan yet. Check the brief, then press Make the plan.</p>
      </Card>
    )
  }

  const currency = state.campaign.currency
  const sp = plan.decisions.budget_split
  const split = sp?.value ?? {}
  const pmPhases = new Set(sp?.pm_phases ?? [])
  // Opening a job (or a target) from "Needs you": the row expands and scrolls into view.
  const reveal = (id: string, jobIndex?: number) => {
    if (jobIndex != null) setOpenJobs((o) => new Set(o).add(jobIndex))
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }
  return (
    <div className="flex flex-col gap-4">
      {run?.status === 'failed' ? <RunFailed run={run} what="plan" busy={!!busy} onRetry={() => onMakePlan()} /> : null}
      {locked ? (
        <Card className="paragraph-sm text-primary">
          Approved{state.approved?.at ? ` ${day(state.approved.at)}` : ''}
          {state.approved?.by ? ` by ${state.approved.by}` : ''}. It's saved as a draft campaign: it goes live when you
          launch it, so nothing is tracked or counted before then. Next: the Studio tab sends the jobs to Flex.
        </Card>
      ) : null}
      {state.plan_from_older_brief && !locked ? (
        <Card warn className="paragraph-sm text-primary">
          The brief changed after this plan was made. Make the plan again from the Brief tab to use it.
        </Card>
      ) : null}
      {!locked && plan.assets.length && plan.assets.every((a) => a.credits == null) ? (
        // The plan was made while Flex couldn't be reached: no Credit Ledger, so no job has credits.
        <Card warn className="flex flex-wrap items-center justify-between gap-3">
          <p className="paragraph-sm text-primary">Flex couldn't be reached when Mia made this plan, so the jobs have no credits yet.</p>
          <Button size="sm" variant="primary" loading={busy === 'reprice'} onClick={() => onReprice()}>
            Get prices from Flex
          </Button>
        </Card>
      ) : null}

      {locked ? null : <NeedsYouPanel state={state} plan={plan} busy={busy} onEdit={onEdit} onReveal={reveal} />}
      <Summary plan={plan} state={state} currency={currency} />
      <WordsCard state={state} busy={busy} locked={locked} onWrite={onWriteWords} />
      <Shape plan={plan} state={state} locked={locked} busy={busy} onSaveBrief={onSaveBrief} onMakePlan={onMakePlan} />

      <section className="flex flex-col gap-2">
        <h2 className="subheading-md text-primary">Phases, budget and targets</h2>
        {sp?.reason ? (
          <details className="paragraph-xs text-tertiary">
            <summary className="cursor-pointer">How the budget is split</summary>
            <p className="mt-1 text-secondary">{sp.reason}</p>
            {sp.history_notes?.length ? <p className="mt-1">{sp.history_notes.join(' ')}</p> : null}
          </details>
        ) : null}
        <div className="grid gap-3 @2xl:grid-cols-2 @7xl:grid-cols-4">
          {plan.phases.map((p) => (
            <section key={p.phase} className="min-w-0 rounded-xl border border-secondary bg-secondary p-3 flex flex-col gap-2 [overflow-wrap:break-word]">
              <header className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="subheading-md text-primary">{p.phase}</h3>
                  <BudgetField
                    value={split?.[p.phase] ?? null}
                    currency={currency}
                    disabled={locked}
                    onCommit={(v) => onEdit([{ op: 'set_budget', phase: p.phase, value: v }])}
                  />
                </div>
                {pmPhases.has(p.phase) ? <Chip tone="pm">your amount</Chip> : null}
                <p className="paragraph-xs text-tertiary">{p.channels.map(channelLabel).join(' · ')}</p>
                {p.objective ? (
                  <details className="paragraph-xs text-secondary">
                    <summary className="cursor-pointer line-clamp-2">{p.objective}</summary>
                    <p className="mt-1">{p.objective}</p>
                  </details>
                ) : null}
                {(sp?.channels ?? []).some((c) => c.phase === p.phase) ? (
                  <details className="paragraph-xs">
                    <summary className="cursor-pointer text-tertiary">Money by channel</summary>
                    <div className="mt-1">
                      <ChannelMoney
                        rows={(sp?.channels ?? []).filter((c) => c.phase === p.phase)}
                        currency={currency}
                        disabled={locked}
                        onCommit={(channel, v) => onEdit([{ op: 'set_channel_budget', phase: p.phase, channel, value: v }])}
                      />
                    </div>
                  </details>
                ) : null}
              </header>
              <div className="flex flex-col gap-1.5">
                {plan.decisions.kpi_targets
                  .filter((t) => t.phase === p.phase)
                  .map((t) => (
                    <Target key={t.key} t={t} disabled={locked} onEdit={onEdit} needsSource={needsSource.has(t.kpi_key)} />
                  ))}
                {locked ? null : picking === p.phase ? (
                  <KpiPicker
                    groups={kpiGroups}
                    busy={busy === 'edit'}
                    taken={new Set(plan.decisions.kpi_targets.filter((t) => t.phase === p.phase).map((t) => t.kpi_key))}
                    onClose={() => setPicking(null)}
                    onPick={async (key) => {
                      await onEdit([{ op: 'add_kpi', phase: p.phase, kpi_key: key }])
                      setPicking(null)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="self-start rounded-md border border-dashed border-secondary px-2 py-1 paragraph-xs text-secondary hover:text-primary hover:border-brand"
                    onClick={() => setPicking(p.phase)}
                  >
                    + Add a KPI from the list
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="subheading-md text-primary">Jobs for the studio ({plan.assets.length})</h2>
          <p className="paragraph-xs text-tertiary">Open a job for its words, designer brief and audience.</p>
        </div>
        {plan.phases.map((p) => {
          const jobs = plan.assets.map((a, i) => ({ a, i })).filter(({ a }) => a.phase === p.phase)
          if (!jobs.length) return null
          return (
            <div key={p.phase} className="rounded-xl border border-secondary bg-secondary">
              <p className="px-3 pt-2 label-xs text-tertiary">
                {p.phase} · {jobs.length} job{jobs.length === 1 ? '' : 's'}
              </p>
              <ul className="divide-y divide-secondary">
                {jobs.map(({ a, i }) => (
                  <JobRow
                    key={a.job_id ?? `${i}-${a.name}`}
                    a={a}
                    index={i}
                    open={openJobs.has(i)}
                    onToggle={() => setOpenJobs((o) => { const n = new Set(o); if (n.has(i)) n.delete(i); else n.add(i); return n })}
                  >
                    <Job
                      a={a}
                      index={i}
                      disabled={locked}
                      onEdit={onEdit}
                      wordsRunning={state.words_run?.status === 'running'}
                      onRewrite={(ids) => onWriteWords(ids, true)}
                    />
                  </JobRow>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <details className="rounded-xl border border-secondary bg-primary px-4 py-3">
        <summary className="cursor-pointer subheading-sm text-primary">
          The idea in full, Mia's self-check and checks
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <Concept plan={plan} />
          {plan.review ? <SelfCheck review={plan.review} /> : null}
          <Checks plan={plan} />
        </div>
      </details>

      {locked ? null : (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="paragraph-sm text-secondary">
            {state.blockers.length
              ? `Approve is locked: ${state.blockers.length} thing${state.blockers.length === 1 ? '' : 's'} in "Needs you" first.`
              : 'Approving saves this plan to the campaign. The jobs are sent to the studio in the next step.'}
          </p>
          {state.warnings?.length ? (
            <ul className="w-full paragraph-xs text-utility-warning-700 flex flex-col gap-0.5">
              {state.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}
          <Button variant="primary" disabled={!!state.blockers.length} loading={busy === 'approve'} onClick={() => onApprove()}>
            Approve the plan
          </Button>
        </Card>
      )}
    </div>
  )
}

// "Needs you" (16 Oct, the Onvlee test): only what the PM must fix or decide, each one click from its fix.
// Blockers first (they lock Approve), then jobs whose words need a look, then what's worth deciding.
function NeedsYouPanel({
  state,
  plan,
  busy,
  onEdit,
  onReveal,
}: {
  state: BuildState
  plan: Plan
  busy: string | null
  onEdit: Props['onEdit']
  onReveal: (id: string, jobIndex?: number) => void
}) {
  const jobIndex = (name?: string) => plan.assets.findIndex((a) => a.name === name)
  const flagged = plan.assets.map((a, i) => ({ a, i })).filter(({ a }) => a.final_words?.status === 'flagged')
  const asks = (plan.decisions.ask_pm ?? []).map((q) => (typeof q === 'string' ? { question: q } : q))
  const lookAt = plan.review?.scorecard?.look_at ?? []
  const datesPassed = state.blockers.some((b) => b.what.includes('which has passed'))
  const must = state.blockers.length + flagged.length
  return (
    <Card warn={must > 0} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="subheading-md text-primary">{must ? `Needs you · ${must}` : 'Nothing needs you'}</h2>
        {!must ? <p className="paragraph-xs text-tertiary">Read the plan below, then approve at the end.</p> : null}
      </div>
      {state.blockers.length ? (
        <ul className="flex flex-col gap-1">
          {state.blockers.map((b, k) => {
            const ji = jobIndex(b.key)
            const target = plan.decisions.kpi_targets.find((t) => t.key === b.key)
            return (
              <li key={k} className="flex flex-wrap items-center justify-between gap-2 paragraph-sm text-primary">
                <span className="min-w-0">🔒 {b.what}</span>
                {target || ji >= 0 ? (
                  <button type="button" className="paragraph-xs underline text-primary"
                    onClick={() => (target ? onReveal(`t-${target.key}`) : onReveal(`job-${ji}`, ji))}>
                    Show me
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
      {datesPassed ? (
        <Button size="sm" loading={busy === 'edit'} onClick={() => onEdit([{ op: 'shift_dates', days: 7 }])}>
          Move all job dates a week later
        </Button>
      ) : null}
      {flagged.length ? (
        <ul className="flex flex-col gap-1">
          {flagged.map(({ a, i }) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 paragraph-sm text-primary">
              <span className="min-w-0">
                ✏️ <span className="font-medium">{a.name}</span>
                <span className="block paragraph-xs text-secondary">{a.final_words?.flags[0]?.problem}</span>
              </span>
              <button type="button" className="paragraph-xs underline text-primary" onClick={() => onReveal(`job-${i}`, i)}>
                Fix the words
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {asks.length || lookAt.length ? (
        <details>
          <summary className="cursor-pointer paragraph-sm text-secondary">
            Worth deciding ({asks.length + lookAt.length}): Mia's questions and her self-check's notes
          </summary>
          <ul className="mt-2 flex flex-col gap-2 paragraph-sm text-primary">
            {asks.map((q, k) => (
              <li key={`q${k}`}>
                {'about' in q && q.about ? <span className="label-xs text-secondary block">{String(q.about)}</span> : null}
                {q.question}
              </li>
            ))}
            {lookAt.map((x) => (
              <li key={x} className="text-secondary">
                <span className="label-xs block">Self-check</span>
                {x}
              </li>
            ))}
          </ul>
          <p className="mt-2 paragraph-xs text-tertiary">Answer in the chat on the right; Mia changes the plan from there.</p>
        </details>
      ) : null}
    </Card>
  )
}

// The plan at a glance: the idea in one line, the money by phase, the studio work and the self-check grade.
function Summary({ plan, state, currency }: { plan: Plan; state: BuildState; currency: string }) {
  const sc = plan.review?.scorecard
  const split = plan.decisions.budget_split?.value ?? {}
  const credits = plan.credits
  const words = plan.assets.filter((a) => a.final_words).length
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="subheading-md text-primary">{plan.concept.name}</p>
        {sc && !sc.thin_history ? (
          <span className="rounded-full bg-brand-solid px-3 py-0.5 subheading-sm text-primary-onbrand">
            Self-check {sc.grade} · {sc.overall}
          </span>
        ) : null}
      </div>
      {plan.concept.big_idea ? <p className="paragraph-sm text-secondary line-clamp-2">{plan.concept.big_idea}</p> : null}
      <dl className="grid gap-x-6 gap-y-1 paragraph-sm @xl:grid-cols-3">
        <div>
          <dt className="label-xs text-tertiary">Budget by phase</dt>
          <dd className="text-primary">
            {Object.entries(split).filter(([, v]) => v).map(([k, v]) => `${k} ${money(v, currency)}`).join(' · ') || '—'}
          </dd>
        </div>
        <div>
          <dt className="label-xs text-tertiary">Studio</dt>
          <dd className="text-primary">
            {plan.assets.length} jobs · {num(credits?.total_planned ?? 0)} credits ·{' '}
            {credits?.status === 'fits' ? 'fits the sprints' : credits?.status === 'over' ? 'over in some sprints' : 'room unknown'}
          </dd>
        </div>
        <div>
          <dt className="label-xs text-tertiary">Final words</dt>
          <dd className="text-primary">
            {words ? `${words} of ${plan.assets.length} written` : 'not written yet'}
            {state.words_run?.status === 'running' ? ' · writing now' : ''}
          </dd>
        </div>
      </dl>
    </Card>
  )
}

// One job as one line; opens to the full job (words, designer brief, audience).
function JobRow({
  a,
  index,
  open,
  onToggle,
  children,
}: {
  a: PlanAsset
  index: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const status = a.final_words?.status
  const dot = a.credits == null || status === 'flagged' ? 'bg-utility-warning-500' : status === 'ready' ? 'bg-utility-success-500' : 'bg-tertiary'
  const label = a.credits == null ? 'no rate yet' : status === 'flagged' ? 'words need a look' : status === 'ready' ? 'words ready' : 'no words yet'
  return (
    <li id={`job-${index}`}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left hover:bg-primary">
        <span className={`size-2.5 shrink-0 rounded-full ${dot}`} title={label} aria-label={label} />
        <span className="min-w-0 flex-1 paragraph-sm text-primary">{a.name}</span>
        <span className="paragraph-xs text-tertiary">
          {channelLabel(a.channel)} · {a.ledger_type ?? '—'}
          {a.ledger_tier ? ` ${a.ledger_tier}` : ''}
        </span>
        <span className="paragraph-xs text-secondary tabular-nums">{a.credits == null ? '? credits' : `${num(a.credits)} cr`}</span>
        <span className="paragraph-xs text-tertiary whitespace-nowrap">
          {day(a.due_date)} → {day(a.launch_date)}
        </span>
        <span className="paragraph-xs text-tertiary">{open ? '▴' : '▾'}</span>
      </button>
      {open ? <div className="px-3 pb-3">{children}</div> : null}
    </li>
  )
}

// The starting shape (A4): the playbook the plan was built from, why, and the PM's way to change it. A change
// is saved on the brief, so the next "Make the plan again" builds around it.
function Shape({
  plan,
  state,
  locked,
  busy,
  onSaveBrief,
  onMakePlan,
}: {
  plan: Plan
  state: BuildState
  locked: boolean
  busy: string | null
  onSaveBrief: Props['onSaveBrief']
  onMakePlan: Props['onMakePlan']
}) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const books = useQuery({
    queryKey: ['playbooks', tenantId],
    queryFn: () => fetchPlaybooks(sessionId!, tenantId!),
    enabled: !!sessionId && !!tenantId && !locked,
    staleTime: 10 * 60 * 1000,
  })
  const pb = plan.decisions.playbook
  const chosen = ((state.brief?.brief ?? {}) as Record<string, unknown>).playbook as string | null | undefined
  if (!pb && locked) return null
  return (
    <Card className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="label-xs text-tertiary">Starting shape</p>
        {pb ? (
          <>
            <p className="subheading-sm text-primary mt-0.5 flex flex-wrap items-center gap-2">
              {pb.name}
              {pb.blend_name ? <span className="paragraph-sm text-secondary">+ {pb.blend_name}</span> : null}
              <Chip tone={pb.made_by === 'pm' ? 'pm' : 'mia'}>{pb.made_by === 'pm' ? 'your choice' : `${pb.confidence} confidence`}</Chip>
            </p>
            <details className="paragraph-xs text-secondary mt-0.5">
              <summary className="cursor-pointer line-clamp-2">{pb.chosen_because}</summary>
              <p className="mt-1">{pb.chosen_because}</p>
            </details>
          </>
        ) : (
          <p className="paragraph-sm text-secondary mt-0.5">This plan was made before playbooks were used. Pick one and make the plan again.</p>
        )}
        {chosen && chosen !== pb?.slug ? (
          <p className="paragraph-xs text-primary mt-1">
            You picked another shape. Make the plan again to build around it.{' '}
            <button type="button" className="underline" disabled={!!busy} onClick={() => onMakePlan()}>
              Make the plan again
            </button>
          </p>
        ) : null}
      </div>
      {locked || !books.data ? null : (
        <label className="flex items-center gap-1 paragraph-xs text-tertiary">
          Change
          <select
            className="max-w-56 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-xs text-primary"
            value={chosen ?? ''}
            disabled={!!busy}
            onChange={(e) => void onSaveBrief({ playbook: e.target.value || null })}
          >
            <option value="">Mia picks</option>
            {books.data.playbooks.map((b) => (
              <option key={b.slug} value={b.slug} title={b.summary}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </Card>
  )
}

function Concept({ plan }: { plan: Plan }) {
  const c = plan.concept
  return (
    <Card>
      <p className="label-xs text-tertiary">The idea</p>
      <h2 className="subheading-md text-primary mt-1">{c.name}</h2>
      {c.big_idea ? <p className="paragraph-sm text-primary mt-2">{c.big_idea}</p> : null}
      <div className="mt-3 grid gap-3 @xl:grid-cols-2">
        {c.why_this_client_now ? (
          <div className="min-w-0">
            <p className="label-xs text-secondary">Why this client, now</p>
            <p className="paragraph-sm text-secondary mt-0.5">{c.why_this_client_now}</p>
          </div>
        ) : null}
        {c.how_it_differs_from_recent_campaigns ? (
          <div className="min-w-0">
            <p className="label-xs text-secondary">How it differs from recent campaigns</p>
            <p className="paragraph-sm text-secondary mt-0.5">{c.how_it_differs_from_recent_campaigns}</p>
          </div>
        ) : null}
      </div>
    </Card>
  )
}



function useField(value: string) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return [v, setV] as const
}

const asNumber = (s: string): number | null => {
  const t = s.replace(/[^\d.]/g, '')
  return t === '' ? null : Number(t)
}

const BASIS_LABEL: Record<BudgetChannel['basis'], string> = {
  history: 'from results',
  account: 'past rate',
  test: 'test',
  no_basis: 'even',
  pm: 'yours',
}

// Each paid channel's money in the phase, why it got that much, and roughly what it buys at the
// client's past rates. Shown only when the phase has two paid channels or a past rate to show.
function ChannelMoney({
  rows,
  currency,
  disabled,
  onCommit,
}: {
  rows: BudgetChannel[]
  currency: string
  disabled: boolean
  onCommit: (channel: string, v: number | null) => void
}) {
  if (!rows.length || (rows.length === 1 && !rows[0].buys)) return null
  return (
    <ul className="flex flex-col gap-1.5 rounded-md border border-secondary bg-primary p-2">
      {rows.map((c) => (
        <li key={c.channel} className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="paragraph-xs text-primary flex items-center gap-1.5 whitespace-nowrap">
              {channelLabel(c.channel)}
              <Chip tone={c.basis === 'pm' ? 'pm' : c.basis === 'history' ? 'good' : undefined}>{BASIS_LABEL[c.basis]}</Chip>
            </span>
            {rows.length > 1 ? (
              <BudgetField value={c.amount} currency={currency} disabled={disabled} onCommit={(v) => onCommit(c.channel, v)} />
            ) : (
              <span className="paragraph-xs text-secondary">{money(c.amount, currency)}</span>
            )}
          </div>
          <span className="paragraph-xs text-tertiary">
            {c.why}
            {c.buys ? ` About ${num(c.buys.amount)} ${c.buys.unit} at past rates.` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BudgetField({
  value,
  currency,
  disabled,
  onCommit,
}: {
  value: number | null
  currency: string
  disabled: boolean
  onCommit: (v: number | null) => void
}) {
  const [v, setV] = useField(value == null ? '' : String(value))
  if (disabled) return <span className="paragraph-sm text-primary">{money(value, currency)}</span>
  return (
    <label className="flex items-center gap-1 paragraph-xs text-tertiary">
      <span className="sr-only">Budget</span>R
      <input
        className="w-24 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary text-right"
        inputMode="numeric"
        value={v}
        placeholder="budget"
        onChange={(e) => setV(e.target.value)}
        onBlur={() => asNumber(v) !== value && onCommit(asNumber(v))}
      />
    </label>
  )
}

function Target({
  t,
  disabled,
  onEdit,
  needsSource = false,
}: {
  t: KpiTarget
  disabled: boolean
  onEdit: Props['onEdit']
  needsSource?: boolean
}) {
  const [v, setV] = useField(t.value == null ? '' : String(t.value))
  const missing = t.value == null && !t.no_target
  const basis =
    t.made_by === 'pm' && t.value != null ? (
      <Chip tone="pm">set by you</Chip>
    ) : t.no_target ? (
      <Chip>no target</Chip>
    ) : t.basis === 'history' ? (
      <Chip tone="mia">from history</Chip>
    ) : t.basis === 'account' ? (
      <Chip tone="mia">from the last 90 days</Chip>
    ) : t.basis === 'budget' ? (
      // What the phase's money buys at the client's past rates (A2); "a ceiling" when spend outscales history.
      <Chip tone="mia">{t.confidence === 'low' ? 'from the budget · a ceiling' : 'from the budget'}</Chip>
    ) : (
      <NeedsYou>no basis: you set it</NeedsYou>
    )
  return (
    <div id={`t-${t.key}`} className={`rounded-lg bg-primary px-2 py-1.5 ${missing ? 'border-2 border-utility-warning-300' : 'border border-secondary'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="label-sm text-primary min-w-0">
          {t.kpi_name}
          {disabled ? null : (
            <button
              type="button"
              className="ml-2 paragraph-xs text-tertiary hover:text-primary"
              aria-label={`Remove ${t.kpi_name}`}
              onClick={() => onEdit([{ op: 'remove_kpi', key: t.key }])}
            >
              Remove
            </button>
          )}
        </p>
        {disabled ? (
          <span className="paragraph-sm text-primary">{t.value == null ? '—' : num(t.value)}</span>
        ) : (
          <input
            aria-label={`${t.kpi_name} target`}
            className="w-24 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary text-right"
            inputMode="decimal"
            placeholder="target"
            value={v}
            onChange={(e) => setV(e.target.value)}
            onBlur={() => asNumber(v) !== t.value && onEdit([{ op: 'set_target', key: t.key, value: asNumber(v) }])}
          />
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {basis}
        {t.missed_twice?.length ? <NeedsYou>missed twice running</NeedsYou> : null}
        {!disabled && t.value == null ? (
          <label className="flex items-center gap-1 paragraph-xs text-tertiary">
            <input
              type="checkbox"
              checked={!!t.no_target}
              onChange={(e) => onEdit([{ op: 'set_target', key: t.key, value: null, no_target: e.target.checked }])}
            />
            no target
          </label>
        ) : null}
      </div>
      {t.reason || t.account_reference || needsSource ? (
        // The reason opens on click (it was a paragraph under every target).
        <details className="mt-0.5 paragraph-xs text-tertiary">
          <summary className="cursor-pointer">Why</summary>
          {t.reason ? <p className="mt-0.5">{t.reason}</p> : null}
          {t.account_reference ? <p>For reference: {t.account_reference}</p> : null}
          {needsSource ? <p>Tracked once its source (a HubSpot or Brevo list) is set, after approval.</p> : null}
        </details>
      ) : null}
    </div>
  )
}

function Job({
  a,
  index,
  disabled,
  onEdit,
  wordsRunning,
  onRewrite,
}: {
  a: PlanAsset
  index: number
  disabled: boolean
  onEdit: Props['onEdit']
  wordsRunning: boolean
  onRewrite: (jobIds: string[]) => Promise<unknown>
}) {
  const [credits, setCredits] = useField(a.credits == null ? '' : String(a.credits))
  const noRate = a.credits == null
  return (
    <article className={`rounded-lg bg-primary p-3 flex flex-col gap-2 ${noRate ? 'border-2 border-utility-warning-300' : 'border border-secondary'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="subheading-sm text-primary break-words">{a.name}</p>
          <p className="paragraph-xs text-tertiary">
            {channelLabel(a.channel)}
            {a.format ? ` · ${a.format}` : ''}
          </p>
        </div>
        {disabled ? null : (
          <button
            type="button"
            className="paragraph-xs text-tertiary hover:text-primary shrink-0"
            onClick={() => onEdit([{ op: 'remove_asset', index }])}
          >
            Remove
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 paragraph-xs text-secondary">
        <span>
          {a.ledger_type ?? 'No type'}
          {a.ledger_tier ? ` · ${a.ledger_tier}` : ''}
        </span>
        {noRate ? <NeedsYou>no rate yet: set credits</NeedsYou> : a.credits_source === 'pm' ? <Chip tone="pm">credits set by you</Chip> : null}
        {disabled ? (
          <span>{a.credits == null ? '—' : `${num(a.credits)} credits`}</span>
        ) : (
          <label className="flex items-center gap-1">
            <input
              aria-label={`${a.name} credits`}
              className={`w-16 rounded-md bg-primary px-2 py-1 text-right paragraph-sm text-primary ${noRate ? 'border-2 border-utility-warning-300' : 'border border-secondary'}`}
              inputMode="decimal"
              placeholder="?"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              onBlur={() => asNumber(credits) !== a.credits && onEdit([{ op: 'update_asset', index, fields: { credits: asNumber(credits) } }])}
            />
            credits
          </label>
        )}
      </div>
      <p className="paragraph-xs text-tertiary">
        Due to the studio {day(a.due_date)} · goes live {day(a.launch_date)}
      </p>
      {a.audience && (a.audience.locations?.length || a.audience.interests_or_keywords?.length || a.audience.custom_audiences?.length) ? (
        <details className="paragraph-xs text-secondary">
          <summary className="cursor-pointer text-tertiary">Audience</summary>
          {[
            a.audience.locations?.join(', '),
            a.audience.age_range,
            a.audience.interests_or_keywords?.join(', '),
            a.audience.custom_audiences?.length ? `custom: ${a.audience.custom_audiences.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </details>
      ) : null}
      {a.final_words ? (
        <JobWords
          fw={a.final_words}
          index={index}
          jobId={a.job_id}
          disabled={disabled}
          running={wordsRunning}
          onEdit={onEdit}
          onRewrite={onRewrite}
        />
      ) : null}
      {a.creative_brief ? <DesignerBrief cb={a.creative_brief} why={a.why} /> : null}
    </article>
  )
}

/** Captions arrive as a list of {platform, text} (the planner layout) or a {platform: text} map. */
function captions(cb: CreativeBrief): [string, string][] {
  const c = cb.captions
  if (!c) return []
  if (Array.isArray(c)) return c.map((x) => [String(x.platform ?? ''), String(x.text ?? '')] as [string, string])
  return Object.entries(c).map(([p, t]) => [p, String(t)] as [string, string])
}

function DesignerBrief({ cb, why }: { cb: CreativeBrief; why?: string }) {
  const list = (v: unknown) => (Array.isArray(v) ? (v as string[]) : v ? [String(v)] : [])
  return (
    <details>
      <summary className="cursor-pointer paragraph-xs text-secondary">Designer brief</summary>
      <div className="mt-2 flex flex-col gap-2 paragraph-xs text-secondary">
        {cb.objective ? <p><b className="text-primary">Objective.</b> {cb.objective}</p> : null}
        {cb.idea ? <p><b className="text-primary">Idea.</b> {cb.idea}</p> : null}
        {cb.artDirection ? <p><b className="text-primary">Look and feel.</b> {cb.artDirection}</p> : null}
        {cb.getRight?.lookHere?.length ? (
          <div>
            <b className="text-primary">Get these right</b>
            <ul className="list-disc pl-4">{cb.getRight.lookHere.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ) : null}
        {cb.getRight?.holdBack?.length ? (
          <div>
            <b className="text-primary">Hold back</b>
            <ul className="list-disc pl-4">{cb.getRight.holdBack.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ) : null}
        {cb.slides?.length ? (
          <div>
            <b className="text-primary">Frame by frame</b>
            <ol className="list-decimal pl-4">
              {cb.slides.map((s, i) => (
                <li key={i}>
                  {s.description}
                  {s.wordsOnAsset ? <span className="block text-primary">Words on it: “{s.wordsOnAsset}”</span> : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {captions(cb).length ? (
          <div>
            <b className="text-primary">Captions</b>
            {captions(cb).map(([p, t], i) => (
              <p key={i}><span className="text-tertiary">{p}:</span> {t}</p>
            ))}
          </div>
        ) : null}
        {typeof cb.copy === 'string' && cb.copy ? <p><b className="text-primary">Copy.</b> {cb.copy}</p> : null}
        {list(cb.requirements).length ? <p><b className="text-primary">Requirements.</b> {list(cb.requirements).join(' · ')}</p> : null}
        {cb.sizes?.length ? <p><b className="text-primary">Sizes.</b> {cb.sizes.join(' · ')}</p> : null}
        {why ? <p className="text-tertiary">Why this job: {why}</p> : null}
      </div>
    </details>
  )
}

function Checks({ plan }: { plan: Plan }) {
  const bad = plan.checks.filter((c) => !c.ok)
  return (
    <details className="rounded-xl border border-secondary bg-primary p-4">
      <summary className="cursor-pointer subheading-sm text-primary">
        Mia's checks · {plan.checks.length - bad.length} of {plan.checks.length} pass
      </summary>
      <ul className="mt-2 flex flex-col gap-1 paragraph-sm">
        {plan.checks.map((c) => (
          <li key={c.check} className={c.ok ? 'text-secondary' : 'text-utility-warning-700'}>
            {c.ok ? '✓' : '⚠'} {c.check}: <span className="text-tertiary">{c.detail}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}

const PART_LABELS: Record<string, string> = {
  grounded: 'Numbers come from the data',
  learns: 'Learns from the best campaigns',
  builds_on_best: 'Builds on the best ads',
  targets: 'Targets vs best results so far',
  ready: 'Ready to make',
}

// Mia's own review of the plan (plan §4.3): every number checked against the client file, and the
// plan scored against the client's best past campaigns. What the PM reads first, so they don't have
// to fact-check the whole plan.
function SelfCheck({ review }: { review: PlanReview }) {
  if (review.error || !review.scorecard) {
    return <Card className="paragraph-sm text-tertiary">Mia's self-check couldn't run on this plan.</Card>
  }
  const sc = review.scorecard
  const fc = review.fact_check
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="subheading-md text-primary">Mia's self-check</h2>
        {sc.thin_history ? (
          <Chip>Not graded: no past results on these KPIs to compare with</Chip>
        ) : (
          <span className="rounded-full bg-brand-solid px-3 py-0.5 subheading-sm text-primary-onbrand">
            {sc.grade} · {sc.overall}
          </span>
        )}
        {sc.best_past.length ? (
          <span className="paragraph-xs text-tertiary">
            Judged against {sc.best_past.map((b) => `${b.campaign} (${b.kpis_hit} of ${b.kpis} targets hit)`).join(', ')}
          </span>
        ) : null}
      </div>
      <ul className="mt-3 grid gap-2 @xl:grid-cols-2">
        {Object.entries(sc.parts).filter(([, p]) => !p.model_judgement).map(([k, p]) => (
          <li key={k} className="min-w-0">
            <div className="flex items-center justify-between gap-2 paragraph-sm">
              <span className="text-primary">{PART_LABELS[k] ?? k}</span>
              <span className="tabular-nums text-secondary">{p.score == null ? 'n/a' : p.score}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-tertiary overflow-hidden" aria-hidden="true">
              <div
                className={p.score != null && p.score < 60 ? 'h-full bg-utility-warning-600' : 'h-full bg-brand-solid'}
                style={{ width: `${p.score ?? 0}%` }}
              />
            </div>
            {p.why ? <p className="paragraph-xs text-tertiary mt-1">{p.why}</p> : null}
          </li>
        ))}
      </ul>
      {Object.entries(sc.parts).some(([, p]) => p.model_judgement) ? (
        <div className="mt-3">
          <p className="label-xs text-secondary">Mia's judgement (not in the grade: read the reasons)</p>
          <ul className="mt-1 flex flex-col gap-1 paragraph-xs text-secondary">
            {Object.entries(sc.parts)
              .filter(([, p]) => p.model_judgement)
              .map(([k, p]) => (
                <li key={k}>
                  <span className="text-primary">{PART_LABELS[k] ?? k}:</span> {p.why}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
      {sc.look_at.length ? (
        <div className="mt-3 rounded-lg border border-utility-warning-300 bg-utility-warning-100 px-3 py-2 text-utility-warning-700">
          <p className="label-sm">Worth a look</p>
          <ol className="mt-1 list-decimal pl-5 paragraph-sm flex flex-col gap-1">
            {sc.look_at.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {fc && fc.unsupported.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer paragraph-xs text-tertiary">
            {fc.unsupported.length} line(s) with numbers that aren't in the client file
          </summary>
          <ul className="mt-1 paragraph-xs text-secondary flex flex-col gap-0.5">
            {fc.unsupported.map((u) => (
              <li key={u.where + u.numbers.join()}>
                {u.where}: {u.numbers.join(', ')}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  )
}
