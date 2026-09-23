export interface BrandGuideExtracted {
  product_name: string | null
  one_liner: string | null
  market: string | null
  target_audience: string | null
  problems_solved: string | null
  key_differentiators: string | null
  brand_voice: string | null
  tone_descriptors: string[] | null
  humour: string | null
  voice_do: string[] | null
  voice_dont: string[] | null
  competitors: string[] | null
  primary_goals: string[] | null
  customer_language: string | null
  proof_points: string | null
  taglines: string[] | null
  imagery_style: string | null
  brand_story: string | null
  certifications: string[] | null
}

export interface GenerateResult {
  success: boolean
  filename: string
  extracted: BrandGuideExtracted
  brand_guide_raw: string
  has_existing: boolean
  existing_filename: string | null
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

export interface WebsiteScanColor {
  name: string | null
  hex: string
  source?: string
}

/** What Mia read off the client's website (Basic "read my website"). Mirrors website_brand_scan.read_website. */
export interface WebsiteScan {
  url: string
  read_at: string | null
  /** Background job state: reading → done | failed. Older summaries have no status. */
  status?: 'reading' | 'done' | 'failed'
  started_at?: string | null
  error?: string | null
  palette?: WebsiteScanColor[]
  fonts?: {
    heading?: string | null
    body?: string | null
    button?: string | null
    google_fonts?: string[]
  }
  visual_style?: string | null
  imagery_style?: string | null
  hero_images?: string[]
  pages_scanned?: string[]
  logo_source_url?: string | null
  voice?: {
    brand_voice?: string | null
    tone_descriptors?: string[] | null
    taglines?: string[] | null
    one_liner?: string | null
    target_audience?: string | null
    imagery_style?: string | null
  }
  voice_committed?: boolean
  facts?: {
    offers?: number
    awards?: number
    history?: number
    events?: number
    news?: number
    services?: number
    pages_read?: number
  }
  facts_error?: string | null
  site_photos?: { seen?: number; new?: number; described?: number }
  voice_error?: string | null
  visual_error?: string | null
  applied?: {
    palette?: boolean
    font_family?: string | null
    imagery_style?: string | null
    logo_asset_id?: string | null
    logo_url?: string | null
  }
}

export interface WebsiteFactsOffer {
  name: string
  price?: string | null
  unit?: string | null
  details?: string | null
  url?: string | null
}

export interface WebsiteFactsEvent {
  name: string
  date?: string | null
  date_text?: string | null
  details?: string | null
  url?: string | null
}

export interface WebsiteFactsNews {
  title: string
  date?: string | null
  summary?: string | null
  url?: string | null
}

/** Structured facts read off the client's website. Mirrors website_facts_service. */
export interface WebsiteFacts {
  read_at?: string | null
  source_url?: string | null
  business_name?: string | null
  what_they_do?: string | null
  location?: {
    address?: string | null
    city?: string | null
    region?: string | null
    country?: string | null
  }
  contact?: { phone?: string | null; email?: string | null; whatsapp?: string | null }
  hours?: string | null
  offers?: WebsiteFactsOffer[]
  services?: string[]
  facilities?: string[]
  awards?: string[]
  history?: string[]
  key_people?: { name: string; role?: string | null }[]
  events?: WebsiteFactsEvent[]
  news?: WebsiteFactsNews[]
  links?: Record<string, string | null>
  social_links?: string[]
  seasonal_notes?: string[]
  audience_segments?: string[]
  pages_read?: { intent: string; url: string }[]
  news_checked_at?: string | null
}

export interface MarketingContext {
  has_context: boolean
  brand_guide_filename: string | null
  brand_guide_extracted: BrandGuideExtracted | null
  manual_overrides: Partial<BrandGuideExtracted>
  platform_snapshot: PlatformSnapshot
  platform_snapshot_updated_at: string | null
  brand_guide_uploaded_at: string | null
  website_scan?: WebsiteScan | null
  website_facts?: WebsiteFacts | null
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
  humour: 'Humour (none / dry / warm / playful)',
  voice_do: 'Voice — do',
  voice_dont: 'Voice — don\'t',
  competitors: 'Competitors',
  primary_goals: 'Primary Goals',
  customer_language: 'Customer Language',
  proof_points: 'Proof Points',
  taglines: 'Taglines',
  imagery_style: 'Imagery Style',
  brand_story: 'Brand Story',
  certifications: 'Certifications',
}

export const ARRAY_FIELDS: Array<keyof BrandGuideExtracted> = [
  'tone_descriptors',
  'voice_do',
  'voice_dont',
  'competitors',
  'primary_goals',
  'taglines',
  'certifications',
]
