// Canonical asset-type vocabulary — single source of truth for the type
// dropdown, mirrored from the backend's constants/asset_types.py (which drives
// Mia's generation guidance). Keep the two in sync when adding a type.
//
// "pdf" and "document" are the same deliverable (LinkedIn's native name is
// document ad); previews treat them identically.

export const ASSET_TYPE_GROUPS: { label: string; types: string[] }[] = [
  {
    label: 'Social',
    types: ['static', 'single_image', 'carousel', 'video', 'reel', 'story', 'animation', 'post_series'],
  },
  {
    label: 'Google',
    types: ['search_ad', 'responsive_search_ad', 'pmax', 'display_ad'],
  },
  {
    label: 'LinkedIn',
    types: ['document', 'article', 'text_ad'],
  },
  {
    label: 'TikTok',
    types: ['spark_ad'],
  },
  {
    label: 'Email',
    types: ['email'],
  },
  {
    label: 'Docs & offline',
    types: ['pdf', 'flyer', 'poster', 'packaging_design', 'shelf_wobbler', 'pos_display', 'event'],
  },
]

export const ASSET_TYPES: string[] = ASSET_TYPE_GROUPS.flatMap((g) => g.types)
