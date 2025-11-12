export type JsonRecord = Record<string, unknown>

export interface ApiSuccessResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  [key: string]: unknown
}

export interface AuthUrlResponse {
  auth_url: string
}

export interface GoogleUserInfo {
  email: string
  name?: string
  picture?: string
  id?: string
}

export interface SelectedAccount {
  id: string
  name: string
  google_ads_id?: string
  ga4_property_id?: string
  meta_ads_id?: string
  business_type?: string
  linked_ga4_properties?: JsonRecord[]
  [key: string]: unknown
}

export interface GoogleAuthStatusResponse extends ApiSuccessResponse {
  authenticated: boolean
  user_info?: GoogleUserInfo
  selected_account?: SelectedAccount
  needs_setup?: boolean
}

export interface MetaUserInfo {
  id: string
  name: string
  email?: string
}

export interface MetaExchangeRequest {
  code: string
}

export interface MetaAuthStatusResponse extends ApiSuccessResponse {
  authenticated: boolean
  user_info?: MetaUserInfo
  selected_account?: SelectedAccount
}

export interface MetaExchangeResponse extends ApiSuccessResponse {
  user_info?: MetaUserInfo
}

export interface OAuthCompleteRequest {
  session_id: string
}

export interface SessionUser {
  name: string
  email: string
  picture_url: string
  user_id: string
}

export interface SessionValidationResponse extends ApiSuccessResponse {
  valid: boolean
  platforms: {
    google: boolean
    meta: boolean
  }
  user: SessionUser
  selected_account?: SelectedAccount
}

export interface AccountSummary {
  id: string
  name: string
  google_ads_id?: string
  ga4_property_id?: string
  meta_ads_id?: string
  business_type?: string
  color?: string
  display_name?: string
  linked_ga4_properties?: JsonRecord[]
  [key: string]: unknown
}

export interface GA4Property {
  property_id: string
  display_name: string
  name?: string
  currency_code?: string
  time_zone?: string
  account_id?: string
  account_display_name?: string
  [key: string]: unknown
}

export interface AvailableAccountsResponse extends ApiSuccessResponse {
  accounts: AccountSummary[]
  ga4_properties: GA4Property[]
}

export interface SelectAccountRequest {
  account_id: string
  session_id: string
}

export interface SelectAccountResponse extends ApiSuccessResponse {
  selected_account?: SelectedAccount
}

export interface LinkPlatformRequest {
  account_id: string
  platform: string
  platform_id: string
}

export interface LinkPlatformResponse extends ApiSuccessResponse {}

export interface SelectMccRequest {
  session_id: string
  mcc_id: string
}

export interface RawGoogleAdsAccount {
  customer_id: string
  resource_name?: string
  descriptive_name: string
  error?: string
}

export interface RawGA4Property {
  property_id: string
  display_name: string
  name?: string
  currency_code?: string
  time_zone?: string
  account_id?: string
  account_display_name?: string
}

export interface McpGoogleAdsResponse {
  accounts: RawGoogleAdsAccount[]
  [key: string]: unknown
}

export interface McpGa4PropertiesResponse {
  properties: RawGA4Property[]
  [key: string]: unknown
}

export interface MetaAdsAccount {
  id: string
  name: string
  account_id: string
  currency: string
  timezone_name: string
  account_status: number
  [key: string]: unknown
}

export interface CampaignMetricAction {
  action_type: string
  value: string
}

export interface CampaignMetrics {
  impressions?: number
  clicks?: number
  spend?: number
  reach?: number
  frequency?: number
  ctr?: number
  cpc?: number
  cpm?: number
  cpp?: number
  actions?: CampaignMetricAction[]
  [key: string]: unknown
}

export interface MetaCampaign {
  id: string
  name: string
  status: string
  objective?: string
  daily_budget?: number
  lifetime_budget?: number
  metrics?: CampaignMetrics
  [key: string]: unknown
}

export interface MetaAdSet {
  id: string
  name: string
  status: string
  [key: string]: unknown
}

export interface MetaAd {
  id: string
  name: string
  status: string
  [key: string]: unknown
}

export interface MetaAvailableAccount {
  id: string
  name: string
  currency?: string
  status?: string
  [key: string]: unknown
}

export interface MetaAvailableAccountsResponse extends ApiSuccessResponse {
  accounts: MetaAvailableAccount[]
}

export interface LinkMetaAccountRequest {
  meta_account_id: string
}

export interface LinkMetaAccountResponse extends ApiSuccessResponse {}

export interface ChatRequest {
  message: string
  session_id: string
  user_id?: string
  google_ads_id?: string
  ga4_property_id?: string
  date_range?: string
}

export interface ChatResponse extends ApiSuccessResponse {
  claude_response?: string
  response?: string
}

export type InsightContext = 'growth' | 'improve' | 'fix'

export interface InsightQuestionRequest {
  question: string
  context: InsightContext
  user: string
  selected_account?: JsonRecord
  user_id?: string
}

export interface InsightQuestionResponse extends ApiSuccessResponse {
  data?: unknown
}

export interface QuickInsightsRequest {
  session_id: string
  date_range: string
}

export interface QuickInsight {
  title: string
  insight: string
  interpretation?: string
  action?: string
  counterView?: string
}

export interface QuickInsightsResponse extends ApiSuccessResponse {
  type?: string
  summary?: string
  insights?: QuickInsight[]
}

export interface CreativeAnalysisRequest {
  question: string
  category: string
  session_id: string
  user_id?: string
  google_ads_id?: string
  ga4_property_id?: string
  start_date: string
  end_date: string
}

export interface CreativeAnalysisResponse extends ApiSuccessResponse {
  creative_response?: string
  error?: string
}

export interface BrevoCredentialsRequest {
  user_id: string
  api_key: string
}

export interface BrevoConnectRequest {
  session_id: string
  api_key: string
}

export interface BrevoApiKeySaveRequest {
  api_key: string
}

export interface BrevoResponse extends ApiSuccessResponse {}

export type HubSpotAuthUrlResponse = AuthUrlResponse

export interface GoogleAdAccountSummary {
  customer_id: string
  descriptive_name: string
  manager?: boolean
  account_count?: number
  is_mcc?: boolean
  [key: string]: unknown
}

export interface GoogleAdAccountsResponse extends ApiSuccessResponse {
  mcc_accounts?: GoogleAdAccountSummary[]
  ad_accounts?: GoogleAdAccountSummary[]
}
