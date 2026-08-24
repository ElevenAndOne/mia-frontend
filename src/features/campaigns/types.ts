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

// ── Linked content ─────────────────────────────────────────────────────────
// One review surface for the whole campaign: every phase × channel with what is
// already linked and what the phase dates suggest adding.

export interface LinkedContentCandidate extends LinkedCampaign {
  linked: boolean
  suggested: boolean
  dismissed: boolean
  reason: string | null
  starts_at?: string | null
  ends_at?: string | null
  published_at?: string | null
  impressions?: number
  engagements?: number
  // LinkedIn returns no statistics for posts outside its rolling 12-month window,
  // which looks identical to a post that genuinely got nothing.
  has_stats?: boolean
}

export interface LinkedContentChannel {
  action_id: string
  channel: string
  window_start: string | null
  window_end: string | null
  supports_auto_suggest: boolean
  linked_count: number
  unreviewed_count: number
  message: string | null
  candidates: LinkedContentCandidate[]
  // How many the platform returned vs how many are in this payload. Suggested and
  // already-linked items are never trimmed; a busy Page's back catalogue is.
  candidates_available: number
  candidates_truncated: boolean
}

export interface LinkedContentPhase {
  phase_id: string
  phase_name: string
  start_date: string | null
  end_date: string | null
  channels: LinkedContentChannel[]
}

export interface LinkedContent {
  campaign_id: string
  campaign_name: string
  phases: LinkedContentPhase[]
  summary: { linked_total: number; unreviewed_total: number }
  notes: string[]
}

export interface LinkedContentSave {
  action_id: string
  linked: LinkedCampaign[]
  dismissed: LinkedCampaign[]
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
  // Google Search: asset = one ad group (keyword theme) with its own RSA.
  google_ad_group_id?: string | null // set after push-to-Google
  google_ad_id?: string | null
  rsa_headlines?: RsaText[] | null // 3-15, each ≤30 chars
  rsa_descriptions?: RsaText[] | null // 2-4, each ≤90 chars
  rsa_path1?: string | null // ≤15 chars display path
  rsa_path2?: string | null
  keywords?: KeywordSpec[] | null
  source_conversation_id?: string | null // builder chat that created this asset ("open original chat")
}

export interface RsaText {
  text: string
  pinned_field?: string // HEADLINE_1 | HEADLINE_2 | HEADLINE_3
}

