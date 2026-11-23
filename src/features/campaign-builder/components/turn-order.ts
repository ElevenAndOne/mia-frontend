import type { TurnItem } from './your-turn'

type Step = 'questions' | 'targets' | 'jobs' | 'words' | 'check'

// The step's own action leads Your turn once nothing real is left before it (flow review U1, 23 Nov: Approve sat
// behind "See" because "Check again" came first and never counted as done; review of that fix: Approve must not jump
// ahead of a finding, a blocker, flagged words or a fill-in). Only information that never needs doing may sit behind
// it: Mia's self-check notes (Looks right settles them) and "nothing goes live for the first days".
const LEADS: Partial<Record<Step, string>> = { check: 'approve', jobs: 'confirm-jobs' }
const NOT_TASKS = new Set(['notes', 'launch-gap'])
export function leadWith(part: Step | undefined, items: TurnItem[]): TurnItem[] {
  const key = part ? LEADS[part] : undefined
  const lead = key ? items.find((i) => i.key === key && !i.done) : undefined
  if (!lead) return items
  const realLeft = items.some((i) => i !== lead && !i.done && !NOT_TASKS.has(i.key))
  return realLeft ? items : [lead, ...items.filter((i) => i !== lead)]
}
