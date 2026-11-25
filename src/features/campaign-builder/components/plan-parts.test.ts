import { describe, expect, it } from 'vitest'
import { PART_ITEMS } from './plan-parts'

// Review 25 Nov, E1 and E2: items planTurnItems makes for a step were dropped by the step's filter.
describe('PART_ITEMS', () => {
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
