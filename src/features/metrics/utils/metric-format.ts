// Number / percent display helpers for the metrics feature.
// Money is NOT formatted here — reuse `formatMoney` from budget-tracker/budget-format.

export const EMPTY_VALUE = '—'

/** `null` means "undefined" in the metrics contract — render a dash, never 0. */
export const isMissing = (value: number | null | undefined): value is null | undefined =>
  value === null || value === undefined || Number.isNaN(value)

export const formatCount = (value: number | null | undefined): string =>
  isMissing(value) ? EMPTY_VALUE : Math.round(value).toLocaleString()

export const formatDecimal = (value: number | null | undefined, maxFractionDigits = 2): string =>
  isMissing(value)
    ? EMPTY_VALUE
    : value.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits })

/** Input is ALREADY a percentage (1.7 → "1.7%"), as /performance returns rates. */
export const formatPercent = (percent: number | null | undefined, maxFractionDigits = 1): string =>
  isMissing(percent) ? EMPTY_VALUE : `${formatDecimal(percent, maxFractionDigits)}%`

/** Input is a FRACTION 0–1 (0.017 → "1.7%"), as /query and /compare return rates. */
export const formatFractionAsPercent = (
  fraction: number | null | undefined,
  maxFractionDigits = 1
): string => (isMissing(fraction) ? EMPTY_VALUE : formatPercent(fraction * 100, maxFractionDigits))

/** Ratios such as ROAS: 2.345 → "2.35×". */
export const formatRatio = (value: number | null | undefined, maxFractionDigits = 2): string =>
  isMissing(value) ? EMPTY_VALUE : `${formatDecimal(value, maxFractionDigits)}×`

/** Short axis-tick form: 1 234 → "1.2k", 3 400 000 → "3.4M". */
export const formatCompact = (value: number | null | undefined): string => {
  if (isMissing(value)) return EMPTY_VALUE
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${formatDecimal(abs / 1e9, 1)}B`
  if (abs >= 1e6) return `${sign}${formatDecimal(abs / 1e6, 1)}M`
  if (abs >= 1e3) return `${sign}${formatDecimal(abs / 1e3, 1)}k`
  return formatDecimal(value, abs < 10 ? 1 : 0)
}
