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
}
