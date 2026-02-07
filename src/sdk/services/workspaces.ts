/**
 * Workspaces Service
 * mia.workspaces - Workspace/tenant management domain
 */

import type { Transport } from '../internal/transport';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  InviteDetails,
  WorkspaceRole,
  WorkspaceIntegrations,
  RawWorkspaceResponse,
  RawWorkspaceListResponse,
  RawCurrentWorkspaceResponse,
  RawWorkspaceMemberResponse,
  RawWorkspaceInviteResponse,
  RawInviteDetailsResponse,
  RawAcceptInviteResponse,
  RawSwitchWorkspaceResponse,
  RawIntegrationsResponse,
} from '../types/workspaces';

export class WorkspacesService {
  private transport: Transport;

  constructor(transport: Transport) {
    this.transport = transport;
  }

  // ==================== WORKSPACE CRUD ====================

  /**
   * List all workspaces for the current user
   *
   * @example
   * ```typescript
   * try {
   *   const workspaces = await mia.workspaces.list();
   *   setWorkspaces(workspaces);
   * } catch (error) {
   *   if (isMiaSDKError(error)) {
   *     setError('Failed to load workspaces');
   *   }
   * }
   * ```
   */
  async list(): Promise<Workspace[]> {
    const response =
      await this.transport.request<RawWorkspaceListResponse>('/api/tenants');
    return (response.tenants || []).map(this.mapWorkspace);
  }

  /**
   * Get current active workspace
   */
  async getCurrent(): Promise<Workspace | null> {
    const response = await this.transport.request<RawCurrentWorkspaceResponse>(
      '/api/tenants/current'
    );

    return response.active_tenant
      ? this.mapWorkspace(response.active_tenant)
      : null;
  }

  /**
   * Get workspace by ID
   */
  async get(tenantId: string): Promise<Workspace> {
    const raw = await this.transport.request<RawWorkspaceResponse>(
      `/api/tenants/${tenantId}`
    );
    return this.mapWorkspace(raw);
  }

  /**
   * Create new workspace
   */
  async create(name: string): Promise<Workspace> {
    const response = await this.transport.request<{
      tenant_id: string;
      name: string;
      slug: string;
    }>('/api/tenants', {
      method: 'POST',
      body: { name },
    });

    return {
      tenantId: response.tenant_id,
      name: response.name,
      slug: response.slug,
      role: 'owner',
      onboardingCompleted: false,
      connectedPlatforms: [],
      memberCount: 1,
    };
  }

  /**
   * Update workspace
   */
  async update(tenantId: string, name: string): Promise<Workspace> {
    const raw = await this.transport.request<RawWorkspaceResponse>(
      `/api/tenants/${tenantId}`,
      {
        method: 'PUT',
        body: { name },
      }
    );
    return this.mapWorkspace(raw);
  }

