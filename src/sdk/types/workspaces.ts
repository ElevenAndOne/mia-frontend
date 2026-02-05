/**
 * Workspace/Tenant Types
 */

export type WorkspaceRole = 'owner' | 'admin' | 'analyst' | 'viewer';

export interface Workspace {
  tenantId: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  onboardingCompleted: boolean;
  connectedPlatforms: string[];
  memberCount: number;
}

export interface WorkspaceMember {
  userId: string;
  email: string | null;
  name: string | null;
  pictureUrl: string | null;
  role: WorkspaceRole;
  status: 'active' | 'pending';
  joinedAt: string | null;
}

export interface WorkspaceInvite {
  inviteId: string;
  email: string | null;
  role: WorkspaceRole;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string | null;
  isLinkInvite: boolean;
}

export interface InviteDetails {
  inviteId: string;
  workspaceName: string;
  inviterName: string | null;
  role: WorkspaceRole;
  isValid: boolean;
}

export interface WorkspaceIntegrations {
  googleAds: boolean;
  ga4: boolean;
  metaAds: boolean;
  facebookOrganic: boolean;
  brevo: boolean;
  hubspot: boolean;
  mailchimp: boolean;
}

/**
 * Raw API response types (internal use)
 */
export interface RawWorkspaceResponse {
  tenant_id: string;
  name: string;
  slug: string;
  role: string;
  onboarding_completed: boolean;
  connected_platforms?: string[];
  member_count?: number;
}

export interface RawWorkspaceListResponse {
  tenants: RawWorkspaceResponse[];
}

export interface RawCurrentWorkspaceResponse {
  active_tenant: RawWorkspaceResponse | null;
}

export interface RawWorkspaceMemberResponse {
  user_id: string;
  email: string | null;
  name: string | null;
  picture_url: string | null;
  role: string;
  status: string;
  joined_at: string | null;
}

export interface RawWorkspaceInviteResponse {
  invite_id: string;
  email: string | null;
  role: string;
  status: string;
  expires_at: string;
  created_at: string | null;
  is_link_invite?: boolean;
}

export interface RawInviteDetailsResponse {
  invite_id: string;
  workspace_name: string;
  inviter_name: string | null;
  role: string;
  is_valid: boolean;
}

export interface RawAcceptInviteResponse {
  tenant_id: string;
}

export interface RawSwitchWorkspaceResponse {
  name?: string;
  slug?: string;
  role?: string;
  onboarding_completed?: boolean;
  connected_platforms?: string[];
}

export interface RawIntegrationsResponse {
  platform_status: Record<string, boolean>;
}
