/**
 * Workspace/Tenant types
 */

export interface Workspace {
  tenant_id: string
  name: string
  slug: string
  role: 'owner' | 'admin' | 'analyst' | 'viewer'
  onboarding_completed: boolean
  connected_platforms: string[]
  member_count: number
}
