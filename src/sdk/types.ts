/**
 * SDK Type Definitions
 */

// ============= Core Types =============

export interface SDKConfig {
  baseURL?: string
  sessionId?: string
  debug?: boolean
}

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
}

// ============= Auth Types =============

export interface AuthUser {
  email: string
  isAuthenticated: boolean
  needsSetup?: boolean
}

export interface GoogleAuthStatus {
  authenticated: boolean
  user_info?: {
    email: string
    name?: string
    picture?: string
  }
}

export interface MetaUserInfo {
  id: string
  name: string
  email?: string
}

export interface MetaAuthStatus {
  authenticated: boolean
  user_info?: MetaUserInfo
}

// ============= Account Types =============

export interface RawGoogleAdsAccount {
  customer_id: string
  resource_name: string
  descriptive_name: string
  error?: string
}

export interface RawGA4Property {
  property_id: string
  display_name: string
  name: string
  currency_code: string
  time_zone: string
  account_id: string
  account_display_name: string
}

export interface GoogleAdsAccount {
  id: string
  name: string
  customer_id: string
  display_name: string
  raw_data: RawGoogleAdsAccount
  hasMatchingGA4?: boolean
}

export interface GA4Account {
  id: string
  name: string
  property_id: string
  display_name: string
  raw_data: RawGA4Property
  hasMatchingAds?: boolean
}

export interface CombinedAccount {
  id: string
  name: string
  google_ads_id: string
  ga4_property_id: string
  display_name: string
  ads_data: RawGoogleAdsAccount
  ga4_data: RawGA4Property
}

export interface AccountCollections {
  googleAds: GoogleAdsAccount[]
  ga4: GA4Account[]
  combined: CombinedAccount[]
}

export interface AccountMappingRecord {
  id: number
  account_id: string
  account_name: string
  google_ads_id: string
  ga4_property_id: string
  business_type: string
  is_active: boolean
  sort_order: number
}

// ============= Meta Ads Types =============

export interface MetaAdsAccount {
  id: string
  name: string
  account_id: string
  currency: string
  timezone_name: string
  account_status: number
}

export interface CampaignMetrics {
  impressions: number
  clicks: number
  spend: number
  reach: number
  frequency: number
  ctr: number
  cpc: number
  cpm: number
  cpp: number
  actions?: Array<{ action_type: string; value: string }>
}

export interface MetaCampaign {
  id: string
  name: string
  status: string
  objective: string
  daily_budget?: number
  lifetime_budget?: number
  metrics?: CampaignMetrics
}

export interface MetaAdSet {
  id: string
  name: string
  status: string
}

export interface MetaAd {
  id: string
  name: string
  status: string
}

// ============= Analytics Types =============

export interface AnalyticsRequest {
  question: string
  context: string
  session_id: string
  user_id?: string
  selected_account?: GoogleAdsAccount | GA4Account | CombinedAccount
  google_ads_id?: string
  ga4_property_id?: string
  start_date?: string
  end_date?: string
  category?: string
}

export interface InsightsRequest {
  session_id: string
  date_range: string
}

export interface InsightsResponse {
  success: boolean
  error?: string
  [key: string]: unknown
}

// ============= Integration Types =============

export interface HubSpotAccount {
  id: string
  name: string
  is_primary: boolean
}

export interface HubSpotAccountsResponse {
  success: boolean
  accounts?: HubSpotAccount[]
  error?: string
}

export interface BrevoConnectionRequest {
  api_key: string
  session_id?: string
}

export interface BrevoStatusResponse {
  authenticated: boolean
  error?: string
}

// ============= MCP Types =============

export interface MCPToolRequest {
  tool: string
  [key: string]: unknown
}

export interface MCPToolResponse<T = unknown> {
  success?: boolean
  data?: T
  error?: string
  [key: string]: unknown
}
