// Period-over-period deltas for metric tiles. Pure; no formatting of the base values.

import type { DeltaDirection, DeltaTone, DeltaView } from '../types'
import { formatDecimal, isMissing } from './metric-format'

/** Cost metrics: a fall is good news, so the colour logic flips for these keys. */
export const LOWER_IS_BETTER: ReadonlySet<string> = new Set([
  'cpc',
  'cpm',
  'cpa',
  'cost_per_conversion',
])

/** Changes smaller than this (in % points of the previous value) read as "flat". */
const FLAT_THRESHOLD_PCT = 0.05

export interface Delta {
  /** Percent change vs previous, e.g. 12.5 for +12.5%. null when undefined. */
  changePct: number | null
  direction: DeltaDirection
}

export const computeDelta = (
  current: number | null | undefined,
  previous: number | null | undefined
): Delta => {
  if (isMissing(current) || isMissing(previous) || previous === 0) {
    return { changePct: null, direction: 'flat' }
  }
  const changePct = ((current - previous) / Math.abs(previous)) * 100
  if (Math.abs(changePct) < FLAT_THRESHOLD_PCT) return { changePct: 0, direction: 'flat' }
  return { changePct, direction: changePct > 0 ? 'up' : 'down' }
}

export const deltaTone = (direction: DeltaDirection, lowerIsBetter: boolean): DeltaTone => {
  if (direction === 'flat') return 'neutral'
  const improved = direction === 'up' ? !lowerIsBetter : lowerIsBetter
  return improved ? 'good' : 'bad'
}

/** Magnitude only — the arrow carries the sign. 3.456 → "3.5%", 27.8 → "28%". */
export const formatDeltaLabel = (changePct: number | null): string => {
  if (changePct === null) return '—'
  const abs = Math.abs(changePct)
  return `${formatDecimal(abs, abs < 10 ? 1 : 0)}%`
}

/** Full tile delta for a metric key, or null when it cannot be computed. */
export const buildDelta = (
  metricKey: string,
  current: number | null | undefined,
  previous: number | null | undefined
): DeltaView | null => {
  const delta = computeDelta(current, previous)
  if (delta.changePct === null) return null
  return {
    label: formatDeltaLabel(delta.changePct),
    direction: delta.direction,
    tone: deltaTone(delta.direction, LOWER_IS_BETTER.has(metricKey)),
  }
}
