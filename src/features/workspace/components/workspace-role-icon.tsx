import type { WorkspaceRole } from '../utils/role'

interface WorkspaceRoleIconProps {
  role: WorkspaceRole
  variant?: 'inline' | 'badge'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const INLINE_ICON_STYLES: Record<string, string> = {
  owner: 'text-warning',
  admin: 'text-utility-info-500',
  analyst: 'text-success',
  viewer: 'text-placeholder-subtle',
  default: 'text-placeholder-subtle',
}

const BADGE_STYLES: Record<string, string> = {
  owner: 'bg-warning-primary text-warning',
  admin: 'bg-utility-info-100 text-utility-info-600',
  analyst: 'bg-success-secondary text-success',
  viewer: 'bg-tertiary text-tertiary',
  default: 'bg-utility-purple-200 text-utility-purple-600',
}

const ICON_SIZE_CLASSES: Record<NonNullable<WorkspaceRoleIconProps['size']>, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-6 h-6',
}

const BADGE_SIZE_CLASSES: Record<NonNullable<WorkspaceRoleIconProps['size']>, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

const getRoleKey = (role: WorkspaceRole) => {
  if (role === 'owner' || role === 'admin' || role === 'analyst' || role === 'viewer') {
    return role
  }
  return 'default'
}

export const WorkspaceRoleIcon = ({
  role,
  variant = 'inline',
  size = variant === 'inline' ? 'sm' : 'lg',
  className = '',
}: WorkspaceRoleIconProps) => {
  const roleKey = getRoleKey(role)
  const iconClasses = `${ICON_SIZE_CLASSES[size]} ${
    variant === 'inline' ? INLINE_ICON_STYLES[roleKey] : BADGE_STYLES[roleKey]
  } ${className}`.trim()

  const icon = (() => {
    switch (roleKey) {
      case 'owner':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20" aria-label="Owner">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      case 'admin':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20" aria-label="Admin">
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )
      case 'analyst':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20" aria-label="Analyst">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
        )
      case 'viewer':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20" aria-label="Viewer">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path
              fillRule="evenodd"
              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clipRule="evenodd"
            />
          </svg>
        )
      default:
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 20 20" aria-label="Member">
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        )
    }
  })()

  if (variant === 'inline') return icon

  return (
    <div className={`${BADGE_SIZE_CLASSES[size]} rounded-full flex items-center justify-center ${BADGE_STYLES[roleKey]}`}>
      {icon}
    </div>
  )
}
