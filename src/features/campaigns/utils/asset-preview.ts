import type {
  CreativeSpec,
  PreviewFormat,
  PreviewPlatform,
} from '../../chat/components/previews/creative-spec'
import type { Asset } from '../types'
import { creativeThumbnail, driveFileId } from './drive'

/**
 * Campaign Asset → CreativeSpec adapter: the second data source for the shared
 * platform previews (the chat canvas parses markdown; the campaign world reads
 * Asset rows). Returns null for channels/types we can't mock faithfully yet
 * (email, display) — callers fall back to a plain card.
 */

const PAID_CHANNELS = new Set(['meta_ads', 'google_ads', 'linkedin_ads'])
const GOOGLE_SEARCH_TYPES = new Set(['search_ad', 'responsive_search_ad', 'pmax'])

const FORMAT_BY_TYPE: Record<string, PreviewFormat> = {
  carousel: 'carousel',
  reel: 'reel',
  story: 'story',
  video: 'video',
  static: 'static',
  single_image: 'static',
}

const IMAGE_URL = /^https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i

/** Renderable image URLs from deliverable_url (one per line/comma) — Drive file
 * links become their thumbnail form (extension-less), folder links are skipped. */
const deliverableImages = (deliverableUrl?: string | null): string[] =>
  (deliverableUrl ?? '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => IMAGE_URL.test(s) || driveFileId(s))
    .map((s) => (driveFileId(s) ? creativeThumbnail(s, 1200) : s))

export const assetToCreativeSpec = (asset: Asset, channel: string): CreativeSpec | null => {
  const type = asset.asset_type ?? ''
  const isPaid = PAID_CHANNELS.has(channel)

  let platform: PreviewPlatform
  let format: PreviewFormat
  if (channel === 'google_ads') {
    if (!GOOGLE_SEARCH_TYPES.has(type)) return null // display ads etc. → plain card
    platform = 'google'
    format = 'search_ad'
  } else if (channel === 'email') {
    return null
  } else {
    format = FORMAT_BY_TYPE[type] ?? 'static'
    // organic_social covers IG + FB; reels/stories/carousels read as Instagram,
    // Meta/LinkedIn paid feed ads as the Facebook feed frame.
    platform =
      channel === 'organic_social' || format === 'reel' || format === 'story'
        ? 'instagram'
        : 'facebook'
  }

  const details = (asset.details ?? {}) as Record<string, unknown>
  const notes: CreativeSpec['notes'] = []
  if (asset.asset_type) notes.push({ label: 'Format', value: asset.asset_type })
  if (typeof details.launch_date === 'string' && details.launch_date) {
    notes.push({ label: 'Launch', value: details.launch_date })
  }
  if (typeof details.optimal_post_time === 'string' && details.optimal_post_time) {
    notes.push({ label: 'Best time to post', value: details.optimal_post_time })
  }
  if (asset.budget != null) {
    const flight =
      asset.start_date && asset.end_date ? ` · ${asset.start_date} → ${asset.end_date}` : ''
    notes.push({
      label: 'Budget',
      value: `${asset.budget}${asset.budget_period ? ` (${asset.budget_period})` : ''}${flight}`,
    })
  }

  const primaryText = asset.key_message ?? ''
  const headline = asset.headline ?? (platform === 'google' ? asset.asset_name : undefined)
  if (!primaryText && !(platform === 'google' && headline)) return null

  return {
    platform,
    format,
    isPaid,
    primaryText,
    hashtags: '',
    headline: headline || undefined,
    description: undefined,
    cta: asset.cta || undefined,
    linkUrl: asset.final_url || undefined,
    visuals: [],
    media: deliverableImages(asset.deliverable_url),
    notes,
  }
}
