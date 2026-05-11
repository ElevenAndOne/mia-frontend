const platformIcon = (src: string, alt: string) => (
  <img src={src} alt={alt} className="w-5 h-5 object-contain" />
)

export const CHAT_PLATFORM_CONFIG = [
  { id: 'google_ads', name: 'Google Ads', icon: platformIcon('/icons/google-ads.svg', 'Google Ads'), statusKey: 'google' },
  { id: 'ga4', name: 'Google Analytics', icon: platformIcon('/icons/google_analytics.svg', 'Google Analytics'), statusKey: 'ga4' },
  { id: 'meta_ads', name: 'Meta Ads', icon: platformIcon('/icons/meta-color.svg', 'Meta Ads'), statusKey: 'meta' },
  { id: 'facebook_organic', name: 'Facebook Organic', icon: platformIcon('/icons/facebook-48.png', 'Facebook Organic'), statusKey: 'facebook_organic' },
  { id: 'brevo', name: 'Brevo', icon: platformIcon('/icons/brevo.jpeg', 'Brevo'), statusKey: 'brevo' },
  { id: 'mailchimp', name: 'Mailchimp', icon: platformIcon('/icons/mailchimp detailpage logo.png', 'Mailchimp'), statusKey: 'mailchimp' },
  { id: 'hubspot', name: 'HubSpot', icon: platformIcon('/icons/hubspot.svg', 'HubSpot'), statusKey: 'hubspot' },
  { id: 'linkedin_ads', name: 'LinkedIn Ads', icon: platformIcon('/icons/linkedin.svg', 'LinkedIn Ads'), statusKey: 'linkedin_ads' },
  { id: 'airtable', name: 'Airtable', icon: platformIcon('/icons/Airtable.png', 'Airtable'), statusKey: 'airtable' },
]
