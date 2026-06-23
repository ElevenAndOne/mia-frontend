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

export interface ChannelConfig {
  hidden: string[]
  custom: { key: string; label: string }[]
}
