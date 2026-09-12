/**
 * Workspace/Tenant types
 * Based on API documentation for /api/tenants endpoints
 */

import type { Experience, FeatureFlags } from './feature-keys'

/** Workspace role as returned by the API */
export type WorkspaceRole = 'owner' | 'admin' | 'analyst' | 'viewer' | 'member'

export interface Workspace {
  tenant_id: string
  name: string
  slug: string
  role: WorkspaceRole
  onboarding_completed: boolean
  connected_platforms: string[]
  member_count: number
  /** Whether this workspace is currently active */
  is_active?: boolean
  /** Workspace-scoped Google Ads customer ID for picker pre-selection */
  google_ads_customer_id?: string | null
  /** URL to workspace logo image, null if using letter avatar */
  logo_url?: string | null
  /**
   * Effective feature flags for this workspace (every known key -> bool), resolved by the
   * backend from constants/features.py + per-workspace overrides. Read via useFeatures().
   */
  features?: FeatureFlags
  /** What THIS caller gets here (staff are always 'agency'). Read via useExperience(). */
  experience?: Experience
  /** The workspace's own setting, editable in Workspace Settings. */
  experience_profile?: Experience
}
