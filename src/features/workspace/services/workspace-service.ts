/**
 * Workspace API service
 */
import { apiFetch } from '../../../utils/api'
import type { Workspace } from '../types'

// Raw API response type (role is string from backend)
interface RawWorkspace {
  tenant_id: string
  name: string
  slug: string
  role: string
  onboarding_completed: boolean
  connected_platforms?: string[]
  member_count?: number
}

export interface WorkspacesResponse {
  tenants: RawWorkspace[]
}

export interface CurrentWorkspaceResponse {
  active_tenant: {
    tenant_id: string
    name?: string
    slug?: string
    role?: string
    onboarding_completed?: boolean
    connected_platforms?: string[]
    member_count?: number
  } | null
}

export interface CreateWorkspaceResponse {
  tenant_id: string
  name: string
  slug: string
}

export interface SwitchWorkspaceResponse {
  name?: string
  slug?: string
  role?: string
  onboarding_completed?: boolean
  connected_platforms?: string[]
}

/**
 * Fetch all workspaces for the current user
 */
export const fetchWorkspaces = async (sessionId: string): Promise<Workspace[]> => {
  const response = await apiFetch('/api/tenants', {
    headers: {
      'X-Session-ID': sessionId
    }
  })

  if (!response.ok) {
    throw new Error(`Workspaces API failed: ${response.status}`)
  }

  const data: WorkspacesResponse = await response.json()
  return (data.tenants || []).map((t): Workspace => ({
    tenant_id: t.tenant_id,
    name: t.name,
    slug: t.slug,
    role: t.role as Workspace['role'],
    onboarding_completed: t.onboarding_completed,
    connected_platforms: t.connected_platforms || [],
    member_count: t.member_count || 1
  }))
}

/**
 * Fetch current active workspace
 */
export const fetchCurrentWorkspace = async (
  sessionId: string
): Promise<CurrentWorkspaceResponse> => {
  const response = await apiFetch('/api/tenants/current', {
    headers: {
      'X-Session-ID': sessionId
    }
  })

  if (!response.ok) {
    throw new Error(`Current workspace API failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Create a new workspace
 */
export const createWorkspace = async (
  sessionId: string,
  name: string
): Promise<CreateWorkspaceResponse> => {
  const response = await apiFetch('/api/tenants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId
    },
    body: JSON.stringify({ name })
  })

  if (!response.ok) {
    throw new Error(`Create workspace failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Switch to a different workspace
 */
export const switchWorkspace = async (
  sessionId: string,
  tenantId: string
): Promise<SwitchWorkspaceResponse> => {
  const response = await apiFetch('/api/tenants/switch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId
    },
    body: JSON.stringify({ tenant_id: tenantId })
  })

  if (!response.ok) {
    throw new Error(`Switch workspace failed: ${response.status}`)
  }

  return response.json()
}
