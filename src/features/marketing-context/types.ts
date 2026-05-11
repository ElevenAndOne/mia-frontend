export interface BrandGuideExtracted {
  product_name: string | null
  one_liner: string | null
  market: string | null
  target_audience: string | null
  problems_solved: string | null
  key_differentiators: string | null
  brand_voice: string | null
  tone_descriptors: string[] | null
  competitors: string[] | null
  primary_goals: string[] | null
  customer_language: string | null
  proof_points: string | null
}

export interface PlatformSnapshot {
  brevo?: {
    campaigns_sent_30d: number | null
    avg_open_rate: number | null
    avg_click_rate: number | null
  }
  meta?: {
    total_spend_30d: number | null
    avg_roas: number | null
    avg_ctr_pct: number | null
  }
  google_ads?: {
    total_spend_30d: number | null
    avg_roas: number | null
    avg_ctr_pct: number | null
  }
  hubspot?: {
    open_deals: number | null
    total_deals: number | null
    avg_deal_value: number | null
  }
  ga4?: {
    sessions_30d: number | null
    conversion_rate_pct: number | null
    top_source: string | null
  }
  [key: string]: Record<string, number | string | null> | undefined
}

export interface MarketingContext {
  has_context: boolean
  brand_guide_filename: string | null
  brand_guide_extracted: BrandGuideExtracted | null
  manual_overrides: Partial<BrandGuideExtracted>
  platform_snapshot: PlatformSnapshot
  platform_snapshot_updated_at: string | null
  brand_guide_uploaded_at: string | null
}

export interface UploadResult {
  success: boolean
  filename: string
  extracted: BrandGuideExtracted
  brand_guide_raw: string
}

export const FIELD_LABELS: Record<keyof BrandGuideExtracted, string> = {
  product_name: 'Brand / Product Name',
  one_liner: 'One-Liner Description',
  market: 'Primary Market',
  target_audience: 'Target Audience',
  problems_solved: 'Problems Solved',
  key_differentiators: 'Key Differentiators',
  brand_voice: 'Brand Voice',
  tone_descriptors: 'Tone Descriptors',
  competitors: 'Competitors',
  primary_goals: 'Primary Goals',
  customer_language: 'Customer Language',
  proof_points: 'Proof Points',
}

export const ARRAY_FIELDS: Array<keyof BrandGuideExtracted> = [
  'tone_descriptors',
  'competitors',
  'primary_goals',
]
