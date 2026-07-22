// Campaign domain types — shared across the campaigns workspace (Overview /
// Calendar / Builder). Mirrors the backend campaign JSON
// (GET /api/tenants/{tenantId}/campaigns/{campaignId}).

export interface KPI {
  kpi_id: number
  kpi_name: string
  target_value: string | null
  target_numeric: number | null
  unit: string | null
  hubspot_list_name?: string | null
  brevo_list_name?: string | null
  sort_order?: number
}

export interface LinkedCampaign {
  id: string
  name: string
  status?: string
}

// Ad lifecycle, mirrors the ClickUp task status pipeline (backend AssetStatus).
export type AssetStatus =
  | 'draft'
  | 'in_production'
  | 'ready'
  | 'scheduled'
  | 'live'

export interface Asset {
  asset_id: string
  asset_name: string
  asset_type: string | null
  key_message: string | null
  cta: string | null
  details: Record<string, unknown> | null
  sort_order: number
  // Asset-level budget + flight dates. The channel total = SUM of its assets'
  // budgets; null means "no budget" (e.g. organic) and is excluded from the sum.
  budget: number | null
  budget_period: string | null
  start_date: string | null
  end_date: string | null
  // Campaign-builder → ClickUp → Meta round-trip.
  status?: AssetStatus | null
  destination_type?: string | null // 'website' | 'lead_form'
  final_url?: string | null // UTM'd destination (mirrors ClickUp Tracking Link UTM)
  deliverable_url?: string | null // approved creative Drive link (mirrors ClickUp Final Asset; carousels: one URL per line)
  headline?: string | null // ad headline next to the CTA (defaults to asset name)
  clickup_task_url?: string | null // set once the ad has been pushed to ClickUp
  meta_ad_id?: string | null // set after push-to-Meta
}

export interface ChannelAction {
  action_id: string
  channel: string
  objective: string | null
  strategy: string | null
  action_notes: string | null
  budget: number | null
  budget_period: string | null
  start_date: string | null
  end_date: string | null
  assets: Asset[]
  linked_platform_campaigns?: LinkedCampaign[] | null
}

export interface Phase {
  phase_id: string
  phase_name: string
  sort_order: number
  objective: string | null
  strategy: string | null
  start_date: string | null
  end_date: string | null
  kpis: KPI[]
  channel_actions: ChannelAction[]
}

export interface CampaignDetail {
  campaign_id: string
  campaign_name: string
  client_name: string | null
  status: string
  is_primary: boolean
  start_date: string | null
  end_date: string | null
  budget_total: number | null
  budget_monthly: number | null
  budget_currency: string | null
  channels: string[] | null
  utm_campaign: string | null
  platform_filter: string | null
  google_ads_filter: string | null
  meta_filter: string | null
  brevo_filter: string | null
  clickup_list_id: string | null
  campaign_guide_id: string | null
  objectives: string[]
  phases: Phase[]
}

export interface CampaignSummary {
  campaign_id: string
  campaign_name: string
  client_name: string | null
  status: string
  is_primary: boolean
  channels: string[] | null
  budget_total: number | null
  budget_currency: string | null
  start_date: string | null
  end_date: string | null
}

export type CampaignView = 'overview' | 'calendar' | 'builder'

// ── ClickUp ────────────────────────────────────────────────────────────────

export interface SyncAsset {
  asset_id: string
  asset_name: string
  asset_type: string | null
  synced: boolean
  clickup_task_id: string | null
  clickup_task_url: string | null
}

export interface SyncChannel {
  action_id: string
  channel: string
  channel_label: string
  assets: SyncAsset[]
}

export interface SyncPhase {
  phase_id: string
  phase_name: string
  channels: SyncChannel[]
}

export interface SyncResult {
  campaign_id: string
  campaign_name: string
  client_name: string | null
  clickup_list_id: string | null
  total_assets: number
  matched: number
  unmatched: number
  phases: SyncPhase[]
}

export interface ClickUpError { type: string; error: string }

export interface ClickUpPushResult {
  tasks_created?: number
  tasks_skipped?: number
  errors?: ClickUpError[]
  tasks?: { task_id?: string; task_url?: string }[]
}

export interface ClickUpUpdateResult {
  tasks_updated?: number
  tasks_created?: number
  tasks_deleted?: number
  errors?: ClickUpError[]
}

// push_campaign_ads — one ClickUp task per ad.
export interface ClickUpAdsPushResult {
  ads_created?: number
  ads_updated?: number
  tasks?: { asset_id?: string; task_id?: string; task_url?: string }[]
}

// pull_ready_ads — ads the studio marked Ready to Launch, with what they filled in.
export interface ReadyAd {
  asset_id: string
  task_id: string
  clickup_status: string
  deliverable_url: string | null
  final_url: string | null
}

export interface ClickUpPullResult {
  campaign_id: string
  ready: ReadyAd[]
  count: number
}

// ── Meta push ────────────────────────────────────────────────────────────────

interface MetaStageResult {
  success?: boolean
  message?: string
  error?: string
  data?: { id?: string }
  asset_id?: string
}

export interface MetaPushResult {
  success: boolean
  stage?: string // set on failure: 'campaign' | 'adset'
  campaign?: MetaStageResult
  adset?: MetaStageResult
  ads?: MetaStageResult[]
  ads_created?: number
}

export interface MetaPushAudience {
  advantage_plus: boolean
  countries: string[] | null
  age_min: number | null
  age_max: number | null
  genders: number[] | null // [1] male, [2] female, null all
  interest_seeds: string[]
  behavior_seeds: string[]
  include_custom_audiences: string[]
  exclude_custom_audiences: string[]
}

export interface MetaPushPreview {
  errors: { code: string; message: string }[]
  warnings: string[]
  capabilities: {
    has_pixel: boolean
    pixel_name: string | null
    custom_conversions: { id: string; name: string }[]
  }
  objective: string
  optimization_goal: string
  custom_conversion_id: string | null
  custom_conversion_name: string | null
  lifetime_budget: number | null
  flight_start: string | null
  flight_end: string | null
  campaign_name: string
  reuses_existing: boolean
  audience: MetaPushAudience
  ads: {
    asset_id: string
    name: string
    headline: string
    creative_type: string
    link_url: string
    cards: number | null
  }[]
  meta_push_config: Record<string, unknown> | null
}

export interface MetaAudienceSuggestion {
  interest_seeds: string[]
  behavior_seeds: string[]
  age_min: number
  age_max: number
  genders: number[] | null
  rationale: string
}

export interface ClickUpNode { id: string; name: string }

export interface ChannelConfig {
  hidden: string[]
  custom: { key: string; label: string }[]
}
