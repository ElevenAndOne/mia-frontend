import type { TurnItem } from './your-turn'

type Step = 'questions' | 'targets' | 'jobs' | 'words' | 'check'

// The step's own action leads Your turn once nothing real is left before it (flow review U1, 23 Nov: Approve sat
// behind "See" because "Check again" came first and never counted as done; review of that fix: Approve must not jump
// ahead of a finding, a blocker, flagged words or a fill-in). Only information that never needs doing may sit behind
// it: Mia's self-check notes (Looks right settles them) and "nothing goes live for the first days".
// Nor while Mia is still working on the step (rewriting words, checking, applying an answer): the step's button can't
// be pressed then, so what she is doing leads (screen walk 23 Nov: "Approve anyway" sat first during a rewrite).
const LEADS: Partial<Record<Step, string>> = { check: 'approve', jobs: 'confirm-jobs' }
// no-drive: a warning that never blocks approve (review 24 Nov: it held Approve back and became the first card); the
// studio-time and credits cards are information too
const NOT_TASKS = new Set(['notes', 'launch-gap', 'no-drive', 'studio-time', 'credits-over'])
export function leadWith(part: Step | undefined, items: TurnItem[], running = false): TurnItem[] {
  const key = part ? LEADS[part] : undefined
  const lead = key ? items.find((i) => i.key === key && !i.done) : undefined
  if (!lead) return items
  // only Approve can't be pressed while Mia works; Looks right can (review 24 Nov: it dropped below a note while she checked)
  if (running && part === 'check') return [...items.filter((i) => i !== lead), lead]
  const realLeft = items.some((i) => i !== lead && !i.done && !NOT_TASKS.has(i.key))
  return realLeft ? items : [lead, ...items.filter((i) => i !== lead)]
}
