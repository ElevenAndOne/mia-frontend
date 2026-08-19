import type { MemoDisclosure, MemoEvidence, MemoRecKind } from '../types'

export const KIND_LABEL: Record<MemoRecKind, string> = {
  scale: 'Scale',
  kill: 'Kill',
  fix: 'Fix',
  info: 'Info',
}

export const PLATFORM_LABEL: Record<string, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
}

const fmt = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—'
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

/** Money formatted with the workspace's currency label. */
export const money = (value: number | null | undefined, currency = 'ZAR'): string =>
  value === null || value === undefined ? '—' : `${currency} ${fmt(value)}`

/** One-line evidence summary under a graded recommendation card. */
export const evidenceSummary = (evidence: MemoEvidence | null): string | null => {
  if (!evidence) return null
  const r = evidence.recent
  if (r) {
    const days = evidence.recent_days ?? 14
    const label = r.result_label ?? 'result'
    const count = r.results ?? r.conversions
    const parts = [`${fmt(r.spend)} spend`, `${fmt(count)} ${label}s`]
    if (r.roas !== null && r.roas !== undefined) parts.push(`ROAS ${fmt(r.roas)}x`)
    else if (r.cost_per_result !== null && r.cost_per_result !== undefined)
      parts.push(`${fmt(r.cost_per_result)} / ${label}`)
    if (evidence.spend_share !== null && evidence.spend_share !== undefined)
      parts.push(`${(evidence.spend_share * 100).toFixed(0)}% of account spend`)
    return `Last ${days} days: ${parts.join(' · ')}`
  }
  return null
}

/** The big number on a card: what approving is worth, per month. */
export const impactLine = (
  evidence: MemoEvidence | null | undefined,
  currency = 'ZAR',
): { value: string; label: string } | null => {
  if (!evidence) return null
  const label = 'est. per month'
  if (evidence.impact !== null && evidence.impact !== undefined)
    return { value: `+${money(evidence.impact, currency)}`, label }
  const note = (evidence.impact_notes ?? [])[0]
  if (note) return { value: note.replace('/mo', ''), label }
  return null
}

/** What the memo deliberately left out, stated plainly — never silent truncation. */
export const heldBackLines = (
  disclosure: MemoDisclosure | null | undefined,
  currency = 'ZAR',
): string[] => {
  if (!disclosure) return []
  const lines: string[] = []
  if (disclosure.held_back > 0)
    lines.push(
      `${disclosure.held_back} further finding${disclosure.held_back === 1 ? '' : 's'} ranked below this week's cut, covering ${money(disclosure.held_back_stake, currency)}/mo of spend.`,
    )
  if (disclosure.immaterial)
    lines.push(
      `${disclosure.immaterial} campaign${disclosure.immaterial === 1 ? '' : 's'} showed a signal but too little of the account's spend to be worth a call.`,
    )
  if (disclosure.plan_cards_held_back)
    lines.push(`${disclosure.plan_cards_held_back} further campaign plan(s) need attention.`)
  return lines
}

/** Human description of what Approve will execute. */
export const actionSummary = (
  actionType: string | null,
  params: Record<string, unknown> | null,
): string | null => {
  if (!actionType) return null
  if (actionType.includes('pause')) return 'pause this campaign — you can switch it back on any time'
  if (actionType.includes('negative_keywords')) {
    const count = Array.isArray(params?.keywords) ? params.keywords.length : 0
    return count
      ? `stop these ${count} search terms from showing your ads`
      : 'exclude the wasted search terms'
  }
  if (actionType.includes('budget')) {
    const pct = params?.mode === 'increase_pct' ? params?.value : null
    return pct ? `raise the daily budget by ${String(pct)}%` : 'update the budget'
  }
  return actionType.replaceAll('_', ' ')
}
