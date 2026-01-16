export interface UserProfile {
  user_id: string
  email: string
  name?: string
  picture?: string
}

export interface AccountMapping {
  id: string
  name: string
  user_id: string
  google_ads_id?: string
  ga4_property_id?: string
  meta_ads_id?: string
  facebook_page_id?: string
  brevo_api_key?: string
  mailchimp_account_id?: string
  hubspot_portal_id?: string
}
