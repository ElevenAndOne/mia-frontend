/**
 * Mia Interaction Style API service.
 * Per-operator chat-style preferences (tone / length / format / proactivity / jargon).
 * See mia-backend docs/MIA_INTERACTION_STYLE_SPEC.md.
 */
import { apiFetch } from '../../../utils/api'

/** A prefs dict. `preset` is the named preset it matches, or 'custom'. */
export interface MiaPreferences {
  preset?: string
  tone: string
  length: string
  format: string
  proactivity: string
  jargon: string
}

export type MiaDimension = 'tone' | 'length' | 'format' | 'proactivity' | 'jargon'

export interface MiaPreferencesCatalog {
  dimensions: Record<MiaDimension, string[]>
  presets: Record<string, MiaPreferences>
  system_default: MiaPreferences
}

export interface MiaPreferencesResponse {
  resolved: MiaPreferences
  sources: Record<MiaDimension, 'user' | 'workspace' | 'system'>
  user_preferences: MiaPreferences | null
  workspace_default: MiaPreferences | null
  role: string
  can_set_workspace_default: boolean
  catalog: MiaPreferencesCatalog
}

export const fetchMiaPreferences = async (
  sessionId: string,
  tenantId: string
): Promise<MiaPreferencesResponse> => {
  const res = await apiFetch(`/api/tenants/${tenantId}/mia-preferences`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!res.ok) throw new Error('Failed to load Mia preferences')
  return res.json()
}

/** Upsert the caller's own chat-style prefs for this workspace. */
export const updateMiaPreferences = async (
  sessionId: string,
  tenantId: string,
  prefs: MiaPreferences
): Promise<MiaPreferences> => {
  const res = await apiFetch(`/api/tenants/${tenantId}/mia-preferences`, {
    method: 'PUT',
    headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to save Mia preferences')
  }
  return (await res.json()).user_preferences
}

/** Owner/admin: set the workspace-level default for everyone. */
export const setMiaWorkspaceDefault = async (
  sessionId: string,
  tenantId: string,
  prefs: MiaPreferences
): Promise<void> => {
  const res = await apiFetch(`/api/tenants/${tenantId}/mia-preferences/default`, {
    method: 'PUT',
    headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to set workspace default')
  }
}

/** One-time copy of the caller's prefs here to all their other workspaces. */
export const applyMiaPreferencesToAll = async (
  sessionId: string,
  tenantId: string
): Promise<number> => {
  const res = await apiFetch(`/api/tenants/${tenantId}/mia-preferences/apply-all`, {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to apply across workspaces')
  }
  return (await res.json()).applied_to ?? 0
}
