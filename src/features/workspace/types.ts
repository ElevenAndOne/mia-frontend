/**
 * Workspace/Tenant types
 * Based on API documentation for /api/tenants endpoints
 */

/** Workspace role as returned by the API */
export type WorkspaceRole = 'owner' | 'admin' | 'member'

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
}
