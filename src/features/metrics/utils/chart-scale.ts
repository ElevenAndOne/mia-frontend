// Pure scale helpers for hand-written SVG charts: nice ticks, linear scales,
// evenly spaced x positions, path building with gaps, and label thinning.

export interface Extent {
  min: number
  max: number
}

/** Round a raw step up to a "nice" 1 / 2 / 2.5 / 5 / 10 × 10^n value. */
export const niceStep = (rawStep: number): number => {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalised = rawStep / magnitude
  const nice =
    normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10
  return nice * magnitude
}

const roundTo = (value: number, step: number): number => {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1)
  return Number(value.toFixed(decimals))
}

/** Nice tick values covering [min, max]. Always returns at least two ticks. */
export const niceTicks = (min: number, max: number, count = 4): number[] => {
  const lo = Number.isFinite(min) ? min : 0
  const hi = Number.isFinite(max) && max > lo ? max : lo + 1
  const step = niceStep((hi - lo) / Math.max(1, count))
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let t = start; t <= end + step / 2; t += step) ticks.push(roundTo(t, step))
  return ticks.length >= 2 ? ticks : [roundTo(start, step), roundTo(start + step, step)]
}

/** Map a domain value onto a pixel range. Degenerate domains map to the range midpoint. */
export const linearScale =
  (domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) =>
  (value: number): number => {
    if (domainMax === domainMin) return (rangeMin + rangeMax) / 2
    return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin)
  }

/** Evenly spaced x positions for `count` points between left and right (inclusive). */
export const xPositions = (count: number, left: number, right: number): number[] => {
  if (count <= 0) return []
  if (count === 1) return [(left + right) / 2]
  return Array.from({ length: count }, (_, i) => left + (i / (count - 1)) * (right - left))
}

/** Min/max across all provided values; positive-only data is floored at 0. */
export const valuesExtent = (values: Array<number | null | undefined>): Extent | null => {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v === null || v === undefined || !Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min === Infinity) return null
  return { min: min > 0 ? 0 : min, max }
}

/** SVG path through points; `null` entries break the line (a gap for missing data). */
export const linePath = (points: Array<{ x: number; y: number } | null>): string => {
  let path = ''
  let penDown = false
  for (const p of points) {
    if (!p) {
      penDown = false
      continue
    }
    const x = Number(p.x.toFixed(2))
    const y = Number(p.y.toFixed(2))
    path += `${penDown ? 'L' : 'M'}${x} ${y} `
    penDown = true
  }
  return path.trim()
}

/** Indices to label on a crowded axis: first, last, and evenly spaced ones between. */
export const thinIndices = (count: number, maxLabels: number): number[] => {
  if (count <= 0) return []
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i)
  const every = Math.ceil((count - 1) / Math.max(1, maxLabels - 1))
  const picked: number[] = []
  for (let i = 0; i < count; i += every) picked.push(i)
  if (picked[picked.length - 1] !== count - 1) {
    // Drop a last pick that would crowd the final label, then always show the last.
    if (count - 1 - picked[picked.length - 1] < every / 2) picked.pop()
    picked.push(count - 1)
  }
  return picked
}
