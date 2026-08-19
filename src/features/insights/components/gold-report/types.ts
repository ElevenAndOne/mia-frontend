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

export interface GoldDeliverable {
  name: string
  title: string
  objective: string
  creative_direction: string[]
  strategy: string
  expected_impact: { kpi: string; direction: 'up' | 'down'; explanation: string }[]
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
}
