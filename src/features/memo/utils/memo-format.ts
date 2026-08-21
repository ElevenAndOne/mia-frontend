import type { MemoDisclosure, MemoEvidence } from '../types'

export const KIND_LABEL: Record<string, string> = {
  grow: 'Grow',
  optimise: 'Optimise',
  protect: 'Protect',
  info: 'Info',
  optimize: 'Optimise',  // US spelling written before the switch
  // Rows written before the Grow/Optimize/Protect rename. Kept so history renders
  // rather than showing an empty chip — decided cards live on the memo for weeks.
  scale: 'Grow',
  kill: 'Optimise',
  fix: 'Optimise',
}

/** Legacy kinds map onto the current three for colour and ordering. */
export const normalizeKind = (kind: string): string =>
  ({ scale: 'grow', kill: 'optimise', fix: 'optimise', optimize: 'optimise' })[kind] ?? kind

export const PLATFORM_LABEL: Record<string, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  tiktok_ads: 'TikTok Ads',
  linkedin_ads: 'LinkedIn Ads',
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
    const gradedOnRoas = evidence.basis === 'roas'
    if (gradedOnRoas && r.roas !== null && r.roas !== undefined)
      parts.push(`ROAS ${fmt(r.roas)}x`)
    else if (r.cost_per_result !== null && r.cost_per_result !== undefined)
      parts.push(`${fmt(r.cost_per_result)} / ${label}`)
    if (evidence.spend_share !== null && evidence.spend_share !== undefined)
      parts.push(`${(evidence.spend_share * 100).toFixed(0)}% of account spend`)
    return `Last ${days} days: ${parts.join(' · ')}`
  }
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

/** "9 live campaigns across Google Ads & Meta Ads · ZAR 28,400 spent" — what the
 *  memo actually looked at, so the reader can judge how much it saw. */
export const summariseReviewed = (
  memo: { graded_campaigns?: number; platforms?: string[]; reviewed_spend?: number } | null | undefined,
  currency = 'ZAR',
): string | null => {
  if (!memo?.graded_campaigns) return null
  const platforms = (memo.platforms ?? []).join(' & ')
  const where = platforms ? ` across ${platforms}` : ''
  const spend = memo.reviewed_spend ? ` · ${money(memo.reviewed_spend, currency)} spent` : ''
  return `${memo.graded_campaigns} live campaign${memo.graded_campaigns === 1 ? '' : 's'} reviewed${where}${spend}`
}
