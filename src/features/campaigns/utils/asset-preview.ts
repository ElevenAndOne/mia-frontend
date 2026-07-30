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

const PAID_CHANNELS = new Set([
  'meta_ads',
  'google_ads',
  'google_display',
  'linkedin_ads',
  'tiktok_ads',
])
const GOOGLE_SEARCH_TYPES = new Set(['search_ad', 'responsive_search_ad', 'pmax'])

const FORMAT_BY_TYPE: Record<string, PreviewFormat> = {
  carousel: 'carousel',
  reel: 'reel',
  story: 'story',
  video: 'video',
  animation: 'animation',
  static: 'static',
  single_image: 'static',
  post_series: 'post_series',
  pdf: 'document',
  document: 'document',
  article: 'static',
  spark_ad: 'video',
  email: 'email',
  display_ad: 'display_ad',
  text_ad: 'text_ad',
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
  if (GOOGLE_SEARCH_TYPES.has(type)) {
    // Search-ad types read as the Google SERP mock whatever channel they sit on.
    platform = 'google'
    format = type === 'pmax' ? 'pmax' : 'search_ad'
  } else if (type === 'display_ad') {
    platform = 'google'
    format = 'display_ad'
  } else if (type === 'email' || channel === 'email') {
    platform = 'email'
    format = 'email'
  } else if (type === 'text_ad') {
    platform = 'linkedin'
    format = 'text_ad'
  } else if (channel === 'google_ads' || channel === 'google_display') {
    return null // untyped / mismatched assets on Google channels → plain card
  } else {
    const mapped = FORMAT_BY_TYPE[type]
    // Types with no faithful mock (offline print work etc.) fall to the plain
    // card — never dress them up as a Facebook post. Untyped assets keep the
    // static feed default.
    if (!mapped && type !== '') return null
    format = mapped ?? 'static'
    // organic_social covers IG + FB; reels/stories/carousels read as Instagram.
    platform = channel.startsWith('tiktok')
      ? 'tiktok'
      : channel.startsWith('linkedin')
        ? 'linkedin'
        : channel === 'organic_social' || format === 'reel' || format === 'story'
          ? 'instagram'
          : 'facebook'
  }

  const details = (asset.details ?? {}) as Record<string, unknown>
  // RSA / PMax variant pools (details.headlines / details.descriptions).
  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && !!s.trim()) : []
  const headlinePool = strList(details.headlines)
  const descriptionPool = strList(details.descriptions)
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
  // Headline-led mocks (Google, document title bar, email subject, text ads)
  // read better with the asset name than with nothing when no headline is set.
  const headlineDriven =
    platform === 'google' || platform === 'email' || format === 'document' || format === 'text_ad'
  const headline =
    asset.headline ?? headlinePool[0] ?? (headlineDriven ? asset.asset_name : undefined)
  if (!primaryText && !(headlineDriven && headline)) return null

  return {
    platform,
    format,
    isPaid,
    primaryText,
    hashtags: '',
    headline: headline || undefined,
    description: descriptionPool[0],
    headlines: headlinePool,
    descriptions: descriptionPool,
    cta: asset.cta || undefined,
    linkUrl: asset.final_url || undefined,
    visuals: [],
    media: deliverableImages(asset.deliverable_url),
    notes,
  }
}
