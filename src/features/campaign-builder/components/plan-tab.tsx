import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { fetchPlaybooks } from '../api'
import { KpiPicker } from './kpi-picker'
import { JobWords } from './final-words'
import { AskMia, askMia, FactStrip, Fold, PrimaryAction, TargetToSet, YourTurn, type TurnItem } from './your-turn'
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
  onKeepPlan: () => Promise<unknown>
  // The step-by-step page shows one part at a time (docs2/CAMPAIGN_BUILDER_STEPS_PLAN_2026-10-20.md).
  part?: PlanPart
  onSkipQuestion?: (id: string) => Promise<unknown>
  onFinalCheck?: () => Promise<unknown>
  onFillTargets?: () => Promise<unknown>
}

export type PlanPart = 'questions' | 'targets' | 'jobs' | 'words' | 'check'
// Which of "Your turn" each step holds, and which detail sections it opens.
const PART_ITEMS: Record<PlanPart, (key: string) => boolean> = {
  questions: (k) => ['older-brief', 'questions', 'answered', 'notes'].includes(k),
  targets: (k) => ['older-brief', 'targets', 'recheck', 'fill-targets'].includes(k),
  jobs: (k) => ['older-brief', 'reprice', 'confirm-jobs'].includes(k) || k.startsWith('blocker-'),
  words: (k) => ['older-brief', 'words', 'stale-words', 'fix-words', 'fill-in'].includes(k),
  check: (k) => ['final-check', 'notes', 'approve'].includes(k),
}
const PART_FOLDS: Record<PlanPart, string[]> = {
  questions: ['idea'],
  targets: ['phases'],
  jobs: ['phases', 'jobs'],
  words: ['jobs'],
  check: ['how'],
}

