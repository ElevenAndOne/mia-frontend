import { apiFetch } from '../../../utils/api'

export interface WorkspaceMember {
  user_id: string
  email: string | null
  name: string | null
  picture_url: string | null
  role: string
  status: string
  joined_at: string | null
}

export interface WorkspaceInvite {
  invite_id: string
  email: string | null
  role: string
  status: string
  expires_at: string
  created_at: string | null
  is_link_invite?: boolean
  email_sent?: boolean
}

export const fetchWorkspaceMembers = async (sessionId: string, workspaceId: string): Promise<WorkspaceMember[]> => {
  const response = await apiFetch(`/api/tenants/${workspaceId}/members`, {
    headers: { 'X-Session-ID': sessionId },
  })

  if (!response.ok) {
    throw new Error('Failed to load workspace members')
  }

  return response.json()
}

export const fetchWorkspaceInvites = async (sessionId: string, workspaceId: string): Promise<WorkspaceInvite[]> => {
  const response = await apiFetch(`/api/tenants/${workspaceId}/invites`, {
    headers: { 'X-Session-ID': sessionId },
  })

  if (!response.ok) {
    throw new Error('Failed to load workspace invites')
  }

  return response.json()
}

export const createWorkspaceInvite = async (
  sessionId: string,
  workspaceId: string,
  payload: { role: string; email?: string }
): Promise<WorkspaceInvite> => {
  const response = await apiFetch(`/api/tenants/${workspaceId}/invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.detail || 'Failed to create invite')
  }

  return response.json()
}

export const revokeWorkspaceInvite = async (sessionId: string, workspaceId: string, inviteId: string) => {
  const response = await apiFetch(`/api/tenants/${workspaceId}/invites/${inviteId}`, {
    method: 'DELETE',
    headers: { 'X-Session-ID': sessionId },
  })

  if (!response.ok) {
    throw new Error('Failed to revoke invite')
  }
}

export const removeWorkspaceMember = async (sessionId: string, workspaceId: string, userId: string) => {
  const response = await apiFetch(`/api/tenants/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
    headers: { 'X-Session-ID': sessionId },
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.detail || 'Failed to remove member')
  }
}

export const updateWorkspaceMemberRole = async (
  sessionId: string,
  workspaceId: string,
  userId: string,
  role: string
) => {
  const response = await apiFetch(`/api/tenants/${workspaceId}/members/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({ role }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.detail || 'Failed to update role')
  }
}
