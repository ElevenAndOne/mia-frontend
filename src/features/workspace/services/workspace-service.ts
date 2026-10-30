/**
 * Workspace API service
 * Based on API documentation for /api/tenants endpoints
 */
import { apiFetch, API_BASE_URL } from '../../../utils/api'
import type { Workspace, WorkspaceRole } from '../types'
import type { Experience, FeatureFlags } from '../feature-keys'
import { clearReferral, pendingReferral } from '../../referrals/referral'

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
  logo_url?: string | null
  features?: FeatureFlags
  experience?: Experience
  experience_profile?: Experience
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
    /** New format uses 'id' */
    id?: string
    /** Old format uses 'tenant_id' */
    tenant_id?: string
    name?: string
    slug?: string
    role?: string
    onboarding_completed?: boolean
    connected_platforms?: string[]
    member_count?: number
    features?: FeatureFlags
    experience?: Experience
    experience_profile?: Experience
  } | null
  /** Legacy field name — backend may still return this */
  active_tenant?: {
    /** New format uses 'id' */
    id?: string
    /** Old format uses 'tenant_id' */
    tenant_id?: string
    name?: string
    slug?: string
    role?: string
    onboarding_completed?: boolean
    connected_platforms?: string[]
    member_count?: number
    features?: FeatureFlags
    experience?: Experience
    experience_profile?: Experience
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
  features?: FeatureFlags
  experience?: Experience
  experience_profile?: Experience
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
      'X-Session-ID': sessionId,
    },
  })

  if (!response.ok) {
    throw new Error(`Workspaces API failed: ${response.status}`)
  }

  const data: WorkspacesResponse = await response.json()
  const rawWorkspaces = data.tenants || []
  return rawWorkspaces.map(
    (t): Workspace => ({
      tenant_id: t.tenant_id || '',
      name: t.name,
      slug: t.slug,
      role: (t.role || 'member') as WorkspaceRole,
      onboarding_completed: t.onboarding_completed ?? false,
      connected_platforms: t.connected_platforms || [],
      member_count: t.member_count || 1,
      is_active: t.is_active,
      logo_url: t.logo_url ? `${API_BASE_URL}${t.logo_url}` : null,
      features: t.features,
      experience: t.experience,
      experience_profile: t.experience_profile,
    })
  )
}

export const uploadWorkspaceLogo = async (
  sessionId: string,
  tenantId: string,
  file: File
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiFetch(`/api/tenants/${tenantId}/logo`, {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId },
    body: formData,
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Logo upload failed')
  }
  const data = await response.json()
  return `${API_BASE_URL}${data.logo_url}?v=${Date.now()}`
}

/**
 * Basic's one logo (Settings clean-up, 30 Oct 2026): saved as the logo Mia puts on posts and,
 * by the backend, as the workspace logo next to the name in Mia. Returns the app logo URL.
 */
export const uploadOneLogo = async (sessionId: string, tenantId: string, file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('kind', 'logo')
  formData.append('everywhere', 'true')
  formData.append('file', file)
  const response = await apiFetch(`/api/tenants/${tenantId}/brand-kit/assets`, {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId },
    body: formData,
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Logo upload failed')
  }
  return `${API_BASE_URL}/api/tenants/${tenantId}/logo?v=${Date.now()}`
}

/** Removes Basic's one logo from posts and from the app. */
export const removeOneLogo = async (sessionId: string, tenantId: string): Promise<void> => {
  const headers = { 'X-Session-ID': sessionId }
  const kit = await apiFetch(`/api/tenants/${tenantId}/brand-kit`, { headers })
  const logoId = kit.ok ? ((await kit.json()) as { logo?: { asset_id?: string } | null }).logo?.asset_id : null
  if (logoId) await apiFetch(`/api/tenants/${tenantId}/brand-kit/assets/${logoId}`, { method: 'DELETE', headers })
  await deleteWorkspaceLogo(sessionId, tenantId).catch(() => undefined)
}

