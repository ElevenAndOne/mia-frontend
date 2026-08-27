import type { MemoEvidence, MemoRecommendation } from '../types'
import { money } from './memo-format'

/** One cell of a card's metric strip. Same four slots on every row, so the eye
 *  can compare findings down the column instead of re-reading each sentence. */
export interface MemoMetric {
  label: string
  value: string
  tone?: 'bad' | 'good'
}

/** The figure on the right: what this decision is worth, stated once. */
export interface MemoValue {
  label: string
  amount: string
  tone: 'good' | 'muted'
}

const n = (v: number | null | undefined, dp = 0): string =>
  v === null || v === undefined
    ? '—'
    : v.toLocaleString(undefined, { maximumFractionDigits: dp })

const plural = (label: string): string =>
  label.endsWith('s') ? label : `${label}s`

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

const planMetrics = (e: MemoEvidence, currency: string): MemoMetric[] => {
  const out: MemoMetric[] = [
    { label: 'Allocated', value: money(e.total_allocation, currency) },
    {
      label: 'Spent',
      value: money(e.spent, currency),
      tone: !e.spent ? 'bad' : undefined,
    },
  ]
  if (e.over_allocated)
    out.push({ label: 'Over by', value: money(e.over_by, currency), tone: 'bad' })
  if (e.pacing_pct !== null && e.pacing_pct !== undefined)
    // pacing_pct is the deviation from the plan's expected burn, not % of budget spent
    out.push({ label: 'vs plan', value: `${e.pacing_pct > 0 ? '+' : ''}${n(e.pacing_pct)}%`, tone: 'bad' })
  return out.slice(0, 4)
}

const wasteMetrics = (e: MemoEvidence, currency: string): MemoMetric[] => [
  { label: 'Terms', value: String((e.terms ?? []).length) },
  { label: 'Wasted', value: money(e.waste, currency), tone: 'bad' },
  { label: 'Window', value: `${e.recent_days ?? 14} days` },
]

/** Campaign findings: spend, outcomes, unit cost, and how that compares. */
const campaignMetrics = (e: MemoEvidence, currency: string): MemoMetric[] => {
  const r = e.recent
  if (!r) return []
  const label = r.result_label ?? 'result'
  const median = e.account_median_cpr ?? null
  const out: MemoMetric[] = [
    { label: `Spend ${e.recent_days ?? 14}d`, value: money(r.spend, currency) },
    { label: capitalise(plural(label)), value: n(r.results ?? r.conversions) },
  ]

  if (e.basis === 'roas' && r.roas !== null && r.roas !== undefined) {
    out.push({ label: 'ROAS', value: `${n(r.roas, 1)}×`, tone: r.roas >= 1 ? 'good' : 'bad' })
    if (e.prior?.roas !== null && e.prior?.roas !== undefined)
      out.push({ label: 'Was', value: `${n(e.prior.roas, 1)}×` })
    return out.slice(0, 4)
  }

  const cost = r.cost_per_result
  out.push({
    label: `Cost / ${label}`,
    value: money(cost, currency),
    tone: median && cost && cost > median ? 'bad' : undefined,
  })

  // Protect earns a "was" column — the whole finding is the change against its
  // own past, not against its peers. Everything else compares to the median.
  const prior = e.prior?.cost_per_result
  if (e.basis !== 'roas' && prior !== null && prior !== undefined && cost && prior && cost > prior)
    out.push({ label: 'Was', value: money(prior, currency) })
  else if (median && cost)
    out.push({ label: 'vs median', value: `${n(cost / median, 1)}×`, tone: cost > median ? 'bad' : 'good' })

  return out.slice(0, 4)
}

export const metricsFor = (rec: MemoRecommendation, currency: string): MemoMetric[] => {
  const e = rec.evidence
  if (!e) return []
  // Organic findings ship their own strip — the backend computed it in the
  // finding's own units (views, posts, days), so there is nothing to derive here.
  if (e.organic) return (e.metrics ?? []).slice(0, 4)
  if (e.basis === 'plan') return planMetrics(e, currency)
  if (e.basis === 'wasted_search_terms') return wasteMetrics(e, currency)
  return campaignMetrics(e, currency)
}

export const valueFor = (
  rec: MemoRecommendation,
  currency: string,
): MemoValue | null => {
  const e = rec.evidence
  if (!e) return null
  if (e.organic)
    return e.value_text && e.value_label
      ? { label: e.value_label, amount: e.value_text, tone: rec.kind === 'grow' ? 'good' : 'muted' }
      : null
  if (e.impact !== null && e.impact !== undefined)
    return {
      label: rec.kind === 'grow' ? 'Est. gain' : 'Waste removed',
      amount: `${rec.kind === 'grow' ? '+' : ''}${money(e.impact, currency)}/mo`,
      tone: 'good',
    }
  const note = (e.impact_notes ?? [])[0]
  if (note) return { label: 'Est. gain', amount: note, tone: 'good' }
  // Protect claims no saving on purpose — it states the spend it is defending.
  if (rec.kind === 'protect' && e.stake)
    return { label: 'Spend at risk', amount: `${money(e.stake, currency)}/mo`, tone: 'muted' }
  return null
}
