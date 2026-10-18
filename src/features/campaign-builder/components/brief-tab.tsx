import { ClientRules } from './client-rules'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../components/button'
import type { Brief, BriefField, BuildState, KpiGroup } from '../types'
import { kpiValue } from './kpi-picker'
import { Card, Chip, NeedsYou, RunFailed, RunProgress, channelLabel, day, money } from './parts'

// Brief tab (plan §8.2): what the PM asked for, as fields they can check and edit. Fields the
// PM set are marked as theirs; Mia never re-decides them. "What Mia read" starts collapsed.

interface Props {
  state: BuildState
  kpiGroups: KpiGroup[]
  busy: string | null
  onSave: (fields: Partial<Record<BriefField, unknown>>, name?: string) => Promise<unknown>
  onRedraft: (answers: string[]) => Promise<unknown>
  onMakePlan: () => Promise<unknown>
}

const LIST_FIELDS: BriefField[] = ['channels_requested', 'must_haves', 'constraints']
const LABELS: Record<BriefField, string> = {
  goal: 'Goal',
  audience: 'Audience',
  start_date: 'Starts',
  end_date: 'Ends',
  budget_total: 'Budget',
  channels_requested: 'Channels you asked for',
  must_haves: 'Must haves',
  constraints: "Don'ts and limits",
}

type Draft = Record<BriefField, string>

const toDraft = (b: Brief, name: string): Draft & { name: string } => ({
  name,
  goal: b.goal ?? '',
  audience: b.audience ?? '',
  start_date: b.start_date ?? '',
  end_date: b.end_date ?? '',
  budget_total: b.budget_total == null ? '' : String(b.budget_total),
  channels_requested: (b.channels_requested ?? []).join('\n'),
  must_haves: (b.must_haves ?? []).join('\n'),
  constraints: (b.constraints ?? []).join('\n'),
})

const fromDraft = (k: BriefField, v: string): unknown => {
  if (LIST_FIELDS.includes(k)) return v.split('\n').map((s) => s.trim()).filter(Boolean)
  if (k === 'budget_total') return v.trim() === '' ? null : Number(v.replace(/[^\d.]/g, ''))
  return v.trim() === '' ? null : v.trim()
}

export function BriefTab({ state, kpiGroups, busy, onSave, onRedraft, onMakePlan }: Props) {
  const run = state.brief_run
  const b = state.brief?.brief
  const planRunning = state.plan_run?.status === 'running'

  if (!state.brief) {
    if (run?.status === 'running') return <RunProgress run={run} what="brief" />
    if (run?.status === 'failed') return <RunFailed run={run} what="brief" busy={!!busy} onRetry={() => onRedraft([])} />
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      {run?.status === 'running' ? <RunProgress run={run} what="brief" /> : null}
      {run?.status === 'failed' ? (
        <RunFailed run={run} what="brief" busy={!!busy} onRetry={() => onRedraft([])} />
      ) : null}
      <BriefCard state={state} brief={b!} busy={busy} onSave={onSave} />
      <WhereTheyStand client={state.campaign.client} groups={kpiGroups} />
      <PmWords brief={b!} />
      <ClientRules client={state.campaign.client} readOnly={!state.campaign.building} />
      <Questions brief={b!} busy={busy} running={run?.status === 'running'} onRedraft={onRedraft} />
      <WhatMiaRead state={state} />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="paragraph-sm text-secondary">
          {state.plan
            ? state.plan_from_older_brief
              ? 'The brief changed since the plan was made. Make it again to use the new brief.'
              : 'The plan was made from this brief.'
            : 'When the brief looks right, Mia makes the plan: concept, phases, targets, budget split and the jobs for the studio.'}
        </p>
        <Button
          variant="primary"
          loading={busy === 'plan'}
          disabled={planRunning || run?.status === 'running' || !state.campaign.building}
          onClick={() => onMakePlan()}
        >
          {planRunning ? 'Making the plan…' : state.plan ? 'Make the plan again' : 'Make the plan'}
        </Button>
      </Card>
    </div>
  )
}

