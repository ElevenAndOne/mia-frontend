import { getWorkspaceRoleBadgeClass } from './role'
import type { Workspace } from '../types'
import type { WorkspaceInvite, WorkspaceMember } from '../services/workspace-settings-service'

export type WorkspaceSettingsTab = 'members' | 'invites'

export interface WorkspaceOverviewItem {
  workspace: Workspace
  isActive: boolean
  canManage: boolean
  memberLabel: string
  roleBadgeClass: string
}

export interface WorkspaceMemberRow {
  id: string
  name: string
  email: string
  role: string
  roleBadgeClass: string
  imageUrl?: string | null
  canEditRole: boolean
  canRemove: boolean
}

export interface WorkspaceInviteRow {
  id: string
  emailLabel: string
  role: string
  link: string
}

export interface WorkspacePersonRow {
  id: string
  type: 'member' | 'invite'
  name: string
  email: string
  role: string
  roleBadgeClass: string
  imageUrl?: string | null
  canEditRole: boolean
  canRemove: boolean
  inviteLink?: string
}

export const buildWorkspaceOverviewItems = (
  workspaces: Workspace[],
  activeWorkspaceId?: string | null,
): WorkspaceOverviewItem[] => {
  return workspaces.map((workspace) => ({
    workspace,
    isActive: workspace.tenant_id === activeWorkspaceId,
    canManage: workspace.role === 'owner' || workspace.role === 'admin',
    memberLabel: `${workspace.member_count} member${workspace.member_count !== 1 ? 's' : ''}`,
    roleBadgeClass: getWorkspaceRoleBadgeClass(workspace.role),
  }))
}

export const buildWorkspaceMemberRows = (
  members: WorkspaceMember[],
  options: { currentUserId?: string; canManage: boolean; isOwner: boolean },
): WorkspaceMemberRow[] => {
  return members.map((member) => {
    const name = member.name || member.email || 'Unknown'
    const email = member.email || ''
    const isCurrentUser = member.user_id === options.currentUserId
    const roleBadgeClass = getWorkspaceRoleBadgeClass(member.role)

    return {
      id: member.user_id,
      name,
      email,
      role: member.role,
      roleBadgeClass,
      imageUrl: member.picture_url,
      canEditRole: Boolean(options.isOwner && member.role !== 'owner' && !isCurrentUser),
      canRemove: Boolean(options.canManage && member.role !== 'owner' && !isCurrentUser),
    }
  })
}

export const buildWorkspaceInviteRows = (
  invites: WorkspaceInvite[],
  inviteBaseUrl: string,
): WorkspaceInviteRow[] => {
  return invites
    .filter((invite) => invite.status === 'pending')
    .map((invite) => ({
      id: invite.invite_id,
      emailLabel: invite.email || 'Anyone with link',
      role: invite.role,
      link: `${inviteBaseUrl}${invite.invite_id}`,
    }))
}

export const buildUnifiedPersonRows = (
  memberRows: WorkspaceMemberRow[],
  inviteRows: WorkspaceInviteRow[],
): WorkspacePersonRow[] => {
  const members: WorkspacePersonRow[] = memberRows.map((member) => ({
    id: member.id,
    type: 'member',
    name: member.name,
    email: member.email,
    role: member.role,
    roleBadgeClass: member.roleBadgeClass,
    imageUrl: member.imageUrl,
    canEditRole: member.canEditRole,
    canRemove: member.canRemove,
  }))

  const invites: WorkspacePersonRow[] = inviteRows.map((invite) => ({
    id: invite.id,
    type: 'invite',
    name: invite.emailLabel,
    email: invite.emailLabel,
    role: invite.role,
    roleBadgeClass: getWorkspaceRoleBadgeClass(invite.role),
    canEditRole: false,
    canRemove: true,
    inviteLink: invite.link,
  }))

  return [...members, ...invites]
}
