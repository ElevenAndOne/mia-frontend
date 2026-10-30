import { Button } from '../../../components/button'
import type { BuildState } from '../types'
import { STEPS, currentStep, targetsToDecide, type StepKey, type StepState } from './steps'

// Up next (local test 27 Oct: "it needs to guide and tell me each step along the way… i had no idea it was done til u
// said so"): one line, always in view, naming the one next thing for the PM, and what Mia is doing meanwhile. Worked
// out from the campaign as it is now, like the steps, so it can't drift.

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function upNext(s: BuildState, states: Record<StepKey, StepState>): { text: string; step: StepKey; background?: string } {
  const plan = s.plan
  const cur = currentStep(states)
  const words = s.words_run?.status === 'running' ? s.words_run : null
  const background = words
    ? `Mia is writing the final words${words.stage_at && words.stage_of ? ` (job ${words.stage_at} of ${words.stage_of})` : ''}.`
    : s.checking && s.plan // no plan yet, nothing to check (29 Oct: it showed on Key facts after each answer)
      ? 'Mia is checking the plan as it is now.'
      : undefined
  if (s.brief_run?.status === 'running') return { text: 'Mia is drafting the brief. Nothing needs you yet.', step: 'facts' }
  if (s.plan_run?.status === 'running') {
    const r = s.plan_run
    return {
      text: `Mia is making the plan${r.stage_at && r.stage_of ? ` (${r.stage_at} of ${r.stage_of}: ${r.stage_label})` : ''}. Nothing needs you yet.`,
      step: 'questions',
    }
  }
  // A run that stopped is the one thing to do (local test 4, 30 Oct: "Check the key facts, then press Make the plan" and Go
  // to Key facts showed under "Making the plan was interrupted… Try again")
  if (!plan && s.plan_run?.status === 'failed') return { text: 'Making the plan stopped part-way: press Try again.', step: 'questions' }
  // What a later change needs is on the page the PM is on (plan-tab EVERYWHERE): said first, never as a step back
  if (s.plan_from_older_brief) return { text: 'The brief changed: update the plan or keep it (first thing below).', step: cur, background }
  const asks = (plan?.decisions.ask_pm ?? [])
    .map((q) => (typeof q === 'string' ? { question: q } : q))
    .filter((q) => !('about' in q && q.about === 'Targets'))
  const briefQs = s.brief?.brief.open_questions ?? []
  const toSet = targetsToDecide(s)
  const jobs = plan?.assets ?? []
  // a client-to-confirm note isn't a flag to fix: counted as plan-tab and build_service.words_flagged count it (local
  // test 4, 30 Oct: "2 jobs" here, "3 jobs" in the approve box)
  const isNote = (f: { problem: string; kind?: string }) => f.kind === 'note' || (!f.kind && f.problem.startsWith('a note left in the words'))
  const flagged = jobs.filter((a) => a.final_words?.status === 'flagged' && (a.final_words.flags ?? []).some((f) => !isNote(f)))
  const done = new Set(plan?.decisions.notes_done ?? [])
  const breaks = plan?.review?.audit?.jobs?.length ?? 0
  const notesOpen = (plan?.review?.scorecard?.look_at ?? []).filter((x) => !done.has(x)).length
  const findings = breaks + notesOpen
  // the same words the approve box uses: findings and notes counted apart
  const found = [breaks ? plural(breaks, 'finding') : '', notesOpen ? plural(notesOpen, 'note') : ''].filter(Boolean).join(' and ')
  const recheck = (plan?.decisions.kpi_targets ?? []).filter((t) => t.recheck && t.value != null).length
  const reconfirm = !!plan && !plan.decisions.jobs_confirmed && !!(plan.decisions as { jobs_confirmed_sig?: string }).jobs_confirmed_sig
  const first = [
    recheck ? `recheck ${plural(recheck, 'target')} you kept` : '',
    reconfirm && cur !== 'jobs' ? 'confirm the jobs again' : '',
  ].filter(Boolean)
  const say = (text: string, step: StepKey) => ({
    text: first.length ? `First ${first.join(' and ')} (below). Then: ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text,
    step,
    background: step === 'words' && words ? undefined : background,
  })
  switch (cur) {
    case 'facts':
      if (briefQs.length) return say(`Answer Mia's ${plural(briefQs.length, 'question')} about the key facts, one at a time.`, 'facts')
      return say('Check the key facts, then press Make the plan.', 'facts')
    case 'questions': {
      const again = asks.find((q) => 'unclear' in q && q.unclear)
      if (again) return say(`Mia asks one again: ${again.question}`, 'questions')
      const n = (plan?.decisions.answered ?? []).length
      return say(asks.length === 1 ? "Answer Mia's last question, or skip it." : `Answer Mia's next question (${n + 1} of ${n + asks.length}).`, 'questions')
    }
    case 'targets':
      return say(toSet.length ? `Keep Mia's number or type your own for ${plural(toSet.length, 'target')}.` : 'Check the targets.', 'targets')
    case 'jobs':
      return say('Look over the jobs and the money, then press Looks right. Mia writes the final words after.', 'jobs')
    case 'words':
      if (words) return say(`${background} Nothing needs you yet; this step finishes by itself.`, 'words')
      if ((s.check_pending ?? s.checking) && s.auto_words) return say('Mia is about to write the final words. Nothing needs you yet.', 'words')
      if (flagged.length) return say(`Fix the words on ${plural(flagged.length, 'job')} Mia flagged.`, 'words')
      if (s.words_run?.status === 'failed') return say('Writing stopped part-way: press Carry on for the jobs left.', 'words')
      if (!jobs.some((a) => a.final_words)) return say('Mia starts the final words in a moment. Nothing needs you yet.', 'words')
      return say('Some jobs are still on draft words: press Try again.', 'words')
    default: {
      if (states.check === 'done') return { text: 'Approved. Send the jobs to Flex next.', step: 'check' }
      const blockers = s.blockers.filter((b) => b.key !== 'words' || !words)
      if (blockers.length) return say(`Sort ${plural(blockers.length, 'thing')} before you approve.`, 'check')
      if (findings && !s.checking) return say(`Go through Mia's ${found}, one at a time, then approve.`, 'check')
      if (s.checking || words) return { text: 'Mia is checking the plan once more. Then you approve.', step: 'check' }
      return say('Everything is done. Approve the plan.', 'check')
    }
  }
}

export function UpNext({ state, states, step, onGo }: {
  state: BuildState
  states: Record<StepKey, StepState>
  step: StepKey
  onGo: (k: StepKey) => void
}) {
  if (!state.campaign.building) return null
  const u = upNext(state, states)
  const elsewhere = u.step !== step
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b border-secondary bg-secondary px-4 py-2"
    >
      <p className="min-w-0 flex-1 paragraph-sm text-primary">
        <span className="label-sm text-brand-secondary">Up next: </span>
        {u.text}
        {u.background ? <span className="paragraph-xs text-tertiary"> · Meanwhile: {u.background}</span> : null}
      </p>
      {elsewhere ? (
        <Button size="sm" variant="primary" onClick={() => onGo(u.step)}>
          Go to {STEPS.find((st) => st.key === u.step)?.label}
        </Button>
      ) : null}
    </div>
  )
}
