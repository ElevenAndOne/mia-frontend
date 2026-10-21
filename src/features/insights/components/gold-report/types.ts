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
  /** "standout_creative": one ad against its peers (`without_value` is the peer MEDIAN,
   *  and `without_impressions` are the peers' — never add them to the standout's).
   *  Absent on attribute comparisons ("ads that use the VIDEO format"). */
  kind?: 'standout_creative' | string
  ad_name?: string | null
  best_peer_value?: number | null
  best_peer_ad_name?: string | null
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
  /** Null when the pipeline could not compute it — the row then shows no figure. */
  magnitude: number | null
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

/** A competitor CHANGE EVENT from the pipeline payload (`competitor_findings[]`):
 *  something a rival altered between two snapshots. Legitimately empty for a tenant
 *  whose competitors have only ever been captured once — it is NOT the competitor
 *  list, which reaches the page as prose in `report.competitor_landscape`. */
export interface GoldCompetitorFinding {
  competitor: string
  change_type: string
  detail: string
}

export interface GoldAnalysisDiagnostics {
  creative_evidence?: 'ad_copy' | 'name_only' | 'none' | string
  /** Feeds whose newest row is far behind the snapshot date. */
  stale_feeds?: string[]
  creative_comparisons?: number
  /** ISO code of the tenant's ad currency — every money figure in the payload is in it. */
  currency_iso?: string | null
}

/** How to test a recommendation. Rates are fractions, money is in `currency_iso`. Which
 *  fields are present depends on the kind (a channel test counts clicks and spend). */
export interface GoldActionTest {
  metric?: string
  control_value?: number | null
  target_value?: number | null
  control_creative?: string | null
  impressions_per_version?: number | null
  spend_per_version?: number | null
  min_days?: number | null
  clicks?: number | null
  spend?: number | null
  posts?: number | null
  success_rule?: string | null
  stop_rule?: string | null
  decision_only?: boolean
}

/** One "Do this next" item exactly as the report built it (pipeline
 *  `action_recommendations[]`, section 3). Evidence fields vary by `kind`. */
export interface GoldActionRecommendation {
  kind: string
  priority: number
  basis: 'measured' | 'competitor_observed' | string
  action: string
  test?: GoldActionTest | null
  // replicate_standout
  creative?: string | null
  observed_value?: number | null
  observed_impressions?: number | null
  peer_median_value?: number | null
  best_peer_value?: number | null
  best_peer?: string | null
  peer_creatives?: number | null
  trade_off?: string | null
  /** What sets the creative apart from its peers, as short phrases; empty when nothing does. */
  distinguishing?: string[] | null
  // This creative's cost against its peers' median, in the tenant currency.
  with_cpm?: number | null
  without_cpm?: number | null
  with_cost_per_landing_view?: number | null
  without_cost_per_landing_view?: number | null
  with_cost_per_click?: number | null
  without_cost_per_click?: number | null
  // apply_creative_pattern
  attribute?: string | null
  without_value?: number | null
  with_ads?: number | null
  without_ads?: number | null
  // repeat_organic_outlier
  platform?: string | null
  views?: number | null
  median_views?: number | null
  opening?: string | null
  permalink?: string | null
  // test_competitor_ad_angle / answer_promotion / test_channel_gap / commercial_terms
  competitor?: string | null
  headline?: string | null
  description?: string | null
  days_shown?: number | null
  transparency_link?: string | null
  promotion?: string | null
  uploaded?: string | null
  asset_url?: string | null
  channel?: string | null
  competitors?: string[] | null
  own_threshold?: number | null
  competitor_thresholds?: { name: string; threshold: number }[] | null
}

/** Typed pipeline payload alongside the markdown report (handoff Part C). */
export interface GoldAnalysisPayload {
  structured_recommendations?: GoldStructuredRecommendation[] | null
  creative_findings?: GoldCreativeFinding[] | null
  competitor_findings?: GoldCompetitorFinding[] | null
  diagnostics?: GoldAnalysisDiagnostics | null
  /** Section 3 as built. Older rows get it from diagnostics.recommendations (the backend
   *  moves it here); absent entirely on reports that predate both. */
  action_recommendations?: GoldActionRecommendation[] | null
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

/** One competitor as the report observed it: the lines read off their website, the
 *  claims they make, and the hero image they lead with. Structured by a second pass
 *  over the report's competitor sections (schema v3). */
export interface GoldCompetitorBrand {
  name: string
  source_url: string | null
  taglines: string[]
  claims: string[]
  /** Offer, delivery terms and price points from the pipeline's structured rows. These are
   *  the model's one-line extraction from the page, not verbatim lines — never quote them.
   *  Absent on blocks built by the older LLM pass. */
  terms?: string[]
  hero_image_url: string | null
  /** Every hero image the site leads with (capped), with its alt text. */
  hero_images?: { url: string; alt: string | null }[]
  /** Their ads from the ad libraries. Null when the lookup was unconfirmed or failed —
   *  those say nothing rather than claim ads that may be someone else's. */
  ads?: GoldCompetitorAds | null
  /** The report's promotion signal for this competitor (a new promo image on their site). */
  promotion?: { title: string; uploaded: string | null; url: string | null } | null
  note: string | null
}

export interface GoldCompetitorAd {
  platform: 'Google' | 'Meta' | string
  format: string | null
  /** Verbatim ad copy — may be quoted. */
  headline: string | null
  description: string | null
  days_shown: number | null
  first_shown: string | null
  live: boolean
  link: string | null
}

export interface GoldCompetitorAds {
  status: 'ok' | 'no_ads'
  total: number
  live: number
  items: GoldCompetitorAd[]
}

export interface GoldCompetitorLandscape {
  /** The report's own line about how these competitors were identified and whether
   *  the client confirmed them. Shown verbatim — it is the honesty statement. */
  caveat: string | null
  brands: GoldCompetitorBrand[]
  territory_summary: string | null
  /** Competitors whose website could not be read — named so the picture does not look
   *  complete when it is not. */
  unreadable?: { name: string; reason: string | null }[]
  /** Present only when the client's own site was read and shows no shop, so competitors'
   *  delivery terms are not read as the client's. */
  client_site?: { website: string | null; shows_shop: false } | null
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
  /** The report's competitor sections. Absent on reports structured before v3, and
   *  null for a report (or a tier) with no competitor section. */
  competitor_landscape?: GoldCompetitorLandscape | null
  /** REPORT_SCHEMA generation this rendition was built with (absent = 1). */
  schema_version?: number
}
