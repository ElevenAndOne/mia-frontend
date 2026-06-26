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

// New brand palette mapped across channels — platform families kept recognisable
// (Google golds, LinkedIn blues, TikTok pink/raspberry) and all kept distinct.
const CHANNEL_HEX: Record<string, string> = {
  organic_social: '#8398ca', // periwinkle
  meta_ads: '#5c78ba', // deep periwinkle-blue
  google_ads: '#f4c247', // golden
  google_display: '#e2a50e', // deep gold
  email: '#44b8ab', // turquoise
  brevo: '#e15d44', // terracotta
  mailchimp: '#ffbe98', // peach
  website: '#e499ba', // rose
  seo: '#007a9b', // petrol-teal
  linkedin_ads: '#3c538b', // navy blue
  linkedin_organic: '#a1b0d4', // light periwinkle
  tiktok_ads: '#c54966', // raspberry
  tiktok_influencers: '#df95b6', // light rose
  hubspot: '#d88818', // amber
  offline_event: '#9f8286', // mauve
  packaging: '#babc72', // sage
  point_of_sale: '#379086', // deep teal
  printing: '#b3361e', // rust
}

const TYPE_HEX: Record<string, string> = {
  carousel: '#8398ca', // periwinkle
  animation: '#5c78ba', // blue
  reel: '#5c78ba',
  video: '#5c78ba',
  static: '#f4c247', // golden
  single_image: '#f4c247',
  email: '#44b8ab', // turquoise
}

const DEFAULT_HEX = '#a39c8f' // warm neutral

export function channelLabel(channel: string): string {
  return PLATFORM_LABELS[channel] ?? channel
}

export function channelColor(channel: string): string {
  // CSS var (live-editable in the theme editor) with the palette hex as fallback.
  const hex = CHANNEL_HEX[channel] ?? DEFAULT_HEX
  return `var(--ch-${channel}, ${hex})`
}

export function assetTypeColor(type: string | null | undefined): string {
  if (!type) return DEFAULT_HEX
  return TYPE_HEX[type] ?? DEFAULT_HEX
}

// `color-mix` soft tint of any hex — matches the artifact's translucent fills.
export function softColor(hex: string, percent = 16): string {
  return `color-mix(in srgb, ${hex} ${percent}%, transparent)`
}
