import type { Asset } from '../types'

/**
 * Best-effort parser for the builder's PLAN PROPOSAL text (the message that ends
 * "Type yes to save"). It recognizes the prompt-mandated presentation format —
 * phase headings ("Awareness · 2026-08-01 → 2026-08-15") and asset bullets
 * ("**Meta Ads** — Name (carousel): \"copy\" · CTA: … · Flight: … · Budget: …") —
 * so the canvas can show draft previews BEFORE the user confirms the save.
 * Anything that doesn't match is simply skipped; the canvas falls back to
 * appearing at save time. Draft assets are fabricated Asset objects (ids
 * "draft-*") and are never written anywhere.
 */

export interface DraftPhase {
  phase_name: string
  assets: { channel: string; asset: Asset }[]
}

const CHANNEL_KEYS: Record<string, string> = {
  'organic social': 'organic_social',
  'facebook organic': 'organic_social',
  'meta ads': 'meta_ads',
  'google ads': 'google_ads',
  'linkedin ads': 'linkedin_ads',
  linkedin: 'linkedin_ads',
  email: 'email',
}

/** "Awareness · 2026-08-01 → 2026-08-15" (optionally a markdown heading / bold). */
const PHASE_LINE = /^(?:#+\s*)?\*{0,2}([A-Z][A-Za-z][A-Za-z ]{1,24}?)\*{0,2}\s*·\s*\d{4}-\d{2}-\d{2}/
/** "- **Meta Ads** — Name (carousel): rest…" */
const ASSET_LINE =
  /^\s*[-*•]\s*\*{0,2}(Organic Social|Facebook Organic|Meta Ads|Google Ads|LinkedIn Ads|LinkedIn|Email)\*{0,2}\s*[—–-]\s*(.+?)\s*\(([A-Za-z_ ]+)\)\s*:\s*(.+)$/i
/** " · Label: value" separators between the copy and the production fields. */
const FIELD_SPLIT = / · (?=[A-Z][A-Za-z ]{1,18}:\s)/

const stripQuotes = (s: string): string => s.replace(/^["'“]+/, '').replace(/["'”]+$/, '').trim()

const parseAssetRest = (rest: string) => {
  const segments = rest.split(FIELD_SPLIT)
  const copy = stripQuotes(segments[0] ?? '')
  const fields: Record<string, string> = {}
  for (const seg of segments.slice(1)) {
    const m = seg.match(/^([A-Za-z ]{1,18}):\s*(.+)$/)
    if (m) fields[m[1].trim().toLowerCase()] = m[2].trim()
  }
  return { copy, fields }
}

export const parsePlanDraft = (text: string): DraftPhase[] => {
  const phases: DraftPhase[] = []
  let current: DraftPhase | null = null
  let draftIdx = 0

  for (const line of text.split('\n')) {
    const phaseMatch = line.match(PHASE_LINE)
    if (phaseMatch) {
      current = { phase_name: phaseMatch[1].trim(), assets: [] }
      phases.push(current)
      continue
    }
    if (!current) continue

    const assetMatch = line.match(ASSET_LINE)
    if (!assetMatch) continue
    const [, channelLabel, name, type, rest] = assetMatch
    const { copy, fields } = parseAssetRest(rest)
    if (!copy) continue

    const flight = (fields.flight ?? '').match(/(\d{4}-\d{2}-\d{2})\s*(?:to|→|-)\s*(\d{4}-\d{2}-\d{2})/)
    const budgetNum = fields.budget ? parseFloat(fields.budget.replace(/[^\d.]/g, '')) : NaN

    const asset: Asset = {
      asset_id: `draft-${draftIdx++}`,
      asset_name: name.trim(),
      asset_type: type.trim().toLowerCase().replace(/\s+/g, '_'),
      key_message: copy,
      cta: fields.cta ? stripQuotes(fields.cta) : null,
      details: {
        ...(fields.launch ? { launch_date: fields.launch } : {}),
        ...(fields['best time'] ? { optimal_post_time: fields['best time'] } : {}),
      },
      sort_order: draftIdx,
      budget: Number.isFinite(budgetNum) && budgetNum > 0 ? budgetNum : null,
      budget_period: fields.budget ? (/monthly/i.test(fields.budget) ? 'monthly' : 'total') : null,
      start_date: flight?.[1] ?? null,
      end_date: flight?.[2] ?? null,
    }
    current.assets.push({
      channel: CHANNEL_KEYS[channelLabel.toLowerCase()] ?? 'organic_social',
      asset,
    })
  }

  return phases.filter((p) => p.assets.length > 0)
}
