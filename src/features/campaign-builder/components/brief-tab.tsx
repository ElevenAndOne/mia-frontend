import { AddBrandGuide, CampaignGuide } from './campaign-guide'
import { ClientRules } from './client-rules'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../components/button'
import type { Brief, BriefField, BuildState, KpiGroup } from '../types'
import { kpiValue } from './kpi-picker'
import { Card, Chip, Linked, NeedsYou, RunFailed, RunProgress, channelLabel, day, money } from './parts'
import { AskMia, askMia, Fold, PrimaryAction, YourTurn, type TurnItem } from './your-turn'
import { RulesLine } from './rules-line'

// Brief tab (plan §8.2): what the PM asked for, as fields they can check and edit. Fields the
// PM set are marked as theirs; Mia never re-decides them. "What Mia read" starts collapsed.

interface Props {
  state: BuildState
  kpiGroups: KpiGroup[]
  busy: string | null
  onSave: (
    fields: Partial<Record<BriefField, unknown>>,
    name?: string,
    answered?: { id: string; answer: string | null }[],
  ) => Promise<unknown>
  onRedraft: (answers: string[]) => Promise<unknown>
  onMakePlan: () => Promise<unknown>
  // The step-by-step page: "facts" is the brief to check, its questions and Make the plan (Start folded in, L1);
  // "context" is what you gave Mia, what she read, your words and the client rules, folded, on Check & approve (L2, L4).
  part?: 'facts' | 'context'
  onSkipQuestion?: (id: string) => Promise<unknown>
  onKeepPlan?: () => Promise<unknown>
  onConfirm?: (fields: string[]) => Promise<unknown>
}

// BPO clients have no ad budget of ours and no KPIs: their Key facts don't show those fields (20 Nov)
const NOT_FOR_BPO: BriefField[] = ['budget_total', 'budget_monthly', 'measurement']
// Shown even when empty: the facts every plan stands on. Any other empty field is one "Not set" line.
const ALWAYS: BriefField[] = ['goal', 'start_date', 'end_date', 'budget_total', 'channels_requested']
const EDIT_EVENT = 'brief-edit'

const LIST_FIELDS: BriefField[] = ['channels_requested', 'must_haves', 'constraints', 'already_made', 'measurement']
const LABELS: Record<BriefField, string> = {
  goal: 'Goal',
  audience: 'Audience',
  start_date: 'Starts',
  end_date: 'Ends',
  budget_total: 'Budget',
  budget_monthly: 'Budget a month',
  channels_requested: 'Channels', // the PM's own channels; "you asked for" made the tile's label wrap (24 Nov)
  must_haves: 'Must haves',
  constraints: "Don'ts and limits",
  offer: 'Offer',
  landing_page: 'Landing page',
  already_made: 'Work already made', // "already made (not made again)" read oddly in "Not set: …" (screen walk 23 Nov)
  measurement: "How it's measured",
}

type Draft = Record<BriefField, string>

const toDraft = (b: Brief, name: string): Draft & { name: string } => ({
  name,
  goal: b.goal ?? '',
  audience: b.audience ?? '',
  start_date: b.start_date ?? '',
  end_date: b.end_date ?? '',
  budget_total: b.budget_total == null ? '' : String(b.budget_total),
  budget_monthly: b.budget_monthly == null ? '' : String(b.budget_monthly),
  channels_requested: (b.channels_requested ?? []).join('\n'),
  must_haves: (b.must_haves ?? []).join('\n'),
  constraints: (b.constraints ?? []).join('\n'),
  offer: b.offer ?? '',
  landing_page: b.landing_page ?? '',
  already_made: (b.already_made ?? []).join('\n'),
  measurement: (b.measurement ?? []).join('\n'),
})

