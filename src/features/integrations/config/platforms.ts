export interface PlatformConfigItem {
  id: string
  name: string
  icon: string
  accountKey: string
}

// Order: Google Ads, GA4, Meta, Facebook, Brevo, Mailchimp, HubSpot
// Platform IDs must match backend TenantIntegration.platform values
export const PLATFORM_CONFIG: PlatformConfigItem[] = [
  { id: 'google_ads', name: 'Google Ads', icon: '/icons/radio buttons/Google-ads.png', accountKey: 'google_ads_id' },
  { id: 'ga4', name: 'Google Analytics', icon: '/icons/radio buttons/Google-analytics.png', accountKey: 'ga4_property_id' },
  { id: 'meta_ads', name: 'Meta Ads', icon: '/icons/radio buttons/Meta.png', accountKey: 'meta_ads_id' },
  { id: 'facebook_organic', name: 'Facebook Organic', icon: '/icons/radio buttons/Facebook.png', accountKey: 'facebook_page_id' },
  { id: 'brevo', name: 'Brevo', icon: '/icons/radio buttons/Brevo.png', accountKey: 'brevo_api_key' },
  { id: 'mailchimp', name: 'Mailchimp', icon: '/icons/radio buttons/mailchimp.png', accountKey: 'mailchimp_account_id' },
  { id: 'hubspot', name: 'HubSpot', icon: '/icons/radio buttons/Hubspot.png', accountKey: 'hubspot_portal_id' },
]