export const deleteWorkspaceLogo = async (sessionId: string, tenantId: string): Promise<void> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/logo`, {
    method: 'DELETE',
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Logo removal failed')
  }
}

/**
 * Fetch current active workspace
 */
export const fetchCurrentWorkspace = async (
  sessionId: string
): Promise<CurrentWorkspaceResponse> => {
  const response = await apiFetch('/api/tenants/current', {
    headers: {
      'X-Session-ID': sessionId,
    },
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
): Promise<{
  tenant_id: string
  name: string
  slug: string
  features?: FeatureFlags
  experience?: Experience
  experience_profile?: Experience
}> => {
  const response = await apiFetch('/api/tenants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    // The invite code they arrived with, if any (referrals, P2): spent on this first workspace.
    body: JSON.stringify({ name, referral_code: pendingReferral() || undefined }),
  })

  if (!response.ok) {
    throw new Error(`Create workspace failed: ${response.status}`)
  }
  clearReferral()

  const data: CreateWorkspaceResponse = await response.json()
  return {
    tenant_id: data.tenant_id || '',
    name: data.name || name,
    slug: data.slug || '',
    features: data.features,
    experience: data.experience,
    experience_profile: data.experience_profile,
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
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({ tenant_id: tenantId }),
  })

  if (!response.ok) {
    throw new Error(`Switch workspace failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Rename a workspace (owner only)
 */
export const renameWorkspace = async (
  sessionId: string,
  tenantId: string,
  name: string
): Promise<{ success: boolean; name: string; slug: string }> => {
  const response = await apiFetch(`/api/tenants/${tenantId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `Rename workspace failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch workspace details including website_url
 */
export const fetchWorkspaceDetails = async (
  sessionId: string,
  tenantId: string
): Promise<{
  website_url: string | null
  active_framework: 'race' | 'generic'
  experience_profile?: Experience
  experience?: Experience
}> => {
  const response = await apiFetch(`/api/tenants/${tenantId}`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) throw new Error('Failed to fetch workspace details')
  const data = await response.json()
  return {
    website_url: data.website_url ?? null,
    active_framework: (data.active_framework ?? 'race') as 'race' | 'generic',
    experience_profile: data.experience_profile as Experience | undefined,
    experience: data.experience as Experience | undefined,
  }
}

/**
 * Update the campaign-builder framework for a workspace (owner only).
 * 'race' = Reach/Act/Convert/Engage; 'generic' = Awareness/Consideration/Conversion/Retention.
 */
export const updateWorkspaceFramework = async (
  sessionId: string,
  tenantId: string,
  framework: 'race' | 'generic'
): Promise<void> => {
  const response = await apiFetch(`/api/tenants/${tenantId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
    body: JSON.stringify({ active_framework: framework }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to update campaign framework')
  }
}

/**
 * Update client website URL for a workspace (owner only)
 */
export const updateWorkspaceWebsiteUrl = async (
  sessionId: string,
  tenantId: string,
  websiteUrl: string
): Promise<void> => {
  const response = await apiFetch(`/api/tenants/${tenantId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({ website_url: websiteUrl }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to update website URL')
  }
}

/**
 * Delete a workspace (owner only)
 */
export const deleteWorkspace = async (
  sessionId: string,
  tenantId: string
): Promise<{ account_deleted?: boolean }> => {
  const response = await apiFetch(`/api/tenants/${tenantId}`, {
    method: 'DELETE',
    headers: {
      'X-Session-ID': sessionId,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Delete workspace failed: ${response.status}`)
  }
  // account_deleted: a Basic profile was the person's whole Mia account (1 Oct 2026).
  return response.json().catch(() => ({}))
}

// ---------------------------------------------------------------------------
// Feature flags (Sep 2026). Registry lives in mia-backend/constants/features.py.
// ---------------------------------------------------------------------------


/** Whether this account may add another business profile (Basic: one, unless switched on). */
export const fetchWorkspaceAllowance = async (
  sessionId: string
): Promise<{ basic_only: boolean; owned: number; max: number; can_add: boolean }> => {
  const response = await apiFetch('/api/tenants/allowance', {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) throw new Error(`Allowance failed: ${response.status}`)
  return response.json()
}