export function PlanTab({ state, kpiGroups, busy, onEdit, onMakePlan, onApprove, onWriteWords, onSaveBrief, onReprice, onKeepPlan,
  part, onSkipQuestion, onFinalCheck, onFillTargets }: Props) {
  const [picking, setPicking] = useState<string | null>(null) // the phase whose KPI picker is open
  const [openJobs, setOpenJobs] = useState<Set<number>>(() => new Set())
  // Detail sections: closed until wanted; a step opens the ones it is about.
  const [folds, setFolds] = useState<Set<string>>(() => new Set(part ? PART_FOLDS[part] : []))
  const shows = (f: string) => !part || part === 'check' || PART_FOLDS[part].includes(f)
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
  // "Show me" from Your turn: open the fold (and the job), then scroll to the item.
  const reveal = (id: string, fold?: string, jobIndex?: number) => {
    if (fold) setFolds((f) => new Set(f).add(fold))
    if (jobIndex != null) setOpenJobs((o) => new Set(o).add(jobIndex))
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }
  const toggle = (f: string) => setFolds((o) => { const n = new Set(o); if (n.has(f)) n.delete(f); else n.add(f); return n })
  const targets = plan.decisions.kpi_targets
  const toSet = targets.filter((t) => t.value == null && !t.no_target)
  const flaggedJobs = plan.assets.filter((a) => a.final_words?.status === 'flagged')
  const sc = plan.review?.scorecard
  return (
    <div className="flex flex-col gap-4">
      {run?.status === 'failed' ? <RunFailed run={run} what="plan" busy={!!busy} onRetry={() => onMakePlan()} /> : null}
      {locked ? (
        <Card className="paragraph-sm text-primary">
          Approved{state.approved?.at ? ` ${day(state.approved.at)}` : ''}
          {state.approved?.by ? ` by ${state.approved.by}` : ''}. It goes live when you launch it, so nothing is tracked
          or counted before then. Next: send the jobs to Flex from the Studio tab.
        </Card>
      ) : (
        <YourTurn
          key={part}
          items={planTurnItems({ state, plan, busy, onEdit, onApprove, onWriteWords, onReprice, onMakePlan, onKeepPlan, reveal,
            onSkipQuestion, onFinalCheck, onFillTargets, part }).filter((i) => !part || PART_ITEMS[part](i.key))}
        />
      )}

      <FactStrip state={state} plan={plan} />

      {shows('idea') ? (<Fold
        id="fold-idea"
        title="The idea"
        summary={<>{plan.concept.name}{sc && !sc.thin_history ? ` · self-check ${sc.grade} (${sc.overall})` : ''}</>}
        open={folds.has('idea')}
        onToggle={() => toggle('idea')}
      >
        {plan.concept.big_idea ? <p className="paragraph-sm text-primary">{plan.concept.big_idea}</p> : null}
        <Shape plan={plan} state={state} locked={locked} busy={busy} onSaveBrief={onSaveBrief} onMakePlan={onMakePlan} />
      </Fold>) : null}

      {shows('phases') ? (<Fold
        id="fold-phases"
        title="Phases, budget and targets"
        summary={`${plan.phases.length} phases · ${targets.length} targets${toSet.length && !locked ? `, ${toSet.length} to set` : ''}`}
        open={folds.has('phases')}
        onToggle={() => toggle('phases')}
      >
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
                {targets
                  .filter((t) => t.phase === p.phase)
                  .map((t) => (
                    <Target key={t.key} t={t} disabled={locked} onEdit={onEdit} needsSource={needsSource.has(t.kpi_key)} />
                  ))}
                {locked ? null : picking === p.phase ? (
                  <KpiPicker
                    groups={kpiGroups}
                    busy={busy === 'edit'}
                    taken={new Set(targets.filter((t) => t.phase === p.phase).map((t) => t.kpi_key))}
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
      </Fold>) : null}

      {shows('jobs') ? (<Fold
        id="fold-jobs"
        title="Jobs for the studio"
        summary={`${plan.assets.length} jobs · ${num(plan.credits?.total_planned ?? 0)} credits · words: ${
          plan.assets.filter((a) => a.final_words?.status === 'ready').length
        } ready${flaggedJobs.length ? `, ${flaggedJobs.length} to fix` : ''}`}
        open={folds.has('jobs')}
        onToggle={() => toggle('jobs')}
      >
        <p className="paragraph-xs text-tertiary">Open a job for its words, designer brief and audience.</p>
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
      </Fold>) : null}

      {shows('how') ? (<Fold
        id="fold-how"
        title="How Mia got here"
        summary="her self-check, the checks and the idea in full"
        open={folds.has('how')}
        onToggle={() => toggle('how')}
      >
        <Concept plan={plan} />
        {plan.review ? <SelfCheck review={plan.review} /> : null}
        <Checks plan={plan} />
      </Fold>) : null}
    </div>
  )
}

// Your turn on the Plan tab: everything the PM has to do before approving, in the order to do it. Built from
// the same state the page already had (blockers, flagged words, Mia's questions, the self-check's notes), so no
// logic moved: only where it shows.
function planTurnItems({
  state,
  plan,
  busy,
  onEdit,
  onApprove,
  onWriteWords,
  onReprice,
  onMakePlan,
  onKeepPlan,
  reveal,
  onSkipQuestion,
  onFinalCheck,
  onFillTargets,
  part,
}: {
  state: BuildState
  plan: Plan
  busy: string | null
  onEdit: Props['onEdit']
  onApprove: Props['onApprove']
  onWriteWords: Props['onWriteWords']
  onReprice: Props['onReprice']
  onMakePlan: Props['onMakePlan']
  onKeepPlan: Props['onKeepPlan']
  reveal: (id: string, fold?: string, jobIndex?: number) => void
  onSkipQuestion?: Props['onSkipQuestion']
  onFinalCheck?: Props['onFinalCheck']
  onFillTargets?: Props['onFillTargets']
  part?: PlanPart
}): TurnItem[] {
  // Order (live test 20 Oct): what changes the plan first, then targets, questions and notes; the final words come
  // last, right before Approve, because they depend on everything above.
  const items: TurnItem[] = []
  const wordItems: TurnItem[] = []
  const jobs = plan.assets
  const wordsRun = state.words_run
  const without = jobs.filter((a) => !a.final_words).length
  const flaggedAll = jobs.map((a, i) => ({ a, i })).filter(({ a }) => a.final_words?.status === 'flagged')
  // A note left for the PM ("[PM to add the link]") needs a fact only the PM has: rewriting can't fix it.
  // By the flag's kind; the wording is only a fallback for words checked before kinds existed (review 19 Oct).
  const isNote = (f: { problem: string; kind?: string }) => f.kind === 'note' || (!f.kind && f.problem.startsWith('a note left in the words'))
  const notes = flaggedAll.flatMap(({ a, i }) =>
    (a.final_words?.flags ?? [])
      .filter(isNote)
      .map((f) => ({ a, i, where: f.where, note: f.note ?? (f.problem.match(/\((.*)\)$/) ?? [])[1] ?? f.problem })),
  )
  const flagged = flaggedAll.filter(({ a }) => (a.final_words?.flags ?? []).some((f) => !isNote(f)))
  const targets = plan.decisions.kpi_targets
  const toSet = targets.filter((t) => t.value == null && !t.no_target)
  const targetKeys = new Set(targets.map((t) => t.key))
  const otherBlockers = state.blockers.filter((b) => !(b.key && (targetKeys.has(b.key) || b.key === 'words' || b.key === 'questions')))
  const recheck = targets.filter((t) => t.recheck && t.value != null)
  const mias = toSet.filter((t) => t.suggested != null && t.suggested_by === 'mia')
  // The "set these targets" question is the Targets item below; once none are left it's stale.
  const asks = (plan.decisions.ask_pm ?? [])
    .map((q) => (typeof q === 'string' ? { question: q } : q))
    .filter((q) => !('about' in q && q.about === 'Targets'))
  const done = new Set(plan.decisions.notes_done ?? [])
  const lookAt = (plan.review?.scorecard?.look_at ?? []).filter((x) => !done.has(x))

  if (state.plan_from_older_brief) {
    items.push({
      key: 'older-brief',
      title: 'The budget, dates, channels or goal changed',
      detail:
        'Update the plan for it (your targets and answers are kept), or keep this plan and fix what no longer fits below.',
      actions: (
        <>
          <PrimaryAction loading={busy === 'plan'} onClick={() => onMakePlan()}>
            Update the plan
          </PrimaryAction>
          <Button size="sm" loading={busy === 'keep'} onClick={() => onKeepPlan()}>
            Keep this plan
          </Button>
        </>
      ),
    })
  }
  if (jobs.length && jobs.every((a) => a.credits == null)) {
    items.push({
      key: 'reprice',
      title: 'Get the prices from Flex',
      detail: "Flex couldn't be reached when Mia made this plan, so the jobs have no credits yet.",
      actions: (
        <PrimaryAction loading={busy === 'reprice'} onClick={() => onReprice()}>
          Get prices
        </PrimaryAction>
      ),
    })
  }
  wordItems.push({
    key: 'words',
    title: wordsRun?.status === 'running' ? 'Mia is writing the final words' : without ? 'Write the final words' : 'Final words written',
    done: !without && wordsRun?.status !== 'running',
    detail:
      wordsRun?.status === 'running'
        ? `${wordsRun.stage_label ?? 'Writing'}… about a minute a job. You can keep working.`
        : `${without} of ${jobs.length} jobs have draft words. Mia writes the finished copy for each and checks it.` +
          (wordsRun?.status === 'failed' ? ` The last run stopped: ${wordsRun.error ?? 'try again'}.` : ''),
    actions:
      wordsRun?.status === 'running' ? null : (
        <>
          <PrimaryAction loading={busy === 'words'} onClick={() => onWriteWords()}>
            Write them
          </PrimaryAction>
          <AskMia label="Final words" detail="Writing the final words for the jobs" />
        </>
      ),
  })
  if (flagged.length) {
    wordItems.push({
      key: 'fix-words',
      title: `Fix the words on ${flagged.length} job${flagged.length === 1 ? '' : 's'}`,
      detail: 'Mia checked the words and found something on each. Fix it rewrites with her notes.',
      actions: (
        <PrimaryAction
          disabled={busy === 'words'}
          onClick={() => onWriteWords(flagged.map(({ a }) => a.job_id).filter((x): x is string => !!x), true)}
        >
          Fix all
        </PrimaryAction>
      ),
      more: (
        <ul className="flex flex-col gap-2">
          {flagged.map(({ a, i }) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 paragraph-sm text-primary">
              <span className="min-w-0">
                <span className="font-medium">{a.name}</span>
                <span className="block paragraph-xs text-secondary">{a.final_words?.flags[0]?.problem}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Button size="sm" disabled={!a.job_id || busy === 'words'} onClick={() => a.job_id && onWriteWords([a.job_id], true)}>
                  Fix it
                </Button>
                <button type="button" className="paragraph-xs underline text-primary" onClick={() => reveal(`job-${i}`, 'jobs', i)}>
                  Look first
                </button>
                <AskMia
                  label={`Words · ${a.name}`}
                  detail={a.final_words?.flags.map((f) => `${f.where}: ${f.problem}`).join('; ')}
                />
              </span>
            </li>
          ))}
        </ul>
      ),
    })
  }
  if (notes.length) {
    wordItems.push({
      key: 'fill-in',
      title: `Fill in ${notes.length} fact${notes.length === 1 ? '' : 's'} only you have`,
      detail: "Mia left a clear gap rather than inventing these. Type them into the job's words, or tell Mia in the chat.",
      openByDefault: true,
      more: (
        <ul className="flex flex-col gap-2">
          {notes.map((n, k) => (
            <li key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="paragraph-sm text-primary font-medium">{n.note.replace(/^\[|\]$/g, '')}</span>
                <span className="block paragraph-xs text-tertiary">{n.a.name}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => reveal(`job-${n.i}`, 'jobs', n.i)}>
                  Open the words
                </Button>
                <AskMia label={`Missing fact · ${n.a.name}`} detail={n.note} />
              </span>
            </li>
          ))}
        </ul>
      ),
    })
  }
  if (toSet.length && !mias.length && onFillTargets) {
    items.push({
      key: 'fill-targets',
      title: "Fill the boxes with Mia's estimates",
      detail: 'Mia works out a number for each empty target from the budget and your history. Nothing is set until you keep it.',
      actions: (
        <PrimaryAction loading={busy === 'fill'} onClick={() => onFillTargets()}>
          Fill them
        </PrimaryAction>
      ),
    })
  }
  if (toSet.length) {
    const first = toSet[0]
    items.push({
      key: 'targets',
      title: `Set ${toSet.length} target${toSet.length === 1 ? '' : 's'}`,
      detail: mias.length
        ? `Mia estimated ${mias.length}. Keep hers one by one or all at once, or type your own. Estimates show as Mia's, not your data.`
        : 'Type a number for each, or "No target". Ask Mia to fill the boxes with her estimates.',
      openByDefault: true,
      more: (
        <ul className="flex flex-col gap-2">
          {toSet.map((t) => (
            <TargetToSet
              key={t.key}
              name={t.kpi_name}
              phase={t.phase}
              reference={t.account_reference}
              suggested={t.suggested}
              suggestedFrom={t.suggested_from}
              suggestedLabel={t.suggested_label}
              byMia={t.suggested_by === 'mia'}
              kind={t.suggested_kind}
              source={t.suggested_by}
              onSet={(v, note) => onEdit([{ op: 'set_target', key: t.key, value: v, ...(note ? { estimate_note: note } : {}) }])}
              onNoTarget={() => onEdit([{ op: 'set_target', key: t.key, value: null, no_target: true }])}
            />
          ))}
        </ul>
      ),
      actions: (
        <>
          {mias.length ? (
            <PrimaryAction
              loading={busy === 'edit'}
              onClick={() =>
                onEdit(mias.map((t) => ({ op: 'set_target', key: t.key, value: t.suggested ?? null, estimate_note: t.suggested_from ?? "Mia's estimate" })))
              }
            >
              Keep all {mias.length} of Mia's estimates
            </PrimaryAction>
          ) : null}
          <Button size="sm" onClick={() => reveal(`t-${first.key}`, 'phases')}>
            See them in the plan
          </Button>
          <AskMia
            label={`Targets to set (${toSet.length})`}
            detail={toSet.map((t) => `${t.phase} ${t.kpi_name}${t.account_reference ? ` (${t.account_reference})` : ''}`).join('; ')}
          />
        </>
      ),
    })
  }
  if (recheck.length) {
    items.push({
      key: 'recheck',
      title: `Recheck ${recheck.length} target${recheck.length === 1 ? '' : 's'} set before the budget or dates changed`,
      detail: 'Keep each one, or type a new number.',
      openByDefault: true,
      more: (
        <ul className="flex flex-col gap-2">
          {recheck.map((t) => (
            <li key={t.key} className="flex flex-wrap items-center justify-between gap-2 paragraph-sm text-primary">
              <span className="min-w-0">
                <span className="font-medium">{t.kpi_name}</span> <span className="text-tertiary">· {t.phase} · {num(t.value)}</span>
              </span>
              <Button
                size="sm"
                onClick={() => onEdit([{ op: 'set_target', key: t.key, value: t.value, ...(t.estimate_note ? { estimate_note: t.estimate_note } : {}) }])}
              >
                Keep {num(t.value)}
              </Button>
            </li>
          ))}
        </ul>
      ),
    })
  }
  otherBlockers.forEach((b, k) => {
    const ji = jobs.findIndex((a) => a.name === b.key)
    const passed = b.what.includes('which has passed')
    items.push({
      key: `blocker-${k}`,
      title: b.what,
      actions: (
        <>
          {passed ? (
            <Button size="sm" loading={busy === 'edit'} onClick={() => onEdit([{ op: 'shift_dates', days: 7 }])}>
              Move all dates a week later
            </Button>
          ) : ji >= 0 ? (
            <Button size="sm" onClick={() => reveal(`job-${ji}`, 'jobs', ji)}>
              Show me
            </Button>
          ) : null}
          <AskMia label="Needs fixing" detail={b.what} />
        </>
      ),
    })
  })
  if (asks.length) {
    const showing = asks.slice(0, 3) // three at a time, most important first; the next appears as one closes
    items.push({
      key: 'questions',
      title: `Answer or skip ${asks.length} question${asks.length === 1 ? '' : 's'} from Mia`,
      detail:
        'Most important first. Send your answer and Mia proposes what it changes, or skip and she decides. Approve waits for all of them.' +
        (asks.length > 3 ? ` ${asks.length - 3} more after these.` : ''),
      openByDefault: true,
      more: (
        <ul className="flex flex-col gap-2">
          {showing.map((q) => (
            <PlanQuestion
              key={String(q.id ?? q.question)}
              q={q as { id?: string; about?: string; question: string; impact?: string }}
              busy={busy}
              onAnswer={async (answer) => {
                if (!q.id) return
                const ok = await onEdit([{ op: 'answer_question', id: String(q.id), answer }])
                // Mia reads the answer and proposes what it changes in the plan (with Apply), or says nothing does.
                if (ok !== undefined)
                  askMia({ label: `Your answer · ${String(q.about ?? 'Question')}`, detail: q.question, text: `My answer: ${answer}` })
              }}
              onSkip={() => (q.id && onSkipQuestion ? onSkipQuestion(String(q.id)) : Promise.resolve())}
            />
          ))}
        </ul>
      ),
    })
  }
  const answered = plan.decisions.answered ?? []
  if (answered.length && (part === 'questions' || part === 'check')) {
    items.push({
      key: 'answered',
      title: `${answered.length} answered or skipped`,
      done: true,
    })
  }
  if (lookAt.length) {
    items.push({
      key: 'notes',
      title: `Look at ${lookAt.length} note${lookAt.length === 1 ? '' : 's'} from Mia's self-check`,
      detail: lookAt[0],
      more: (
        <ul className="flex flex-col gap-2">
          {lookAt.map((x) => (
            <li key={x} className="flex flex-wrap items-start justify-between gap-2 paragraph-sm text-primary">
              <span className="min-w-0 flex-1">{x}</span>
              <span className="flex items-center gap-2">
                <AskMia label="Self-check note" detail={x} />
                <button
                  type="button"
                  disabled={busy === 'edit'}
                  onClick={() => onEdit([{ op: 'close_note', text: x }])}
                  className="paragraph-xs underline text-secondary hover:text-primary disabled:opacity-50"
                >
                  Done
                </button>
              </span>
            </li>
          ))}
        </ul>
      ),
    })
  }
  if (part === 'jobs' || part === 'check') {
    items.push({
      key: 'confirm-jobs',
      title: 'Check the jobs and the money',
      done: !!plan.decisions.jobs_confirmed,
      detail: `${jobs.length} jobs, ${num(jobs.reduce((n, a) => n + (a.credits ?? 0), 0))} credits. Change anything below, then confirm. A change later brings this back.`,
      actions: (
        <PrimaryAction loading={busy === 'edit'} onClick={() => onEdit([{ op: 'confirm_jobs' }])}>
          Looks right
        </PrimaryAction>
      ),
    })
  }
  const stale = jobs.filter((a) => a.words_stale && a.job_id)
  if (stale.length) {
    wordItems.unshift({
      key: 'stale-words',
      title: `Rewrite the words for ${stale.length} changed job${stale.length === 1 ? '' : 's'}`,
      detail: 'These jobs changed after their words were written. Only these are rewritten; your own words stay.',
      actions: (
        <PrimaryAction disabled={busy === 'words'} onClick={() => onWriteWords(stale.map((a) => a.job_id as string), true)}>
          Rewrite {stale.length}
        </PrimaryAction>
      ),
    })
  }
  items.push(...wordItems)
  if (onFinalCheck && (part === 'check' || !part)) {
    const at = plan.review?.checked_at
    items.push({
      key: 'final-check',
      title: at ? `Mia checked the campaign ${day(at)}` : "Run Mia's final check",
      detail: at
        ? 'Run it again after any change. Her notes are in "How Mia got here" below.'
        : 'Mia reads the whole campaign as it is now and flags only what really matters.',
      actions: (
        <PrimaryAction loading={busy === 'check'} onClick={() => onFinalCheck()}>
          {at ? 'Check again' : 'Run the check'}
        </PrimaryAction>
      ),
    })
  }
  const canApprove = !state.blockers.length && !state.plan_from_older_brief
  items.push({
    key: 'approve',
    title: 'Approve the plan',
    detail: canApprove
      ? 'Saves the plan to the campaign. Next you send the jobs to Flex.' + (state.warnings?.length ? ` Note: ${state.warnings.join(' ')}` : '')
      : 'Waiting on: ' +
        [...(state.plan_from_older_brief ? ['the brief change above'] : []), ...state.blockers.map((b) => b.what)].slice(0, 4).join(' · '),
    actions: (
      <PrimaryAction disabled={!canApprove} loading={busy === 'approve'} onClick={() => onApprove()}>
        Approve
      </PrimaryAction>
    ),
  })
  return items
}

