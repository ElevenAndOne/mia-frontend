/**
 * Feature flag keys — mirrors mia-backend/constants/features.py.
 *
 * The backend registry is the source of truth (labels, descriptions, defaults). This list
 * exists so `isEnabled('campaigns')` is typo-proof at compile time. Add a key here when you
 * add one there.
 */
export const FEATURE_KEYS = [
  'integrations',
  'campaigns',
  'posts',
  'scheduler',
  'reports',
  'budget_tracker',
  'weekly_memo',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

/** Effective flags as shipped on every workspace payload: every known key -> boolean. */
export type FeatureFlags = Partial<Record<FeatureKey, boolean>>

/** One row of the settings catalog from GET /api/tenants/{id}/features. */
export interface FeatureCatalogEntry {
  key: FeatureKey
  label: string
  description: string
  group: string
  default: boolean
  enabled: boolean
  overridden: boolean
}
