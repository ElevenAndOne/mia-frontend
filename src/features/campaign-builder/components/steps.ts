import type { BuildState, KpiTarget, PlanAsset } from '../types'
import { moneySign, num } from './parts'

/** A note left for the PM in the words ("[PM to add the link]") needs a fact only the PM has: rewriting can't fix it.
 *  By the flag's kind; the wording is only a fallback for words checked before kinds existed (review 19 Oct). */
export const isWordsNote = (f: { problem: string; kind?: string }) =>
  f.kind === 'note' || (!f.kind && f.problem.startsWith('a note left in the words'))

/** A job whose words have a real flag to fix: the one count every place shows, as build_service.words_flagged counts it
 *  (local test 4, 30 Oct: "2 jobs" and "3 jobs"; local test 5, 2 Nov: "5 to fix" beside "flagged words on 1 job"). */
export const wordsToFix = (a: PlanAsset) =>
  a.final_words?.status === 'flagged' && (a.final_words.flags ?? []).some((f) => !isWordsNote(f))

// The builder as six steps (docs2/CAMPAIGN_BUILDER_STEPS_PLAN_2026-10-20.md; Start folded into Key facts, L1): one at a
// time, most important first,
// each one a short checklist. A step's state is worked out from the campaign as it is now, never stored, so it can't
// drift. A step once done stays done: what a later change needs (a target to recheck, jobs to confirm again, words to
// rewrite) shows on whatever step the PM is on, never as a trip back (Josh, 29 Oct: "no going back and forth").

export type StepKey = 'facts' | 'questions' | 'targets' | 'jobs' | 'words' | 'check'
export type StepState = 'done' | 'todo' | 'busy'

export const STEPS: { key: StepKey; label: string; help: string }[] = [
  { key: 'facts', label: 'Key facts', help: 'Check the facts every later step depends on, answer what only you know, then Mia makes the plan.' },
  { key: 'questions', label: "Mia's questions", help: 'Mia made the plan. Now she asks what would change it most.' },
  { key: 'targets', label: 'Targets', help: "Your own numbers are set. Keep Mia's estimates or type your own." },
  { key: 'jobs', label: 'Jobs & budget', help: 'What the studio makes, what it costs, and how the money splits.' },
  { key: 'words', label: 'Final words', help: 'Mia writes and checks the finished copy for every job by herself, once her questions are answered.' },
  { key: 'check', label: 'Check & approve', help: 'Mia checks the campaign as it stands now. Then approve.' },
]

// The targets the PM still has to decide: the empty ones, and the ones Mia copied from the client's history that the PM
// hasn't looked at (29 Oct: an old, mislabelled R7,698 cost per click went into the plan without the PM seeing it).
// A history target shows with its number as the starting point, like one of Mia's estimates.
/** A target's number as a PM reads it, as the server's _ref_value writes it: 5.61%, R0.76, 1,200 (local test 5, 2 Nov:
 *  a past campaign's rates showed bare, "5.61", beside Mia's "64.00%"). Rates are stored in percent. */
export const targetLabel = (t: Pick<KpiTarget, 'unit'>, v: number, currency?: string | null) =>
  t.unit === 'fraction'
    ? `${v.toFixed(2)}%`
    : t.unit === 'currency'
      ? `${moneySign(currency)}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : num(v)

export function targetsToDecide(s: Pick<BuildState, 'plan'> & { campaign?: { currency?: string | null } }) {
  const targets = s.plan?.decisions.kpi_targets ?? []
  return targets
    .filter((t) => (t.value == null && !t.no_target) || (t.made_by === 'rules' && t.value != null))
    .map((t) =>
      t.value != null
        ? // a last-90-days account rate reads "From your account", a past campaign's result "From a past campaign"
          // (review 2 Nov: every rules target said past campaign)
          { ...t, suggested: t.value, suggested_by: t.basis === 'account' ? 'account' : 'history', suggested_label: targetLabel(t, t.value, s.campaign?.currency), suggested_from: t.reason ?? null, fromHistory: true }
        : // a past result put aside as far off: why, where the row explains its number
          { ...t, fromHistory: false, ...(t.doubted != null && t.reason ? { account_reference: t.reason } : {}) },
    )
}

export function stepStates(s: BuildState): Record<StepKey, StepState> {
  const plan = s.plan
  const brief = s.brief?.brief
  const planRunning = s.plan_run?.status === 'running'
  const asks = (plan?.decisions.ask_pm ?? [])
    .map((q) => (typeof q === 'string' ? { question: q } : q))
    .filter((q) => !('about' in q && q.about === 'Targets'))
  const toSet = targetsToDecide(s)
  const jobs = plan?.assets ?? []
  const jobBlockers = s.blockers.some((b) => b.key === 'budget_split' || jobs.some((a) => a.name === b.key))
  const allWords = jobs.length > 0 && jobs.every((a) => a.final_words)
  const wordsRunning = s.words_run?.status === 'running'
  return {
    facts:
      s.brief_run?.status === 'running' && !s.brief
        ? 'busy'
        : !plan
          ? // the facts are settled and Mia is making the plan from them (local test 4, 30 Oct: "0 of 6 done" then)
            (planRunning || s.plan_run?.status === 'failed') && !brief?.open_questions?.length
            ? 'done'
            : 'todo'
          : brief?.open_questions?.length || s.blockers.some((b) => b.key === 'budget_total')
            ? 'todo' // a paid plan with no budget can't be approved: the budget is a key fact (live test 22 Oct)
            : 'done', // a brief newer than the plan: its choice shows on whatever step the PM is on
    questions: planRunning ? 'busy' : !plan ? 'todo' : asks.length ? 'todo' : 'done',
    targets: !plan ? 'todo' : toSet.length ? 'todo' : 'done',
    // confirmed once: done (confirming again after a change is offered on the step the PM is on)
    jobs: !plan || jobBlockers ? 'todo' : (plan.decisions as { jobs_confirmed_sig?: string }).jobs_confirmed_sig ? 'done' : 'todo',
    // words written before the jobs were confirmed (an older draft) don't make the step done ahead of Jobs (local test
    // 4, 30 Oct: Final words showed done while Targets and Jobs were still open)
    words: wordsRunning ? 'busy' : allWords && !!(plan?.decisions as { jobs_confirmed_sig?: string } | undefined)?.jobs_confirmed_sig ? 'done' : 'todo',
    check: s.campaign.building ? 'todo' : 'done',
  }
}

// The step to work on: the first one still to do. Going back is free; going forward is in order (decided 20 Oct).
export function currentStep(states: Record<StepKey, StepState>): StepKey {
  return STEPS.find((st) => states[st.key] === 'todo' || states[st.key] === 'busy')?.key ?? 'check'
}

export function canOpen(states: Record<StepKey, StepState>, key: StepKey): boolean {
  const cur = STEPS.findIndex((st) => st.key === currentStep(states))
  const idx = STEPS.findIndex((st) => st.key === key)
  return idx <= cur || states[key] === 'done'
}
