// Channel + asset-type labels and colours. Single source of truth for both the
// CSS-driven styling and the JS-computed colours used by the timeline / calendar
// / charts (which need real hex values for inline styles and SVG).

export const PLATFORM_LABELS: Record<string, string> = {
  brevo: 'Brevo',
  email: 'Email',
  google_ads: 'Google Ads',
  google_display: 'Google Display',
  hubspot: 'HubSpot',
  linkedin_ads: 'LinkedIn Ads',
  linkedin_organic: 'LinkedIn Organic',
  mailchimp: 'Mailchimp',
  meta_ads: 'Meta Ads',
  offline_event: 'Offline Event',
  organic_social: 'Organic Social',
  packaging: 'Packaging',
  point_of_sale: 'Point of Sale',
  printing: 'Printing',
  seo: 'SEO',
  tiktok_ads: 'TikTok Ads',
  tiktok_influencers: 'TikTok Influencers',
  website: 'Website',
  // Legacy display only — excluded from the picker
  display: 'Display',
  facebook_organic: 'Facebook Organic',
  ga4: 'Google Analytics 4',
  instagram_organic: 'Instagram Organic',
  airtable: 'Airtable',
}

const CHANNEL_HEX: Record<string, string> = {
  organic_social: '#8b6dff',
  meta_ads: '#4f8cff',
  google_ads: '#f0a82e',
  google_display: '#f0a82e',
  email: '#2bd4a4',
  brevo: '#f0772e',
  mailchimp: '#ffe01b',
  website: '#e879c9',
  seo: '#38bdf8',
  linkedin_ads: '#3b82f6',
  linkedin_organic: '#60a5fa',
  tiktok_ads: '#ff4d67',
  tiktok_influencers: '#ff8fa3',
  hubspot: '#ff7a59',
  offline_event: '#a78bfa',
  packaging: '#fbbf24',
  point_of_sale: '#34d399',
  printing: '#c084fc',
}

const TYPE_HEX: Record<string, string> = {
  carousel: '#8b6dff',
  animation: '#4f8cff',
  reel: '#4f8cff',
  video: '#4f8cff',
  static: '#f0a82e',
  single_image: '#f0a82e',
  email: '#2bd4a4',
}

const DEFAULT_HEX = '#9a9aa4'

export function channelLabel(channel: string): string {
  return PLATFORM_LABELS[channel] ?? channel
}

export function channelColor(channel: string): string {
  return CHANNEL_HEX[channel] ?? DEFAULT_HEX
}

export function assetTypeColor(type: string | null | undefined): string {
  if (!type) return DEFAULT_HEX
  return TYPE_HEX[type] ?? DEFAULT_HEX
}

// `color-mix` soft tint of any hex — matches the artifact's translucent fills.
export function softColor(hex: string, percent = 16): string {
  return `color-mix(in srgb, ${hex} ${percent}%, transparent)`
}
