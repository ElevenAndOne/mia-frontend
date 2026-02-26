// Platform status types
export interface PlatformConnectionStatus {
  connected: boolean
  linked: boolean
  last_synced?: string
}

export interface PlatformStatus {
  google: PlatformConnectionStatus
  ga4: PlatformConnectionStatus
  meta: PlatformConnectionStatus
  facebook_organic: PlatformConnectionStatus
  brevo: PlatformConnectionStatus
  hubspot: PlatformConnectionStatus
  mailchimp: PlatformConnectionStatus
  linkedin_ads: PlatformConnectionStatus
}

// GA4 Property types (consolidated from use-integration-status.ts and ga4-property-selector.tsx)
export interface GA4Property {
  property_id: string
  display_name: string
}

export interface LinkedGA4Property extends GA4Property {
  is_primary: boolean
  sort_order: number
}

// Platform account types (consolidated from all selector files)
export interface MetaAccount {
  id: string
  name: string
  currency: string
  status: string
}

export interface HubSpotAccount {
  id: number
  portal_id: string
  account_name: string
  is_primary: boolean
}

export interface BrevoAccount {
  id: number
  account_name: string
  is_primary: boolean
  created_at: string
}

export interface MailchimpAccount {
  id: number
  mailchimp_account_id: string
  mailchimp_account_name: string
  is_primary: boolean
}

export interface FacebookPage {
  id: string
  name: string
  access_token: string
  fan_count: number
  link: string
  category: string
}

export interface GoogleAccount {
  customer_id: string
  descriptive_name: string
  manager: boolean
  login_customer_id?: string
}

// Account data type (consolidated from use-integration-status.ts)
export interface AccountData {
  id: string | number
  name?: string
  google_ads_id?: string
  meta_ads_id?: string
  ga4_property_id?: string
  brevo_api_key?: string
  brevo_account_name?: string
  hubspot_portal_id?: string
  mailchimp_account_id?: string
  facebook_page_id?: string
  linkedin_ads_account_id?: string
  linkedin_organization_id?: string
  linked_ga4_properties?: GA4Property[]
}
