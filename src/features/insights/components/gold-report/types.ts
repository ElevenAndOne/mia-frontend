// Mirrors REPORT_SCHEMA in mia-backend services/gold_report_structuring.py

export interface GoldStatCallout {
  label: string
  stats: { value: string; comparison: string | null }[]
}

export interface GoldInsight {
  category: string
  /** 1-based rank among the model's ranked drivers; null for exceptions/caveats. */
  driver_rank: number | null
  title: string
  body: string
  kpis: string[]
  aside: string | null
  stat_callout: GoldStatCallout | null
}

export interface GoldRecommendation {
  id: string
  tag: string
  title: string
  body: string
  prediction: string
}

/** The report's "Grounded In" block: what real evidence a deliverable is modelled
 *  on — or the honest statement that none was retrieved and it rests on category
 *  best practice. Absent on reports structured before schema v2. */
export interface GoldGroundedIn {
  basis: 'campaign_copy' | 'category_best_practice' | 'unknown'
  /** Verbatim quoted ad/post copy, quotation marks included. */
  evidence: string | null
  note: string | null
}

export interface GoldDeliverable {
  name: string
  title: string
  objective: string
  creative_direction: string[]
  strategy: string
  expected_impact: { kpi: string; direction: 'up' | 'down'; explanation: string }[]
  grounded_in?: GoldGroundedIn | null
}

/** Measured comparison between the client's own ads at ad grain — no model
 *  involved (pipeline payload `creative_findings[]`). Phrase these as observed
 *  differences, never causally: ads differ in several ways at once. */
export interface GoldCreativeFinding {
  attribute: string
  metric: string
  with_value: number
  without_value: number
  relative_gap: number
  with_ads: number
  without_ads: number
  with_impressions: number
  without_impressions: number
  direction: 'better' | 'worse' | string
  metric_direction: 'higher_is_better' | 'lower_is_better'
  evidence_basis: 'measured' | 'model' | string
}

/** One ranked driver from the pipeline's typed payload (`structured_recommendations[]`).
 *  Verified against prod 2026-09-04. Two traps the data team called out explicitly:
 *  `beats_portfolio_average` — NOT the sign of `magnitude` — decides good/bad colouring,
 *  because beating a cost metric means coming in below average; and `magnitude_kind`
 *  says what the number means, so the two kinds must never share an axis.
 *  `platform_scoped` / `applies_to_platform` are in the spec but absent from the rows
 *  the pipeline writes today, so anything platform-specific stays unlabelled. */
export interface GoldStructuredRecommendation {
  driver: string
  magnitude: number
  magnitude_kind: 'pct_vs_portfolio_average' | 'share_of_model_importance_pct' | string
  metric_direction: 'higher_is_better' | 'lower_is_better' | string
  beats_portfolio_average: boolean | null
  evidence_basis: 'measured' | 'model' | string
  model_evidence: 'strong' | 'moderate' | 'weak' | 'unknown' | string
  /** Intentionally null on measured campaign rows — render as absent, never zero. */
  confidence: number | null
  as_of_date: string | null
  source?: string | null
  /** Legacy field: literally "increase" on every row. Superseded by the pair above. */
  direction?: string
  platform_scoped?: boolean
  applies_to_platform?: string | null
}

export interface GoldAnalysisDiagnostics {
  creative_evidence?: 'ad_copy' | 'name_only' | 'none' | string
  /** Feeds whose newest row is far behind the snapshot date. */
  stale_feeds?: string[]
  creative_comparisons?: number
}

/** Typed pipeline payload alongside the markdown report (handoff Part C). */
export interface GoldAnalysisPayload {
  structured_recommendations?: GoldStructuredRecommendation[] | null
  creative_findings?: GoldCreativeFinding[] | null
  diagnostics?: GoldAnalysisDiagnostics | null
}

export interface GoldEmailDigest {
  subject: string
  preview_text: string
  headline: string
  stat_tiles: { label: string; value: string; note: string }[]
  next_steps_short: string[]
  insights_teaser: string
  deliverables_teaser: string
}

/** A real post behind the report's numbers (organic tier), with permalink. */
export interface GoldTopPost {
  platform: string
  published_at: string | null
  views: number
  reach: number
  engagements: number
  engagement_rate_pct: number | null
  text: string
  permalink: string | null
}

/** Paid tier: real campaign metrics fetched from the ad platforms, not restated
 *  from the report. Blended figures are aggregate-first (spend ÷ clicks). */
export interface GoldCampaignEvidence {
  window: { since: string; until: string; days: number }
  portfolio: {
    currency: string
    campaigns: number
    impressions: number
    clicks: number
    spend: number
    blended_ctr_pct: number | null
    blended_cpc: number | null
    blended_cpm: number | null
    basis: string
  }
  campaigns: {
    name: string
    platform: string
    impressions: number
    clicks: number
    spend: number
    ctr_pct: number | null
    cpc: number | null
    cpm: number | null
  }[]
  shown_of: number
}

export interface StructuredGoldReport {
  intro: string | null
  executive_summary: {
    headline: string
    narrative: string
    highlighted_campaigns: string[]
    next_steps: string[]
  }
  insights: GoldInsight[]
  recommendations: GoldRecommendation[]
  deliverables: GoldDeliverable[]
  /** Condensed scannable rendition — powers the summary email AND the page's
   *  at-a-glance hero. Absent on reports structured before it existed. */
  email_digest?: GoldEmailDigest | null
  /** REPORT_SCHEMA generation this rendition was built with (absent = 1). */
  schema_version?: number
}
