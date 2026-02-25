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
