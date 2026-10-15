import { useEffect, useState } from 'react'
import { KpiPicker } from './kpi-picker'
import { Button } from '../../../components/button'
import type { BuildState, CreativeBrief, KpiGroup, KpiTarget, Plan, PlanAsset, PlanOp, PlanReview } from '../types'
import { Card, Chip, NeedsYou, NeedsYouBanner, RunFailed, RunProgress, channelLabel, day, money, num } from './parts'

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
}

export function PlanTab({ state, kpiGroups, busy, onEdit, onMakePlan, onApprove }: Props) {
  const [picking, setPicking] = useState<string | null>(null) // the phase whose KPI picker is open
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
  const split = plan.decisions.budget_split?.value ?? {}
  return (
    <div className="flex flex-col gap-4">
      {run?.status === 'failed' ? (
        <RunFailed run={run} what="plan" busy={!!busy} onRetry={() => onMakePlan()} />
      ) : null}
      {locked ? (
        <Card className="paragraph-sm text-primary">
          Approved{state.approved?.at ? ` ${day(state.approved.at)}` : ''}
          {state.approved?.by ? ` by ${state.approved.by}` : ''}. It's saved as a draft campaign: it goes live when you
          launch it, so nothing is tracked or counted before then. Sending the jobs to the studio in Flex comes next.
        </Card>
      ) : (
        <>
          <NeedsYouBanner title="Before you approve" items={state.blockers.map((b) => b.what)} />
          {state.blockers.some((b) => b.what.includes('which has passed')) ? (
            <Card warn className="flex flex-wrap items-center justify-between gap-3">
              <p className="paragraph-sm text-primary">
                Some due dates passed since Mia made the plan. Move every job a week later in one go, or change them one by one.
              </p>
              <Button size="sm" loading={busy === 'edit'} onClick={() => onEdit([{ op: 'shift_dates', days: 7 }])}>
                Move all job dates a week later
              </Button>
            </Card>
          ) : null}
        </>
      )}
      {state.plan_from_older_brief && !locked ? (
        <Card warn className="paragraph-sm text-primary">
          The brief changed after this plan was made. Make the plan again from the Brief tab to use it.
        </Card>
      ) : null}

      {plan.review ? <SelfCheck review={plan.review} /> : null}
      <Concept plan={plan} />
      <Credits plan={plan} />
      {locked ? null : <AskPm plan={plan} />}

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {plan.phases.map((p) => (
          <section key={p.phase} className="min-w-0 rounded-xl border border-secondary bg-secondary p-3 flex flex-col gap-3">
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
              {p.objective ? <p className="paragraph-xs text-secondary">{p.objective}</p> : null}
              <p className="paragraph-xs text-tertiary">{p.channels.map(channelLabel).join(' · ')}</p>
            </header>
            <div className="flex flex-col gap-2">
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
            <div className="flex flex-col gap-2">
              {plan.assets.map((a, i) =>
                a.phase === p.phase ? <Job key={`${i}-${a.name}`} a={a} index={i} disabled={locked} onEdit={onEdit} /> : null,
              )}
            </div>
          </section>
        ))}
      </div>

      <Checks plan={plan} />

      {locked ? null : (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="paragraph-sm text-secondary">
            {state.blockers.length
              ? `Approve is locked: ${state.blockers.length} thing${state.blockers.length === 1 ? '' : 's'} above still need you.`
              : 'Approving saves this plan to the campaign. The jobs are sent to the studio in the next step.'}
          </p>
          <Button variant="primary" disabled={!!state.blockers.length} loading={busy === 'approve'} onClick={() => onApprove()}>
            Approve the plan
          </Button>
        </Card>
      )}
    </div>
  )
}

function Concept({ plan }: { plan: Plan }) {
  const c = plan.concept
  return (
    <Card>
      <p className="label-xs text-tertiary">The idea</p>
      <h2 className="subheading-md text-primary mt-1">{c.name}</h2>
      {c.big_idea ? <p className="paragraph-sm text-primary mt-2">{c.big_idea}</p> : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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

function Credits({ plan }: { plan: Plan }) {
  const c = plan.credits
  const text =
    c.status === 'fits'
      ? 'Fits the sprints Flex knows.'
      : c.status === 'over'
        ? `Over in ${c.over?.join(', ')}.`
        : c.reason ?? 'Some jobs fall in sprints whose credits Flex doesn’t know yet.'
  return (
    <Card warn={c.status === 'over'} className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <p className="subheading-sm text-primary">{num(c.total_planned ?? 0)} credits</p>
      <p className="paragraph-sm text-secondary">{text}</p>
      {c.sprints?.length ? (
        <p className="paragraph-xs text-tertiary">
          {c.sprints.map((s) => `${s.label}: ${num(s.planned)}${s.free == null ? ' (room unknown)' : ` of ${num(s.free)} free`}`).join(' · ')}
        </p>
      ) : null}
    </Card>
  )
}

function AskPm({ plan }: { plan: Plan }) {
  const qs = (plan.decisions.ask_pm ?? []).map((q) => (typeof q === 'string' ? { question: q } : q))
  if (!qs.length) return null
  const top = qs.slice(0, 3)
  return (
    <Card>
      <h2 className="subheading-md text-primary">Worth deciding before you approve</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {top.map((q, i) => (
          <li key={i} className="paragraph-sm text-primary">
            {'about' in q && q.about ? <span className="label-xs text-secondary block">{String(q.about)}</span> : null}
            {q.question}
          </li>
        ))}
      </ul>
      {qs.length > 3 ? (
        <details className="mt-2">
          <summary className="cursor-pointer paragraph-xs text-tertiary">{qs.length - 3} more</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {qs.slice(3).map((q, i) => (
              <li key={i} className="paragraph-sm text-secondary">
                {q.question}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
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
    ) : (
      <NeedsYou>no basis: you set it</NeedsYou>
    )
  return (
    <div className={`rounded-lg bg-primary p-2 ${missing ? 'border-2 border-utility-warning-300' : 'border border-secondary'}`}>
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
      {t.reason ? <p className="paragraph-xs text-tertiary mt-1">{t.reason}</p> : null}
      {t.account_reference ? <p className="paragraph-xs text-tertiary">For reference: {t.account_reference}</p> : null}
      {needsSource ? (
        <p className="paragraph-xs text-tertiary">Tracked once its source (a HubSpot or Brevo list) is set, after approval.</p>
      ) : null}
    </div>
  )
}

function Job({ a, index, disabled, onEdit }: { a: PlanAsset; index: number; disabled: boolean; onEdit: Props['onEdit'] }) {
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
        <p className="paragraph-xs text-secondary">
          <span className="text-tertiary">Audience: </span>
          {[
            a.audience.locations?.join(', '),
            a.audience.age_range,
            a.audience.interests_or_keywords?.join(', '),
            a.audience.custom_audiences?.length ? `custom: ${a.audience.custom_audiences.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
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
          <Chip>Not graded: too little history to judge against</Chip>
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
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.entries(sc.parts).map(([k, p]) => (
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
