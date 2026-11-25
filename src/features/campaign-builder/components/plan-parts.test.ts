import { describe, expect, it } from 'vitest'
import { PART_ITEMS, type PlanPart } from './plan-parts'
import planTab from './plan-tab.tsx?raw'

const PARTS = Object.keys(PART_ITEMS) as PlanPart[]

// The "Your turn" keys planTurnItems makes, read from its source so a key added later is checked too. A key written as
// a template (`blocker-${k}`) is checked by its fixed start. Keys that start with a value (`${x.job}-…`) belong to the
// one-at-a-time entries inside an item, not to items, so they're not step items and are left out.
function turnKeys(): string[] {
  const start = planTab.indexOf('function planTurnItems(')
  const end = planTab.indexOf('\nfunction ', start + 1)
  const body = planTab.slice(start, end)
  const keys = new Set<string>()
  for (const m of body.matchAll(/\bkey: (?:'([^']+)'|`([^`$]+)\$\{)/g)) keys.add(m[1] ?? `${m[2]}x`)
  return [...keys]
}

// Review 25 Nov, E1 and E2: items planTurnItems makes for a step were dropped by the step's filter.
describe('PART_ITEMS', () => {
  it('finds the keys planTurnItems makes', () => {
    // a guard on the scan itself: if it ever finds next to nothing, the test below would pass for nothing
    const keys = turnKeys()
    expect(keys.length).toBeGreaterThan(20)
    expect(keys).toContain('approve')
    expect(keys).toContain('blocker-x')
  })
  it('keeps every key planTurnItems makes on at least one step', () => {
    const dropped = turnKeys().filter((k) => !PARTS.some((p) => PART_ITEMS[p](k)))
    expect(dropped).toEqual([])
  })
  it('keeps "Mia is checking" on Check & approve', () => {
    expect(PART_ITEMS.check('mia-working')).toBe(true)
  })
  it('keeps "no job makes" and "no jobs" where they are made', () => {
    for (const part of ['jobs', 'check'] as const) {
      expect(PART_ITEMS[part]('uncovered')).toBe(true)
      expect(PART_ITEMS[part]('no-jobs')).toBe(true)
    }
  })
  it('still keeps a step to its own items', () => {
    expect(PART_ITEMS.questions('approve')).toBe(false)
    expect(PART_ITEMS.targets('uncovered')).toBe(false)
  })
})