// One of Mia's questions: an answer box with Send (Enter works), Ask Mia, and Skip (Mia decides and says what she
// assumed).
function PlanQuestion({
  q,
  busy,
  onAnswer,
  onSkip,
}: {
  q: { id?: string; about?: string; question: string; impact?: string }
  busy: string | null
  onAnswer: (answer: string) => Promise<unknown>
  onSkip: () => Promise<unknown>
}) {
  const [v, setV] = useState('')
  const send = () => {
    if (v.trim() && !busy) void onAnswer(v.trim())
  }
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="paragraph-sm text-primary font-medium">{q.about ? String(q.about) : 'Question'}</span>
          {q.impact === 'changes_the_plan' ? <Chip tone="mia">changes the plan</Chip> : null}
          <span className="block paragraph-xs text-secondary">{q.question}</span>
        </div>
        <span className="flex items-center gap-2">
          <AskMia label={`Question${q.about ? ` · ${String(q.about)}` : ''}`} detail={q.question} />
          <button
            type="button"
            disabled={!!busy || !q.id}
            onClick={() => onSkip()}
            className="paragraph-xs underline text-secondary hover:text-primary disabled:opacity-50"
          >
            Skip
          </button>
        </span>
      </div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`pq-${q.id}`}>
          Your answer
        </label>
        <input
          id={`pq-${q.id}`}
          placeholder="Your answer"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              send()
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary"
        />
        <Button size="sm" disabled={!v.trim() || !!busy} onClick={send}>
          Send
        </Button>
      </div>
    </li>
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
    t.basis === 'mia_estimate' && t.value != null ? (
      <Chip tone="mia">Mia's estimate · you accepted it</Chip>
    ) : t.made_by === 'pm' && t.value != null ? (
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
      {t.value == null && !t.no_target && t.account_reference ? (
        // What the account did is the PM's starting point, so it sits on the target, not under "Why".
        <p className="mt-0.5 paragraph-xs text-secondary">{t.account_reference}</p>
      ) : null}
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
        {a.due_date_moved_from ? ` · moved earlier from ${day(a.due_date_moved_from)} (its sprint was full)` : ''}
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
          moving={/video|animation|motion/i.test(`${a.ledger_type ?? ''} ${a.format ?? ''}`)}
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