  /**
   * Delete workspace
   */
  async delete(tenantId: string): Promise<void> {
    await this.transport.request(`/api/tenants/${tenantId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Switch to a different workspace
   */
  async switch(tenantId: string): Promise<Workspace> {
    const response = await this.transport.request<RawSwitchWorkspaceResponse>(
      '/api/tenants/switch',
      {
        method: 'POST',
        body: { tenant_id: tenantId },
      }
    );

    return {
      tenantId,
      name: response.name || '',
      slug: response.slug || '',
      role: (response.role || 'member') as WorkspaceRole,
      onboardingCompleted: response.onboarding_completed || false,
      connectedPlatforms: response.connected_platforms || [],
      memberCount: 1,
    };
  }

  /**
   * Get workspace integrations status
   */
  async getIntegrations(tenantId: string): Promise<WorkspaceIntegrations> {
    const response = await this.transport.request<RawIntegrationsResponse>(
      `/api/tenants/${tenantId}/integrations`
    );

    const status = response.platform_status || {};
    return {
      googleAds: status.google_ads || status.google || false,
      ga4: status.ga4 || false,
      metaAds: status.meta_ads || status.meta || false,
      facebookOrganic: status.facebook_organic || false,
      brevo: status.brevo || false,
      hubspot: status.hubspot || false,
      mailchimp: status.mailchimp || false,
    };
  }

  // ==================== MEMBERS ====================

  /**
   * List workspace members
   */
  async getMembers(tenantId: string): Promise<WorkspaceMember[]> {
    const response =
      await this.transport.request<RawWorkspaceMemberResponse[]>(
        `/api/tenants/${tenantId}/members`
      );

    return (response || []).map((m) => ({
      userId: m.user_id,
      email: m.email,
      name: m.name,
      pictureUrl: m.picture_url,
      role: m.role as WorkspaceRole,
      status: m.status as 'active' | 'pending',
      joinedAt: m.joined_at,
    }));
  }

  /**
   * Remove member from workspace
   */
  async removeMember(tenantId: string, userId: string): Promise<void> {
    await this.transport.request(`/api/tenants/${tenantId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    tenantId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<void> {
    await this.transport.request(
      `/api/tenants/${tenantId}/members/${userId}/role`,
      {
        method: 'PUT',
        body: { role },
      }
    );
  }

  // ==================== INVITES ====================

  /**
   * List workspace invites
   */
  async getInvites(tenantId: string): Promise<WorkspaceInvite[]> {
    const response =
      await this.transport.request<RawWorkspaceInviteResponse[]>(
        `/api/tenants/${tenantId}/invites`
      );

    return (response || []).map((i) => ({
      inviteId: i.invite_id,
      email: i.email,
      role: i.role as WorkspaceRole,
      status: i.status as 'pending' | 'accepted' | 'expired',
      expiresAt: i.expires_at,
      createdAt: i.created_at,
      isLinkInvite: i.is_link_invite || false,
    }));
  }

  /**
   * Create workspace invite
   */
  async createInvite(
    tenantId: string,
    role: WorkspaceRole,
    email?: string
  ): Promise<WorkspaceInvite> {
    const response =
      await this.transport.request<RawWorkspaceInviteResponse>(
        `/api/tenants/${tenantId}/invites`,
        {
          method: 'POST',
          body: { role, ...(email ? { email } : {}) },
        }
      );

    return {
      inviteId: response.invite_id,
      email: response.email,
      role: response.role as WorkspaceRole,
      status: response.status as 'pending' | 'accepted' | 'expired',
      expiresAt: response.expires_at,
      createdAt: response.created_at,
      isLinkInvite: response.is_link_invite || false,
    };
  }

  /**
   * Revoke workspace invite
   */
  async revokeInvite(tenantId: string, inviteId: string): Promise<void> {
    await this.transport.request(
      `/api/tenants/${tenantId}/invites/${inviteId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Get invite details (public - no auth required)
   */
  async getInviteDetails(inviteId: string): Promise<InviteDetails> {
    const response = await this.transport.request<RawInviteDetailsResponse>(
      `/api/tenants/invites/${inviteId}/details`,
      { skipAuth: true }
    );

    return {
      inviteId: response.invite_id,
      workspaceName: response.workspace_name || response.tenant_name || 'Workspace',
      inviterName: response.inviter_name,
      role: response.role as WorkspaceRole,
      isValid: response.is_valid,
    };
  }

  /**
   * Accept workspace invite
   */
  async acceptInvite(inviteId: string): Promise<{
    tenantId: string;
    role?: string;
    skipAccountSelection: boolean;
    requiresAccountSelection: boolean;
    onboardingCompleted: boolean;
    nextAction?: string;
  }> {
    const response = await this.transport.request<RawAcceptInviteResponse>(
      `/api/tenants/invites/${inviteId}/accept`,
      { method: 'POST' }
    );
    return {
      tenantId: response.tenant_id,
      role: response.role,
      skipAccountSelection: response.skip_account_selection ?? false,
      requiresAccountSelection: response.requires_account_selection ?? false,
      onboardingCompleted: response.onboarding_completed ?? false,
      nextAction: response.next_action,
    };
  }

  /**
   * Get pending invites for current user
   */
  async getPendingInvites(): Promise<WorkspaceInvite[]> {
    const response =
      await this.transport.request<RawWorkspaceInviteResponse[]>(
        '/api/tenants/invites/pending'
      );

    return (response || []).map((i) => ({
      inviteId: i.invite_id,
      email: i.email,
      role: i.role as WorkspaceRole,
      status: i.status as 'pending' | 'accepted' | 'expired',
      expiresAt: i.expires_at,
      createdAt: i.created_at,
      isLinkInvite: false,
    }));
  }

  private mapWorkspace(raw: RawWorkspaceResponse): Workspace {
    return {
      tenantId: raw.tenant_id,
      name: raw.name,
      slug: raw.slug,
      role: raw.role as WorkspaceRole,
      onboardingCompleted: raw.onboarding_completed,
      connectedPlatforms: raw.connected_platforms || [],
      memberCount: raw.member_count || 1,
    };
  }
}
