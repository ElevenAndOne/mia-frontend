export type PlanPart = 'questions' | 'targets' | 'jobs' | 'words' | 'check'

// Which of "Your turn" each step holds (plan-tab's planTurnItems makes the items; this keeps a step's own).
// What a later change needs from the PM shows on whatever step they're on, never as a trip back (Josh, 29 Oct): the
// brief changing under the plan, a kept target to recheck, jobs to confirm again, words to rewrite.
// Mia's open questions too: one raised while she read an answer comes up on the step the PM is on, as a card (DFSA test
// 24 Nov: "Who supplies the bakes and the kitchen?" was only a line in the chat, and would have been missed)
const EVERYWHERE = ['older-brief', 'recheck', 'reconfirm-jobs', 'stale-words', 'questions', 'waiting-fix']

// Every key planTurnItems makes for a step must be listed here, or the item is dropped (review 25 Nov, E1 and E2: the
// "Mia is checking" card, "no job makes" and "no jobs" were made and then filtered out). plan-parts.test.ts checks them.
export const PART_ITEMS: Record<PlanPart, (key: string) => boolean> = {
  questions: (k) => [...EVERYWHERE, 'not-carried', 'questions', 'answered'].includes(k),
  targets: (k) => [...EVERYWHERE, 'targets', 'fill-targets'].includes(k),
  // Mia's self-check is about the jobs, so it's read here, once, grouped by job (29 Oct: it sat on Mia's questions)
  jobs: (k) =>
    [...EVERYWHERE, 'reprice', 'launch-gap', 'notes', 'studio-time', 'credits-over', 'confirm-jobs', 'uncovered',
      'no-jobs'].includes(k) || k.startsWith('blocker-'),
  words: (k) => [...EVERYWHERE, 'words', 'fix-words', 'fill-in', 'breaks'].includes(k),
  check: (k) =>
    [...EVERYWHERE, 'final-check', 'breaks', 'notes', 'words-running', 'no-drive', 'approve', 'uncovered', 'no-jobs',
      'mia-working'].includes(k),
}
