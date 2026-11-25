import { Button } from '../../../components/button'
import type { BuildState } from '../types'
import { stepsFor, currentStep, targetsToDecide, wordsToFix, type StepKey, type StepState } from './steps'

// Up next (local test 27 Oct: "it needs to guide and tell me each step along the way… i had no idea it was done til u
// said so"): one line, always in view, naming the one next thing for the PM, and what Mia is doing meanwhile. Worked
// out from the campaign as it is now, like the steps, so it can't drift.

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function upNext(s: BuildState, states: Record<StepKey, StepState>): { text: string; step: StepKey; background?: string } {
  const plan = s.plan
  const cur = currentStep(states)
  const bpo = s.campaign.client_type === 'bpo'
  const jobsLabel = bpo ? 'Jobs' : 'Jobs & budget'
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
  const flagged = jobs.filter(wordsToFix)
  const done = new Set(plan?.decisions.notes_done ?? [])
  // a check from before the latest change isn't what's open now (review 2 Nov: "Go through Mia's 2 findings" beside
  // items saying "Found before your latest change"); the next check says what is, and the approve box counts the same
  const stale = !!plan?.review?.stale
  // a must-have no job makes counts as a finding; notes are advice that never holds approve (E30)
  const missing = stale || plan?.review?.audit?.error ? 0
    : (plan?.review?.audit?.uncovered ?? []).filter((u) => !done.has(u.decision)).length
  const breaks = (stale ? 0 : plan?.review?.audit?.jobs?.length ?? 0) + missing
  const notesOpen = stale ? 0 : (plan?.review?.scorecard?.look_at ?? []).filter((x) => !done.has(x)).length
  const findings = breaks
  const found = plural(breaks, 'finding')
  const recheck = (plan?.decisions.kpi_targets ?? []).filter((t) => t.recheck && t.value != null).length
  const reconfirm = !!plan && !plan.decisions.jobs_confirmed && !!(plan.decisions as { jobs_confirmed_sig?: string }).jobs_confirmed_sig
  const first = [
    recheck ? `recheck ${plural(recheck, 'target')} you kept` : '',
    reconfirm && cur !== 'jobs' ? 'confirm the jobs again' : '',
  ].filter(Boolean)
  // jobsLast: the text itself says when to confirm the jobs again, so it isn't put first
  const say = (text: string, step: StepKey, jobsLast = false) => {
    const pre = jobsLast ? first.filter((x) => x !== 'confirm the jobs again') : first
    return {
      text: pre.length ? `First ${pre.join(' and ')} (below). Then: ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text,
      step,
      background: step === 'words' && words ? undefined : background,
    }
  }
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
      if (!jobs.length) return say('There are no jobs in the plan: ask Mia in the chat to add one, or make the plan again.', 'jobs')
      return say(`Look over the jobs${bpo ? '' : ' and the money'}, then press Looks right. Mia writes the final words after.`, 'jobs')
    case 'words':
      if (words) return say(`${background} Nothing needs you yet; this step finishes by itself.`, 'words')
      if ((s.check_pending ?? s.checking) && s.auto_words) return say('Mia is about to write the final words. Nothing needs you yet.', 'words')
      if (flagged.length) return say(`Fix the words on ${plural(flagged.length, 'job')} Mia flagged.`, 'words')
      if (s.words_run?.status === 'failed') return say('Writing stopped part-way: press Carry on for the jobs left.', 'words')
      // the jobs aren't confirmed (or changed since): the words row has no Try again then, it waits for Looks right
      // (sweep D6: this said "press Try again" over a row with no such button)
      if (plan && !plan.decisions.jobs_confirmed)
        return say(reconfirm ? `The jobs changed: press Looks right on ${jobsLabel} again, and Mia writes the final words after.`
          : `Press Looks right on ${jobsLabel}, and Mia writes the final words after.`, 'jobs', true)
      // nothing waiting to write them (a lost background check, review 2 Nov): the item below says Try again, so this
      // does too, never "in a moment" for ever
      if (!jobs.some((a) => a.final_words)) return say("Mia's final words haven't started: press Try again.", 'words')
      return say('Some jobs are still on draft words: press Try again.', 'words')
    default: {
      if (states.check === 'done') return { text: 'Approved. Send the jobs to Flex next.', step: 'check' }
      const blockers = s.blockers.filter((b) => b.key !== 'words' || !words)
      if (blockers.length) return say(`Sort ${plural(blockers.length, 'thing')} before you approve.`, 'check')
      // the list's order: findings and notes first, since fixing them changes the jobs, then the jobs confirmed once
      // (local test 5, 2 Nov: "First confirm the jobs again" over a list that put a finding first)
      // an answer being applied may change the jobs: approve waits for it (review 2 Nov)
      if ((s.reading_answers ?? 0) > 0)
        return { text: 'Mia is applying your last answer. Then you approve.', step: 'check' }
      if (findings && !s.checking)
        return say(`Go through Mia's ${found}, one at a time${reconfirm ? ', then confirm the jobs again' : ''}, then approve.`, 'check', true)
      if (s.checking || words) return { text: 'Mia is checking the plan once more. Then you approve.', step: 'check' }
      // a close reading that failed is "couldn't run", as the Approve box and the server say (review 25 Nov)
      if (plan?.review?.audit?.error && !stale)
        return say("Part of Mia's check couldn't run: press Check again, then approve.", 'check')
      // a changed job's words are rewritten first, then the check runs (local test 5, 2 Nov: "Everything is done.
      // Approve the plan." showed over "Mia is about to rewrite 2 jobs, then she checks")
      if ((s.check_pending ?? s.checking) && s.auto_words)
        return { text: 'Mia is rewriting the changed jobs, then she checks once more. Nothing needs you yet.', step: 'check' }
      // a fix applied to a job's words whose rewrite didn't land (review 25 Nov, B1): the Approve box names it too
      const fixPending = jobs.filter((a) => a.words_must_fix && a.final_words)
      if (fixPending.length)
        return say(`Rewrite ${fixPending.length === 1 ? `${fixPending[0].name}'s words` : `the words for ${plural(fixPending.length, 'job')}`}: the fix you applied isn't in them yet.`, 'check')
      if (notesOpen)
        return say(`Approve the plan. Mia left ${plural(notesOpen, 'note')} of advice: fix any you want first.`, 'check')
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
  // The brief or the plan being made, on the step whose progress card already says so: nothing to add (test 24 Nov,
  // E9: "Up next: Mia is making the plan (4 of 7…)" sat right above the card saying the same)
  const running = state.brief_run?.status === 'running' || state.plan_run?.status === 'running'
  if (running && !elsewhere) return null
  // Only saying what Mia is doing ("Nothing needs you yet"): no "Go to" button sending the PM away from the work in
  // front of them (test 24 Nov, E20: "Go to Final words" while they were going through findings)
  const onlyMia = /Nothing needs you|^Mia is (checking|rewriting|writing|applying)/.test(u.text)
  // ...and on the step where Your turn's own card already says what she is doing, nothing at all (E18)
  if (onlyMia && !elsewhere) return null
  // Said once (screen walk 23 Nov: Up next, Your turn and a Next button all named the same task): when the PM's task is
  // on this step, Your turn below says it, so this line shows only to point elsewhere or to say what Mia is doing.
  const minding = /^(Mia is|Approved\.)|Nothing needs you/.test(u.text)
  if (!elsewhere && !minding) {
    return u.background ? (
      <p role="status" aria-live="polite" className="paragraph-xs text-tertiary">
        {u.background}
      </p>
    ) : null
  }
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
      {elsewhere && !onlyMia ? (
        <Button size="sm" variant="primary" onClick={() => onGo(u.step)}>
          Go to {stepsFor(state).find((st) => st.key === u.step)?.label}
        </Button>
      ) : null}
    </div>
  )
}
