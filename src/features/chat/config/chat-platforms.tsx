const platformIcon = (src: string, alt: string) => (
  <img src={src} alt={alt} className="w-5 h-5 object-contain" />
)

// Uploaded Data (CSV) uses an inline SVG rather than an image asset.
const csvIcon = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 4.5A1.5 1.5 0 015.5 3h8l6 6v10.5A1.5 1.5 0 0118 21H5.5A1.5 1.5 0 014 19.5v-15z"
      stroke="#10B981"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M13 3v6h6" stroke="#10B981" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M7.5 13h9M7.5 16h9" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
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
  { id: 'tiktok_ads', name: 'TikTok Ads', icon: platformIcon('/icons/tiktok.svg', 'TikTok Ads'), statusKey: 'tiktok_ads' },
  { id: 'tiktok_organic', name: 'TikTok Organic', icon: platformIcon('/icons/tiktok.svg', 'TikTok Organic'), statusKey: 'tiktok_organic' },
  { id: 'airtable', name: 'Airtable', icon: platformIcon('/icons/Airtable.png', 'Airtable'), statusKey: 'airtable' },
  // Uploaded CSVs — "connected" when the workspace has ≥1 dataset (resolved in use-chat-view,
  // not via platformStatus). statusKey is unused for this entry.
  { id: 'csv', name: 'Uploaded Data (CSV)', icon: csvIcon, statusKey: 'csv' },
]
