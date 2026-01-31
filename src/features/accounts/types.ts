/**
 * Account types
 */

export interface AccountMapping {
  id: string
  name: string
  google_ads_id: string
  ga4_property_id: string
  meta_ads_id?: string
  facebook_page_id?: string
  facebook_page_name?: string
  brevo_api_key?: string
  brevo_account_name?: string
  hubspot_portal_id?: string
  business_type: string
  color: string
  display_name: string
  google_ads_account_type?: string
}

export interface AccountSelectionItem {
  id: string
  name: string
  detail: string
  icon: string
  iconBackground: string
  isSelecting: boolean
  disabled: boolean
}

export interface MccSelectionItem {
  id: string
  name: string
  accountCountLabel: string
  isSelected: boolean
  subAccounts: AccountSelectionItem[]
}

export interface MetaAccountSelectionItem {
  id: string
  name: string
  metaAdsId?: string
  isSelecting: boolean
  disabled: boolean
}
