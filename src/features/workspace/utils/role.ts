export type WorkspaceRole = 'owner' | 'admin' | 'analyst' | 'viewer' | string

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access to manage workspace settings, members, and integrations',
  admin: 'Full access to manage workspace settings, members, and integrations',
  analyst: 'Access to view and analyze data, create reports',
  viewer: 'Read-only access to view dashboards and reports',
}

const ROLE_BADGE_CLASSES: Record<string, string> = {
  owner: 'bg-utility-warning-100 text-utility-warning-700',
  admin: 'bg-utility-info-100 text-utility-info-700',
  analyst: 'bg-utility-success-100 text-utility-success-700',
  viewer: 'bg-secondary text-secondary',
}

export const getWorkspaceRoleDescription = (role: string): string => {
  return ROLE_DESCRIPTIONS[role] || 'Access to the workspace'
}

export const getWorkspaceRoleBadgeClass = (role: string): string => {
  return ROLE_BADGE_CLASSES[role] || ROLE_BADGE_CLASSES.viewer
}

// Basic names what a person can DO, not a job title (30 Sep 2026). On WhatsApp an admin's
// posts go out; anyone else's go to the owner to approve (PUBLISHING_ROLES in the backend).
const BASIC_ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Can post',
  analyst: 'Can suggest posts',
  viewer: 'Can suggest posts',
}

const BASIC_ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Runs this profile: its posts, settings and who can use it',
  admin: 'Can make and post updates for this profile',
  analyst: 'Can suggest posts (owner approves)',
  viewer: 'Can suggest posts (owner approves)',
}

/** The name for a role: Basic says what they can do, Agency keeps the job title. */
export const getRoleLabel = (role: string, isBasic: boolean): string => {
  if (isBasic) return BASIC_ROLE_LABELS[role] || 'Can suggest posts'
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member'
}

export const getRoleDescription = (role: string, isBasic: boolean): string =>
  isBasic ? BASIC_ROLE_DESCRIPTIONS[role] || BASIC_ROLE_DESCRIPTIONS.viewer : getWorkspaceRoleDescription(role)