export interface KeywordSpec {
  text: string
  match: 'BROAD' | 'PHRASE' | 'EXACT'
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
  ga4_property_id?: string | null // per-campaign override; null = workspace primary property
  ga4_property_name?: string | null
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

// One launch-readiness check from a push preflight (backend utils/push_checks).
// Blocking problems and advisory warnings are the same shape — `severity` is the
// only difference — so a check can be counted, grouped by `target`, and (once
// persisted) waived by code.
// severity is the check's answer, and every check gives one:
//   block   stops the push        warn   a judgement call, acceptable on the record
//   info    a note, not a verdict unknown we couldn't find out — NOT a pass
//   pass    checked, fine
export type CheckSeverity = 'block' | 'warn' | 'info' | 'unknown' | 'pass'

export interface PushCheck {
  code: string
  severity: CheckSeverity
  message: string
  target: { level: 'asset' | 'channel' | 'account' | 'campaign'; names: string[]; ids: string[] } | null
  // Set when someone has accepted this warning (blockers are never waivable).
  waived?: { by: string; user_id: string | null; at: string | null; reason: string | null } | null
}

// ── Launch readiness (persisted preflight checks) ─────────────────────────

export interface LaunchCheckSnapshot {
  id: string
  campaign_id: string
  action_id: string
  platform: 'meta' | 'google'
  // check = someone asked "is this ready?"; push = the state we launched on.
  triggered_by: 'check' | 'push'
  workflow_id: string | null
  checks: PushCheck[]
  blocking_count: number
  warning_count: number
  waived_count: number
  unknown_count: number
  passed_count: number
  checked_by: { user_id: string | null; name: string | null; email: string | null }
  checked_at: string | null
}

export interface LaunchReadinessChannel {
  action_id: string
  channel: string
  platform: 'meta' | 'google'
  phase_name: string
  snapshot: LaunchCheckSnapshot | null
}

export interface CampaignLaunchReadiness {
  campaign_id: string
  campaign_name: string
  totals: {
    blocking: number
    warnings: number
    waived: number
    unknown: number
    passed: number
    unchecked: number
  }
  channels: LaunchReadinessChannel[]
}

export interface LaunchCheckWaiver {
  id: string
  action_id: string
  platform: string
  code: string
  message: string | null
  reason: string | null
  waived_by: { user_id: string | null; name: string | null; email: string | null }
  waived_at: string | null
  revoked_at: string | null
  revoked_by: string | null
}

export interface MetaPushPreview {
  errors: PushCheck[]
  /** Message strings — kept as-is so an older bundle can still render them.
   *  The typed rows (with severity, target and waivers) are on the snapshot. */
  warnings: string[]
  capabilities: {
    has_pixel: boolean
    pixel_name: string | null
    custom_conversions: { id: string; name: string }[]
  }
  objective: string
  optimization_goal: string
  default_cta: string
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

// ---- Google Ads push (mirrors the Meta shapes above; docs/GOOGLE_PUSH_PLAN.md) ----

export interface GooglePushAdGroup {
  asset_id: string
  name: string
  keywords: KeywordSpec[]
  headlines: RsaText[]
  descriptions: RsaText[]
  path1: string | null
  path2: string | null
  final_url: string | null
  problems: string[] // per-ad-group validation problems, incl. "no keywords"
}

export interface GooglePushPreview {
  errors: PushCheck[]
  /** Message strings — kept as-is so an older bundle can still render them.
   *  The typed rows (with severity, target and waivers) are on the snapshot. */
  warnings: string[]
  capabilities: {
    conversion_actions: { name: string; primary: boolean }[]
    shared_negative_lists: { name: string; member_count: number }[]
    auto_tagging: boolean | null
    tracking_url_template: string | null
  }
  campaign_name: string
  daily_budget: number | null
  bidding_strategy: string // MAXIMIZE_CONVERSIONS | TARGET_SPEND | MANUAL_CPC
  target_cpa: number | null
  countries: string[]
  networks: { search_partners: boolean }
  negative_keywords: string[]
  shared_negative_lists: string[]
  flight_start: string | null
  flight_end: string | null // null = always-on (daily budget, no stop)
  reuses_existing: boolean
  ad_groups: GooglePushAdGroup[]
  google_push_config: Record<string, unknown> | null
}

// The Google push is ONE atomic mutate — all-or-nothing, no per-stage failures.
export interface GooglePushResult {
  success: boolean
  message?: string
  error?: string
  data?: {
    campaign_id?: string
    operations?: number
    ad_groups?: { asset_id: string; ad_group_id: string; ad_id: string }[]
  }
  writeback?: { assets_scheduled?: string[] }
}

export interface GoogleSearchSuggestion {
  assets: {
    asset_id: string
    keywords: KeywordSpec[]
    headlines: RsaText[]
    descriptions: RsaText[]
    path1: string | null
    path2: string | null
  }[]
}

export interface ClickUpNode { id: string; name: string }

// ── Google Drive creative picker ─────────────────────────────────────────

export interface DriveFile {
  id: string
  name: string
  mime_type: string
  thumbnail_url: string
  download_url: string
  width?: number | null
  height?: number | null
}

export interface DriveFolderListing {
  folder_id: string
  folder_name: string
  folders: { id: string; name: string; mime_type: string }[]
  images: DriveFile[]
  videos: DriveFile[]
  other_count: number
}

export interface ChannelConfig {
  hidden: string[]
  custom: { key: string; label: string }[]
}