// "the audience and the landing page": the facts Mia filled in, by name (test 24 Nov)
const listFields = (ks: BriefField[]) => {
  const names = ks.map((k) => `the ${LABELS[k].toLowerCase()}`)
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

const fromDraft = (k: BriefField, v: string): unknown => {
  if (LIST_FIELDS.includes(k)) return v.split('\n').map((s) => s.trim()).filter(Boolean)
  // Sent as typed: the server reads "R60k", "60 000" and "1.2m", and refuses what it can't read (live test 20 Oct:
  // "R60k" saved as R60 when this stripped every letter).
  if (k === 'budget_total' || k === 'budget_monthly') return v.trim() === '' ? null : v.trim()
  return v.trim() === '' ? null : v.trim()
}

export { WhereTheyStand }

export function BriefTab({ state, kpiGroups, busy, onSave, onRedraft, onMakePlan, part, onSkipQuestion, onKeepPlan, onConfirm }: Props) {
  const run = state.brief_run
  const b = state.brief?.brief
  const planRunning = state.plan_run?.status === 'running'
  // Detail sections: closed until wanted (each step opens with only Your turn, L8). Key facts has none; the context of
  // the brief sits folded on Check & approve.
  const [folds, setFolds] = useState<Set<string>>(() => new Set())
  const skipKey = `mia-builder-brand-skip-${state.campaign.campaign_id}`
  const [brandSkipped, setBrandSkipped] = useState(() => {
    try {
      return localStorage.getItem(skipKey) === '1'
    } catch {
      return false
    }
  })
  const skipBrand = () => {
    setBrandSkipped(true)
    try {
      localStorage.setItem(skipKey, '1')
    } catch {
      // private window: skipped for this visit only
    }
  }
  const shows = (f: string) => !part || (part === 'context' && ['read', 'words', 'rules'].includes(f))

  if (!state.brief) {
    if (run?.status === 'running') return <RunProgress run={run} what="brief" />
    if (run?.status === 'failed') return <RunFailed run={run} what="brief" busy={!!busy} onRetry={() => onRedraft([])} />
    return null
  }

  const qs = (b?.open_questions ?? []).slice(0, 3)
  const emptyRules = !(b?.must_haves?.length || b?.constraints?.length)
  const planFresh = !!state.plan && !state.plan_from_older_brief
  const toggle = (f: string) => setFolds((o) => { const n = new Set(o); if (n.has(f)) n.delete(f); else n.add(f); return n })
  const bpo = state.campaign.client_type === 'bpo'
  // Edit opens the brief card's form and brings it into view
  const editBrief = () => {
    window.dispatchEvent(new Event(EDIT_EVENT))
    document.getElementById('brief-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const items: TurnItem[] = []
  if (state.campaign.building) {
    if (qs.length) {
      items.push({
        key: 'questions',
        // one at a time with where you are, like Mia's questions after the plan (local test 27 Oct)
        title: `Mia's question ${(b?.answered_questions ?? []).length + 1} of ${(b?.answered_questions ?? []).length + qs.length}`,
        why: 'Skip it and Mia decides, and says what she assumed.',
        done: !qs.length,
        openByDefault: true,
        more: (
          <Questions
            brief={b!}
            busy={busy}
            running={run?.status === 'running'}
            // The answer fills the fields it settles (server); it doesn't go to the chat as the PM's message (local
            // test 2, 29 Oct: every answer showed in the chat with a long reply under it).
            onAnswer={(id, answer) => onSave({}, undefined, [{ id, answer }])}
            onSkip={(id) => (onSkipQuestion ? onSkipQuestion(id) : onSave({}, undefined, [{ id, answer: null }]))}
          />
        ),
      })
    }
    // "These are right" (review 21 Oct) sits on the brief card itself, under the facts it confirms (screen walk 23 Nov:
    // "Check the 4 facts" here and the same facts again in the card below)
    const drafted = (state.brief?.drafted ?? []) as BriefField[]
    const noBudget = state.blockers.find((x) => x.key === 'budget_total')
    if (noBudget) {
      items.push({
        key: 'budget',
        title: 'Set the budget',
        why: noBudget.what,
        actions: (
          <>
            <Button size="sm" onClick={editBrief}>
              Set it
            </Button>
            <AskMia label="Budget" detail={noBudget.what} />
          </>
        ),
      })
    }
    // Make the plan closes the step, once the questions are answered or skipped (L7).
    const waiting = qs.length > 0 && !state.plan
    items.push({
      key: 'plan',
      title: planRunning ? 'Mia is making the plan' : state.plan_from_older_brief ? 'Make the plan again' : state.plan ? 'Plan made' : 'Make the plan',
      done: planFresh && !planRunning,
      detail: planRunning
        ? 'Usually 10 to 20 minutes. You can leave; it keeps going.'
        : waiting
          ? 'After the questions above.'
          : state.plan_from_older_brief
            ? 'The brief changed since the plan.'
            : drafted.length && onConfirm && !state.plan
              ? 'Check the facts Mia read in the brief below first.'
              : undefined,
      why: planRunning || waiting
        ? undefined
        : state.plan_from_older_brief
          ? 'The budget, dates, channels or goal changed. Update the plan (everything you decided is kept where it still fits), or keep it and fix what no longer fits.'
          : bpo
            ? 'Mia makes the jobs for the studio from the brief and the document, and asks about anything the document leaves open.'
            : 'Mia makes the plan: the idea, phases, targets, budget split and the jobs for the studio.',
      actions: planRunning ? null : (
        <>
          <PrimaryAction loading={busy === 'plan'} disabled={run?.status === 'running' || waiting} onClick={() => onMakePlan()}>
            {state.plan ? 'Update the plan' : 'Make the plan'}
          </PrimaryAction>
          {state.plan_from_older_brief && onKeepPlan ? (
            <Button size="sm" loading={busy === 'keep'} onClick={() => onKeepPlan()}>
              Keep this plan
            </Button>
          ) : null}
        </>
      ),
    })
  }
  const read = state.what_mia_read
  const caveats = Object.values(read?.layers ?? {}).reduce((n, l) => n + (l.caveats?.length ?? 0), 0)
  const facts = Array.isArray(read?.headline) ? (read?.headline as string[]).length : 0

  return (
    <div className="flex flex-col gap-4">
      {run?.status === 'running' ? <RunProgress run={run} what="brief" /> : null}
      {run?.status === 'failed' ? (
        <RunFailed run={run} what="brief" busy={!!busy} onRetry={() => onRedraft([])} />
      ) : null}
      {part === 'context' ? (
        <Fold
          id="fold-gave"
          title="What you gave Mia"
          summary={b?.mode === 'brief_and_deck' ? 'your message, and a guide or deck read in full' : 'your message'}
          open={folds.has('gave')}
          onToggle={() => toggle('gave')}
        >
          <p className="paragraph-sm text-primary whitespace-pre-wrap [overflow-wrap:anywhere]">{state.brief?.pm_text || '—'}</p>
          <p className="paragraph-xs text-tertiary">
            Mia drafted the key facts from this and from what she knows about {state.campaign.client}.
          </p>
        </Fold>
      ) : null}
      {/* an empty "Nothing needs you here" box above a card that asks something read wrong (24 Nov) */}
      {part !== 'context' && items.some((i) => !i.done) ? <YourTurn items={items} /> : null}
      {part !== 'context' ? (
        <BriefCard state={state} brief={b!} busy={busy} onSave={onSave} bpo={bpo} drafted={(state.brief?.drafted ?? []) as BriefField[]}
          onConfirm={onConfirm} />
      ) : null}
      {part === 'facts' ? (
        // Reference and optional things: one quiet line each (20 Nov, docs2/BUILDER_HAND_HOLDING_CLEANUP_2026-11-20.md)
        <div className="flex flex-col gap-1.5 px-1">
          <RulesLine client={state.campaign.client} campaignId={state.campaign.campaign_id} readOnly={!state.campaign.building} />
          <CampaignGuide compact campaignId={state.campaign.campaign_id} readOnly={!state.campaign.building} brand={state.brand_guide ?? null} look={state.brand_look ?? null} never={state.brand_never_use ?? []} />
          {state.campaign.building && !state.plan && ((!state.brand_guide && !brandSkipped) || emptyRules) ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 paragraph-xs text-tertiary">
              <span>Optional:</span>
              {!state.brand_guide && !brandSkipped ? (
                <>
                  <AddBrandGuide campaignId={state.campaign.campaign_id} quiet />
                  <button type="button" onClick={skipBrand} className="underline hover:text-secondary">no guide</button>
                  {emptyRules ? <span aria-hidden="true">·</span> : null}
                </>
              ) : null}
              {emptyRules ? (
                <button type="button" onClick={editBrief} className="underline hover:text-secondary">
                  add must-haves and don'ts
                </button>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}
      {!part ? <CampaignGuide campaignId={state.campaign.campaign_id} readOnly={!state.campaign.building} brand={state.brand_guide ?? null} look={state.brand_look ?? null} never={state.brand_never_use ?? []} /> : null}
      {shows('stand') ? (<Fold
        id="fold-stand"
        title={`Where ${state.campaign.client} stands on the KPI list`}
        summary="last results and the last 90 days, where targets start from"
        open={folds.has('stand')}
        onToggle={() => toggle('stand')}
      >
        <WhereTheyStand groups={kpiGroups} currency={state.campaign.currency} />
      </Fold>) : null}
      {shows('words') && b?.pm_words?.length ? (
        <Fold
          id="fold-words"
          title="Your words, kept exactly"
          summary={`${b.pm_words.length} quote${b.pm_words.length === 1 ? '' : 's'} Mia never changes`}
          open={folds.has('words')}
          onToggle={() => toggle('words')}
        >
          <PmWords brief={b} />
        </Fold>
      ) : null}
      {shows('rules') ? (<Fold
        id="fold-rules"
        title={`Rules for ${state.campaign.client}`}
        summary="followed in every plan and every word, for every campaign of this client"
        open={folds.has('rules')}
        onToggle={() => toggle('rules')}
      >
        <ClientRules client={state.campaign.client} campaignId={state.campaign.campaign_id} readOnly={!state.campaign.building} />
      </Fold>) : null}
      {shows('read') && read ? (
        <Fold
          id="fold-read"
          title="What Mia read"
          summary={`${facts} facts · ${caveats} things to know`}
          open={folds.has('read')}
          onToggle={() => toggle('read')}
        >
          <WhatMiaRead state={state} />
        </Fold>
      ) : null}
    </div>
  )
}

function BriefCard({
  state,
  brief,
  busy,
  onSave,
  bpo = false,
  drafted = [],
  onConfirm,
}: {
  state: BuildState
  brief: Brief
  busy: string | null
  onSave: Props['onSave']
  bpo?: boolean
  drafted?: BriefField[]
  onConfirm?: Props['onConfirm']
}) {
  const [editing, setEditing] = useState(false)
  const initial = useMemo(() => toDraft(brief, state.campaign.name), [brief, state.campaign.name])
  const [draft, setDraft] = useState(initial)
  // What the form showed when Edit was pressed: Save sends only what the PM changed from that, so a change that landed
  // while the form was open (a chat card, an answer) is never put back (review 26 Oct)
  const [base, setBase] = useState(initial)
  useEffect(() => {
    if (!editing) setDraft(initial)
  }, [initial, editing])
  const startEditing = () => {
    setBase(initial)
    setDraft(initial)
    setEditing(true)
  }
  const locked = !state.campaign.building
  // "Edit" in Your turn or the optional line opens this form (one form, not a second one up there)
  useEffect(() => {
    if (locked) return
    const open = () => {
      setBase(initial)
      setDraft(initial)
      setEditing(true)
    }
    window.addEventListener(EDIT_EVENT, open)
    return () => window.removeEventListener(EDIT_EVENT, open)
  }, [initial, locked])
  const fields = (Object.keys(LABELS) as BriefField[]).filter((k) => !(bpo && NOT_FOR_BPO.includes(k)))
  const empty = (k: BriefField) => {
    const v = brief[k as keyof Brief]
    return v == null || v === '' || (Array.isArray(v) && !v.length)
  }
  const shown = fields.filter((k) => ALWAYS.includes(k) || !empty(k)).filter((k) => k !== 'budget_monthly' || brief.budget_monthly != null)
  const notSet = fields.filter((k) => !shown.includes(k) && k !== 'budget_monthly')
  const skipped = (brief.answered_questions ?? []).filter((q) => !q.answer)

  const save = async () => {
    const changed: Partial<Record<BriefField, unknown>> = {}
    ;(Object.keys(LABELS) as BriefField[]).forEach((k) => {
      if (draft[k] !== base[k]) changed[k] = fromDraft(k, draft[k])
    })
    const name = draft.name !== base.name ? draft.name : undefined
    if (Object.keys(changed).length || name) {
      // A failed save keeps the form open with what the PM typed (the error shows above).
      if ((await onSave(changed, name)) === undefined) return
      // With a plan made, Mia reads the change in context and proposes what it moves in the jobs and words, with
      // Apply (audit 22 Oct: a new don't or "already made" left the plan as it was). The numbers follow in code.
      const keys = Object.keys(changed) as BriefField[]
      if (state.plan && keys.length)
        askMia({
          label: 'Brief change',
          detail: keys.map((k) => LABELS[k]).join(', '),
          text: `I changed the brief: ${keys.map((k) => `${LABELS[k]} → ${draft[k] || '(empty)'}`).join('; ')}. What does this change in the plan, the jobs or the words?`,
        })
    }
    setEditing(false)
  }

  const show = (k: BriefField) => {
    const v = brief[k as keyof Brief]
    if (k === 'budget_total')
      // A monthly budget's total shows its working, so the number is never a mystery (live test 22 Oct).
      return money(brief.budget_total ?? null, state.campaign.currency) + (brief.budget_working ? ` · ${brief.budget_working}` : '')
    if (k === 'budget_monthly') return money(brief.budget_monthly ?? null, state.campaign.currency)
    if (k === 'start_date' || k === 'end_date') return day(v as string | null)
    if (k === 'channels_requested') return brief.channels_requested?.length ? brief.channels_requested.map(channelLabel).join(' · ') : '—'
    if (Array.isArray(v)) return v.length ? v.join(' · ') : '—'
    return (v as string) || '—'
  }

  return (
    <Card id="brief-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] leading-6 font-semibold tracking-[-0.01em] text-primary">The brief</h2>
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
            <Button size="sm" onClick={startEditing}>
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
          {fields.map((k) => (
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
                  placeholder={k === 'budget_total' ? 'e.g. 60000 or 60k' : k === 'budget_monthly' ? 'e.g. 5k' : k === 'landing_page' ? 'https://' : undefined}
                  className="rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
                  value={draft[k]}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                />
              )}
            </label>
          ))}
        </form>
      ) : (
        // Long fields across the card, the short ones (dates, budget, channels) four to a row (19 Oct). Each fact is one
        // line, the whole text on tap; empty ones are one "Not set" line (20 Nov: a wall of dashes and full sentences).
        <>
        {/* The goal as the card's headline, the rest as tiles on a soft panel (test 24 Nov: the card read as generic and
            bland). No "Mia read this" / "set by you" chips: the check below names what Mia filled in. */}
        {shown.includes('goal') ? (
          <div className="mt-3 rounded-lg bg-secondary px-4 py-3">
            <p className="label-xs uppercase tracking-[0.06em] text-tertiary">{LABELS.goal}</p>
            <p className="mt-1 label-bg text-primary [text-wrap:balance] [overflow-wrap:anywhere]">{show('goal')}</p>
          </div>
        ) : null}
        <dl className="mt-2 grid grid-cols-2 @3xl:grid-cols-4 gap-2">
          {shown.filter((k) => k !== 'goal').map((k) => (
            <div
              key={k}
              className={`min-w-0 rounded-lg bg-secondary px-3 py-2.5 ${
                k === 'audience' ? 'col-span-2 @3xl:col-span-4' : k === 'must_haves' || k === 'constraints' || k === 'landing_page' ? 'col-span-2' : ''
              }`}
            >
              <dt className="label-xs uppercase tracking-[0.06em] text-tertiary flex flex-wrap items-center gap-2">
                {LABELS[k]}
                {(k === 'start_date' || k === 'end_date') && brief.dates_proposed_by_mia ? (
                  <NeedsYou>Mia's proposal</NeedsYou>
                ) : null}
                {k === 'budget_total' && brief.budget_total == null ? <NeedsYou>no budget yet</NeedsYou> : null}
              </dt>
              <dd className="paragraph-md font-medium text-primary mt-1">
                <details className="group">
                  <summary className="cursor-pointer list-none line-clamp-2 group-open:line-clamp-none [overflow-wrap:anywhere] [&::-webkit-details-marker]:hidden">
                    <Linked text={show(k)} />
                  </summary>
                </details>
              </dd>
            </div>
          ))}
        </dl>
        {/* the facts check, once, where the facts are, naming them (test 24 Nov: "2 of these" said nothing) */}
        {drafted.length && onConfirm && !locked ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand bg-brand-primary px-3 py-2">
            <p className="paragraph-sm text-primary">
              Mia filled in {listFields(drafted)} herself. {drafted.length === 1 ? 'Is it' : 'Are they'} right?
            </p>
            <span className="flex gap-2">
              <PrimaryAction loading={busy === 'confirm'} onClick={() => onConfirm(drafted)}>
                These are right
              </PrimaryAction>
              <Button size="sm" onClick={startEditing}>
                Edit
              </Button>
            </span>
          </div>
        ) : null}
        {notSet.length || skipped.length ? (
          <div className="mt-3 flex flex-col gap-1 border-t border-secondary pt-2 paragraph-xs text-tertiary">
            {notSet.length ? (
              // says it's optional and what Add does (test 24 Nov: "Not set: … · add" was unclear)
              <p>
                Optional, not given: {notSet.map((k) => LABELS[k].toLowerCase()).join(', ')}
                {locked ? null : (
                  <>
                    {' · '}
                    <button type="button" onClick={startEditing} className="underline hover:text-secondary">Add any</button>
                  </>
                )}
              </p>
            ) : null}
            {skipped.length ? (
              <details>
                <summary className="cursor-pointer select-none">
                  {skipped.length} question{skipped.length === 1 ? '' : 's'} skipped, so Mia decides · <span className="underline">See</span>
                </summary>
                <ul className="mt-1 flex flex-col gap-1">
                  {skipped.map((q, i) => (
                    <li key={i} className="text-secondary">
                      <span className="text-primary">{q.question}</span> {q.assumed ? `Mia assumed: ${q.assumed}` : 'Mia decides as she plans.'}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
        </>
      )}
    </Card>
  )
}

function PmWords({ brief }: { brief: Brief }) {
  if (!brief.pm_words?.length) return null
  return (
    <>
      <p className="paragraph-xs text-tertiary">Mia follows these as written and never changes them.</p>
      <ul className="flex flex-col gap-2">
        {brief.pm_words.map((w, i) => (
          <li key={i} className="paragraph-sm text-primary">
            <span className="text-secondary">“<Linked text={w.text} />”</span> <Chip>{w.sets}</Chip>
          </li>
        ))}
      </ul>
    </>
  )
}

function Questions({
  brief,
  busy,
  running,
  onAnswer,
  onSkip,
}: {
  brief: Brief
  busy: string | null
  running: boolean
  onAnswer: (id: string, answer: string) => Promise<unknown>
  onSkip: (id: string) => Promise<unknown>
}) {
  const qs = (brief.open_questions ?? []).slice(0, 1) // one at a time; the next shows after Send or Skip
  // Kept by question id: a question that closes moves the others up, and answers stayed under the wrong one (16 Oct).
  const [answers, setAnswers] = useState<Record<string, string>>({})
  if (!qs.length) return null
  // Each answer goes in on its own: Send (or Enter) saves it and closes the question at once. The plan and the words
  // read it from the brief; no redraft needed (live test 20 Oct).
  const send = (id: string) => {
    const a = (answers[id] ?? '').trim()
    if (!a || busy || running) return
    void onAnswer(id, a).then((ok) => {
      if (ok !== undefined) setAnswers(({ [id]: _, ...rest }) => rest)
    })
  }
  return (
    <ol className="flex flex-col gap-3">
      {qs.map((q) => (
        <li key={q.id} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <label htmlFor={`q-${q.id}`} className="min-w-0 flex-1 paragraph-sm text-primary">
              {q.question}
              <span className="block paragraph-xs text-tertiary">{q.why_it_matters}</span>
              {q.unclear ? (
                <span className="mt-1 block paragraph-xs text-utility-warning-700 [overflow-wrap:anywhere]">
                  You wrote “{q.unclear.answer}”. {q.unclear.why}{' '}
                  {q.unclear.kind === 'unclear'
                    ? 'Which do you mean? Say it in a few more words.'
                    : 'What’s your answer to this one? (Chat messages go in the chat box.)'}
                </span>
              ) : null}
            </label>
            <span className="flex items-center gap-2">
              <AskMia label="Brief question" detail={q.question} />
              <button
                type="button"
                disabled={!!busy || running}
                onClick={() => onSkip(q.id)}
                className="paragraph-xs underline text-secondary hover:text-primary disabled:opacity-50"
              >
                Skip
              </button>
            </span>
          </div>
          <div className="flex gap-2">
            <input
              id={`q-${q.id}`}
              placeholder="Your answer"
              className="min-w-0 flex-1 rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
              value={answers[q.id] ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  send(q.id)
                }
              }}
            />
            <Button size="sm" disabled={!(answers[q.id] ?? '').trim() || running} loading={busy === 'brief'} onClick={() => send(q.id)}>
              Send
            </Button>
          </div>
        </li>
      ))}
    </ol>
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
  return (
    <>
      {facts.length ? (
        <ul className="list-disc pl-5 paragraph-sm text-primary flex flex-col gap-1">
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
    </>
  )
}

// Where the client stands on mia-cube's KPI list before the plan is made: the last campaign
// result for each KPI (and its target then), else the account's own last-90-days figure.
function WhereTheyStand({ groups, currency }: { groups: KpiGroup[]; currency?: string | null }) {
  const rows = groups
    .map((g) => ({ ...g, kpis: g.kpis.filter((k) => k.last_result || k.account_90d != null) }))
    .filter((g) => g.kpis.length)
  if (!rows.length) return <p className="paragraph-sm text-tertiary">No past results for this client yet.</p>
  return (
    <>
      <p className="paragraph-xs text-tertiary">
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
                      ? `${kpiValue(k.last_result.value, k.unit, currency)}${k.last_result.target != null ? ` (target ${kpiValue(k.last_result.target, k.unit, currency)})` : ''}`
                      : `${kpiValue(k.account_90d, k.unit, currency)} · 90 days`}
                  </span>
                  {k.last_result ? <span className="w-full paragraph-xs text-tertiary">{k.last_result.campaign}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}
