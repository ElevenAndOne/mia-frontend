import type { BuildState } from '../types'

// The builder as seven steps (docs2/CAMPAIGN_BUILDER_STEPS_PLAN_2026-10-20.md): one at a time, most important first,
// each one a short checklist. A step's state is worked out from the campaign as it is now, never stored, so it can't
// drift: "recheck" means something earlier changed what this step was done against.

export type StepKey = 'start' | 'facts' | 'questions' | 'targets' | 'jobs' | 'words' | 'check'
export type StepState = 'done' | 'todo' | 'recheck' | 'busy'

export const STEPS: { key: StepKey; label: string; help: string }[] = [
  { key: 'start', label: 'Start', help: 'What you gave Mia and what she read.' },
  { key: 'facts', label: 'Key facts', help: 'Check the facts every later step depends on, and answer what only you know.' },
  { key: 'questions', label: "Mia's questions", help: 'Mia made the plan. Now she asks what would change it most.' },
  { key: 'targets', label: 'Targets', help: "Your own numbers are set. Keep Mia's estimates or type your own." },
  { key: 'jobs', label: 'Jobs & budget', help: 'What the studio makes, what it costs, and how the money splits.' },
  { key: 'words', label: 'Final words', help: 'Mia writes the finished copy for every job and checks it.' },
  { key: 'check', label: 'Check & approve', help: 'Mia checks the campaign as it stands now. Then approve.' },
]

export function stepStates(s: BuildState): Record<StepKey, StepState> {
  const plan = s.plan
  const brief = s.brief?.brief
  const planRunning = s.plan_run?.status === 'running'
  const asks = (plan?.decisions.ask_pm ?? [])
    .map((q) => (typeof q === 'string' ? { question: q } : q))
    .filter((q) => !('about' in q && q.about === 'Targets'))
  const targets = plan?.decisions.kpi_targets ?? []
  const toSet = targets.filter((t) => t.value == null && !t.no_target)
  const recheckTargets = targets.some((t) => t.recheck && t.value != null)
  const jobs = plan?.assets ?? []
  const jobBlockers = s.blockers.some((b) => b.key === 'budget_split' || jobs.some((a) => a.name === b.key))
  const stale = jobs.some((a) => a.words_stale)
  const allWords = jobs.length > 0 && jobs.every((a) => a.final_words)
  const wordsRunning = s.words_run?.status === 'running'
  return {
    start: s.brief_run?.status === 'running' && !s.brief ? 'busy' : s.brief ? 'done' : 'todo',
    facts: !plan ? 'todo' : s.plan_from_older_brief ? 'recheck' : brief?.open_questions?.length ? 'todo' : 'done',
    questions: planRunning ? 'busy' : !plan ? 'todo' : asks.length ? 'todo' : 'done',
    targets: !plan ? 'todo' : recheckTargets ? 'recheck' : toSet.length ? 'todo' : 'done',
    jobs: !plan
      ? 'todo'
      : plan.decisions.jobs_confirmed && !jobBlockers
        ? 'done'
        : plan.decisions.jobs_confirmed === false && (plan.decisions as { jobs_confirmed_sig?: string }).jobs_confirmed_sig
          ? 'recheck'
          : 'todo',
    words: wordsRunning ? 'busy' : stale ? 'recheck' : allWords ? 'done' : 'todo',
    check: s.campaign.building ? 'todo' : 'done',
  }
}

// The step to work on: the first one not done. Going back is free; going forward is in order (decided 20 Oct).
export function currentStep(states: Record<StepKey, StepState>): StepKey {
  return STEPS.find((st) => states[st.key] !== 'done')?.key ?? 'check'
}

export function canOpen(states: Record<StepKey, StepState>, key: StepKey): boolean {
  const cur = STEPS.findIndex((st) => st.key === currentStep(states))
  const idx = STEPS.findIndex((st) => st.key === key)
  return idx <= cur || states[key] === 'done'
}