function BriefCard({
  state,
  brief,
  busy,
  onSave,
}: {
  state: BuildState
  brief: Brief
  busy: string | null
  onSave: Props['onSave']
}) {
  const [editing, setEditing] = useState(false)
  const initial = useMemo(() => toDraft(brief, state.campaign.name), [brief, state.campaign.name])
  const [draft, setDraft] = useState(initial)
  useEffect(() => {
    if (!editing) setDraft(initial)
  }, [initial, editing])
  const setByPm = new Set(brief.set_by_pm ?? [])
  const locked = !state.campaign.building

  const save = async () => {
    const changed: Partial<Record<BriefField, unknown>> = {}
    ;(Object.keys(LABELS) as BriefField[]).forEach((k) => {
      if (draft[k] !== initial[k]) changed[k] = fromDraft(k, draft[k])
    })
    const name = draft.name !== initial.name ? draft.name : undefined
    if (Object.keys(changed).length || name) {
      // A failed save keeps the form open with what the PM typed (the error shows above).
      if ((await onSave(changed, name)) === undefined) return
    }
    setEditing(false)
  }

  const show = (k: BriefField) => {
    const v = brief[k as keyof Brief]
    if (k === 'budget_total') return money(brief.budget_total ?? null, state.campaign.currency)
    if (k === 'start_date' || k === 'end_date') return day(v as string | null)
    if (k === 'channels_requested') return brief.channels_requested?.length ? brief.channels_requested.map(channelLabel).join(' · ') : '—'
    if (Array.isArray(v)) return v.length ? v.join(' · ') : '—'
    return (v as string) || '—'
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="subheading-md text-primary">The brief</h2>
        <div className="flex items-center gap-2">
          <span className="paragraph-xs text-tertiary">
            Version {state.brief?.version} · {state.brief?.made_by === 'pm' ? 'edited by you' : 'drafted by Mia'}
          </span>
          {locked ? null : editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" loading={busy === 'brief'} onClick={save}>
                Save
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>
      {editing ? (
        <form
          className="mt-3 grid gap-3 @xl:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="label-xs text-secondary">Campaign name</span>
            <input
              id="brief-name"
              className="rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          {(Object.keys(LABELS) as BriefField[]).map((k) => (
            <label key={k} className={`flex flex-col gap-1 ${['goal', 'audience', ...LIST_FIELDS].includes(k) ? 'sm:col-span-2' : ''}`}>
              <span className="label-xs text-secondary">
                {LABELS[k]}
                {LIST_FIELDS.includes(k) ? ' (one per line)' : ''}
              </span>
              {['goal', 'audience', ...LIST_FIELDS].includes(k) ? (
                <textarea
                  id={`brief-${k}`}
                  rows={k === 'goal' || k === 'audience' ? 2 : 3}
                  className="rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
                  value={draft[k]}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                />
              ) : (
                <input
                  id={`brief-${k}`}
                  type={k.endsWith('_date') ? 'date' : 'text'}
                  inputMode={k === 'budget_total' ? 'numeric' : undefined}
                  className="rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
                  value={draft[k]}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                />
              )}
            </label>
          ))}
        </form>
      ) : (
        <dl className="mt-3 grid gap-x-6 gap-y-3 @xl:grid-cols-2">
          {(Object.keys(LABELS) as BriefField[]).map((k) => (
            <div key={k} className={`min-w-0 ${['goal', 'audience', ...LIST_FIELDS].includes(k) ? 'sm:col-span-2' : ''}`}>
              <dt className="label-xs text-tertiary flex flex-wrap items-center gap-2">
                {LABELS[k]}
                {setByPm.has(k) ? <Chip tone="pm">set by you</Chip> : null}
                {(k === 'start_date' || k === 'end_date') && brief.dates_proposed_by_mia ? (
                  <NeedsYou>proposed by Mia: you gave no dates</NeedsYou>
                ) : null}
                {k === 'budget_total' && brief.budget_total == null ? <NeedsYou>no budget yet</NeedsYou> : null}
              </dt>
              <dd className="paragraph-sm text-primary mt-0.5 break-words">{show(k)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  )
}

function PmWords({ brief }: { brief: Brief }) {
  if (!brief.pm_words?.length) return null
  return (
    <Card>
      <h2 className="subheading-md text-primary">Your words, kept exactly</h2>
      <p className="paragraph-xs text-tertiary mt-1">Mia follows these as written and never changes them.</p>
      <ul className="mt-2 flex flex-col gap-2">
        {brief.pm_words.map((w, i) => (
          <li key={i} className="paragraph-sm text-primary">
            <span className="text-secondary">“{w.text}”</span> <Chip>{w.sets}</Chip>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Questions({
  brief,
  busy,
  running,
  onRedraft,
}: {
  brief: Brief
  busy: string | null
  running: boolean
  onRedraft: Props['onRedraft']
}) {
  const qs = (brief.open_questions ?? []).slice(0, 3)
  const [answers, setAnswers] = useState<string[]>(() => qs.map(() => ''))
  // New questions (a redraft asks different ones) clear the boxes: answers stayed under the wrong question (16 Oct).
  const asked = qs.map((q) => q.question).join('|')
  useEffect(() => setAnswers(qs.map(() => '')), [asked]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!qs.length) return null
  const filled = answers.some((a) => a.trim())
  return (
    <Card>
      <h2 className="subheading-md text-primary">Mia's questions</h2>
      <p className="paragraph-xs text-tertiary mt-1">Only what would change the plan. Answer any you can, or skip them.</p>
      <ol className="mt-3 flex flex-col gap-3">
        {qs.map((q, i) => (
          <li key={i} className="flex flex-col gap-1">
            <label htmlFor={`q-${i}`} className="paragraph-sm text-primary">
              {q.question}
              <span className="block paragraph-xs text-tertiary">{q.why_it_matters}</span>
            </label>
            <input
              id={`q-${i}`}
              className="rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
              value={answers[i] ?? ''}
              onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))}
            />
          </li>
        ))}
      </ol>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          disabled={!filled || running}
          loading={busy === 'redraft'}
          onClick={() => onRedraft(qs.map((q, i) => (answers[i]?.trim() ? `${q.question} ${answers[i].trim()}` : '')).filter(Boolean))}
        >
          Update the brief with my answers
        </Button>
      </div>
    </Card>
  )
}

const LAYER_NAMES: Record<string, string> = {
  who: 'Who they are',
  now: 'This campaign',
  before: 'Past campaigns',
  working: "What's working now",
  experts: 'Reports and findings',
  told: 'What people told Mia',
  make: 'Studio and credits',
}

function WhatMiaRead({ state }: { state: BuildState }) {
  const read = state.what_mia_read
  if (!read) return null
  const facts = Array.isArray(read.headline) ? (read.headline as string[]) : []
  const layers = Object.entries(read.layers ?? {})
  const caveats = layers.reduce((n, [, l]) => n + (l.caveats?.length ?? 0), 0)
  return (
    <details className="rounded-xl border border-secondary bg-primary p-4">
      <summary className="cursor-pointer subheading-sm text-primary">
        What Mia read · {facts.length} facts · {caveats} caveats
      </summary>
      {facts.length ? (
        <ul className="mt-3 list-disc pl-5 paragraph-sm text-primary flex flex-col gap-1">
          {facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 grid gap-3 @xl:grid-cols-2">
        {layers.map(([name, l]) => (
          <div key={name} className="min-w-0 rounded-lg bg-secondary p-3">
            <p className="label-xs text-secondary">{LAYER_NAMES[name] ?? name}</p>
            <ul className="mt-1 paragraph-xs text-tertiary flex flex-col gap-0.5">
              {l.sources.map((s) => (
                <li key={s.source}>
                  {s.source}
                  {s.as_of ? ` · ${day(String(s.as_of))}` : ''}
                </li>
              ))}
            </ul>
            {l.caveats.length ? (
              <ul className="mt-2 paragraph-xs text-utility-warning-700 flex flex-col gap-0.5">
                {l.caveats.map((c) => (
                  <li key={c}>⚠ {c}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  )
}

// Where the client stands on mia-cube's KPI list before the plan is made: the last campaign
// result for each KPI (and its target then), else the account's own last-90-days figure.
function WhereTheyStand({ client, groups }: { client: string; groups: KpiGroup[] }) {
  const rows = groups
    .map((g) => ({ ...g, kpis: g.kpis.filter((k) => k.last_result || k.account_90d != null) }))
    .filter((g) => g.kpis.length)
  if (!rows.length) return null
  return (
    <details className="rounded-xl border border-secondary bg-primary p-4" open>
      <summary className="cursor-pointer subheading-sm text-primary">Where {client} stands on the KPI list</summary>
      <p className="paragraph-xs text-tertiary mt-1">
        The last campaign result for each KPI, or the account's last 90 days. Targets in the plan start from these.
      </p>
      <div className="mt-3 grid gap-3 @xl:grid-cols-2">
        {rows.map((g) => (
          <div key={g.family} className="min-w-0">
            <p className="label-xs text-secondary">{g.label}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {g.kpis.map((k) => (
                <li key={k.kpi_key} className="flex flex-wrap justify-between gap-x-3 paragraph-sm">
                  <span className="text-primary">{k.name}</span>
                  <span className="text-secondary tabular-nums">
                    {k.last_result
                      ? `${kpiValue(k.last_result.value, k.unit)}${k.last_result.target != null ? ` (target ${kpiValue(k.last_result.target, k.unit)})` : ''}`
                      : `${kpiValue(k.account_90d, k.unit)} · 90 days`}
                  </span>
                  {k.last_result ? <span className="w-full paragraph-xs text-tertiary">{k.last_result.campaign}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  )
}
