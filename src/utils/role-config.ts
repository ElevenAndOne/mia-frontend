/**
 * Role configuration for workspace member roles
 * Centralizes role-related styling and configuration
 */

export type Role = 'owner' | 'admin' | 'analyst' | 'viewer'

export interface RoleConfig {
  label: string
  icon: string
  badgeVariant: 'owner' | 'admin' | 'analyst' | 'viewer'
  color: string
  textColor: string
  description: string
}

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  owner: {
    label: 'Owner',
    icon: 'star',
    badgeVariant: 'owner',
    color: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    description: 'Full access to all workspace settings and billing',
  },
  admin: {
    label: 'Admin',
    icon: 'shield',
    badgeVariant: 'admin',
    color: 'bg-blue-100',
    textColor: 'text-blue-800',
    description: 'Can manage members, integrations, and workspace settings',
  },
  analyst: {
    label: 'Analyst',
    icon: 'chart',
    badgeVariant: 'analyst',
    color: 'bg-green-100',
    textColor: 'text-green-800',
    description: 'Can view and analyze data, create reports',
  },
  viewer: {
    label: 'Viewer',
    icon: 'eye',
    badgeVariant: 'viewer',
    color: 'bg-gray-100',
    textColor: 'text-gray-800',
    description: 'Read-only access to dashboards and reports',
  },
}

/**
 * Get role configuration by role name
 */
export function getRoleConfig(role: string): RoleConfig {
  return ROLE_CONFIG[role as Role] || ROLE_CONFIG.viewer
}

/**
 * Get role badge classes
 */
export function getRoleBadgeClasses(role: string): string {
  const config = getRoleConfig(role)
  return `${config.color} ${config.textColor}`
}

/**
 * Check if a role can perform admin actions
 */
export function canPerformAdminActions(role: string): boolean {
  return role === 'owner' || role === 'admin'
}

/**
 * Check if a role can manage members
 */
export function canManageMembers(role: string): boolean {
  return role === 'owner' || role === 'admin'
}

/**
 * Check if a role can modify workspace settings
 */
export function canModifyWorkspace(role: string): boolean {
  return role === 'owner' || role === 'admin'
}
