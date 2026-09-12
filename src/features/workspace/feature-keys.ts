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
  'new_workspace',
  'home_cards',
  'platform_picker',
  'paid_media',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

/**
 * Experience profile — mirrors EXPERIENCES in constants/features.py. Picks the DEFAULT for
 * every flag; per-workspace overrides sit on top. Named "experience", never "tier"/"plan".
 */
export const EXPERIENCES = ['basic', 'team', 'agency'] as const
export type Experience = (typeof EXPERIENCES)[number]

export const EXPERIENCE_LABEL: Record<Experience, string> = {
  basic: 'Basic',
  team: 'Team',
  agency: 'Agency',
}

export const EXPERIENCE_COPY: Record<Experience, string> = {
  basic: 'Owner-run business on Facebook and Instagram. Chat, Posts, Report and Settings.',
  team: 'In-house marketing team. Campaigns, reports, integrations and the weekly memo.',
  agency: 'Everything, for people running several client workspaces.',
}

/** Effective flags as shipped on every workspace payload: every known key -> boolean. */
export type FeatureFlags = Partial<Record<FeatureKey, boolean>>

/** One row of the settings catalog from GET /api/tenants/{id}/features. */
export interface FeatureCatalogEntry {
  key: FeatureKey
  label: string
  description: string
  group: string
  /** Default for the caller's experience. */
  default: boolean
  /** Default per experience, so the settings UI can explain what a switch changes. */
  defaults: Record<Experience, boolean>
  /** Platforms whose connection turns this flag on when its default is off (unlock rule). */
  unlocked_by?: string[]
  /** True when one of those platforms is connected on this workspace. */
  unlocked?: boolean
  enabled: boolean
  overridden: boolean
}
