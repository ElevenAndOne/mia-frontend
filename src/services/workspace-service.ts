import { apiGet, apiPost, apiPut, apiDelete } from './api-client'
import { Workspace, WorkspaceMember, WorkspaceInvite } from '../types'

export const workspaceService = {
  /**
   * Get all workspaces for current user
   */
  async listWorkspaces(sessionId: string): Promise<Workspace[]> {
    const response = await apiGet<{ tenants: Workspace[] }>(
      `/api/tenants?session_id=${sessionId}`
    )
    return response.tenants
  },

  /**
   * Create new workspace
   */
  async createWorkspace(
    sessionId: string,
    name: string
  ): Promise<Workspace | null> {
    try {
      const response = await apiPost<{ tenant: Workspace }>(
        '/api/tenants',
        { session_id: sessionId, name }
      )
      return response.tenant
    } catch (error) {
      console.error('Failed to create workspace:', error)
      return null
    }
  },

  /**
   * Switch active workspace
   */
  async switchWorkspace(
    sessionId: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      await apiPost('/api/tenants/switch', {
        session_id: sessionId,
        tenant_id: tenantId
      })
      return true
    } catch (error) {
      console.error('Failed to switch workspace:', error)
      return false
    }
  },

  /**
   * Get workspace members
   */
  async getMembers(tenantId: string): Promise<WorkspaceMember[]> {
    const response = await apiGet<{ members: WorkspaceMember[] }>(
      `/api/tenants/${tenantId}/members`
    )
    return response.members
  },

  /**
   * Update member role
   */
  async updateMemberRole(
    tenantId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await apiPut(`/api/tenants/${tenantId}/members/${userId}`, { role })
  },

  /**
   * Remove member
   */
  async removeMember(tenantId: string, userId: string): Promise<void> {
    await apiDelete(`/api/tenants/${tenantId}/members/${userId}`)
  },

  /**
   * Get workspace invites
   */
  async getInvites(tenantId: string): Promise<WorkspaceInvite[]> {
    const response = await apiGet<{ invites: WorkspaceInvite[] }>(
      `/api/tenants/${tenantId}/invites`
    )
    return response.invites
  },

  /**
   * Create invite
   */
  async createInvite(
    tenantId: string,
    email: string | null,
    role: 'admin' | 'member'
  ): Promise<WorkspaceInvite> {
    const response = await apiPost<{ invite: WorkspaceInvite }>(
      `/api/tenants/${tenantId}/invites`,
      { email, role }
    )
    return response.invite
  },

  /**
   * Revoke invite
   */
  async revokeInvite(tenantId: string, inviteId: string): Promise<void> {
    await apiDelete(`/api/tenants/${tenantId}/invites/${inviteId}`)
  }
}
