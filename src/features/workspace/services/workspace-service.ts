/**
 * Workspace API service
 * Based on API documentation for /api/tenants endpoints
 */
import { apiFetch } from '../../../utils/api'
import type { Workspace, WorkspaceRole } from '../types'

/**
 * Raw API response type (role is string from backend)
 * Supports both old (tenant_id) and new (id) response formats
 */
interface RawWorkspace {
  /** New format uses 'id' */
  id?: string
  /** Old format uses 'tenant_id' */
  tenant_id?: string
  name: string
  slug: string
  role: string
  onboarding_completed?: boolean
  connected_platforms?: string[]
  member_count?: number
  is_active?: boolean
}

/**
 * Response from GET /api/tenants
 */
export interface WorkspacesResponse {
  tenants?: RawWorkspace[]
}

/**
 * Response from GET /api/tenants/current
 */
export interface CurrentWorkspaceResponse {
  tenant?: {
    tenant_id?: string
    name?: string
    slug?: string
    role?: string
    onboarding_completed?: boolean
    connected_platforms?: string[]
    member_count?: number
  } | null
  /** Legacy field name — backend may still return this */
  active_tenant?: {
    tenant_id?: string
    name?: string
    slug?: string
    role?: string
    onboarding_completed?: boolean
    connected_platforms?: string[]
    member_count?: number
  } | null
}

/**
 * Response from POST /api/tenants (create workspace)
 */
export interface CreateWorkspaceResponse {
  tenant_id?: string
  name?: string
  slug?: string
  role?: string
  onboarding_completed?: boolean
}

/**
 * Response from POST /api/tenants/switch
 */
export interface SwitchWorkspaceResponse {
  success?: boolean
  active_tenant_id?: string
  tenant_name?: string
  name?: string
  slug?: string
  role?: string
  onboarding_completed?: boolean
  connected_platforms?: string[]
}

/**
 * Fetch all workspaces for the current user
 * Handles both old (tenants) and new (workspaces) response formats
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
  const rawWorkspaces = data.tenants || []
  return rawWorkspaces.map((t): Workspace => ({
    tenant_id: t.tenant_id || '',
    name: t.name,
    slug: t.slug,
    role: (t.role || 'member') as WorkspaceRole,
    onboarding_completed: t.onboarding_completed ?? false,
    connected_platforms: t.connected_platforms || [],
    member_count: t.member_count || 1,
    is_active: t.is_active
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
 * Returns normalized response handling both old and new formats
 */
export const createWorkspace = async (
  sessionId: string,
  name: string
): Promise<{ tenant_id: string; name: string; slug: string }> => {
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

  const data: CreateWorkspaceResponse = await response.json()
  return {
    tenant_id: data.tenant_id || '',
    name: data.name || name,
    slug: data.slug || ''
  }
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

/**
 * Delete a workspace (owner only)
 */
export const deleteWorkspace = async (
  sessionId: string,
  tenantId: string
): Promise<void> => {
  const response = await apiFetch(`/api/tenants/${tenantId}`, {
    method: 'DELETE',
    headers: {
      'X-Session-ID': sessionId
    }
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Delete workspace failed: ${response.status}`)
  }
}
