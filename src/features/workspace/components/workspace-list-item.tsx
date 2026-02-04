import type { KeyboardEvent, ReactNode } from 'react'
import { Icon } from '../../../components/icon'
import type { Workspace } from '../types'
import { WorkspaceRoleIcon } from './workspace-role-icon'

interface WorkspaceListItemProps {
  workspace: Workspace
  isActive: boolean
  isSwitching: boolean
  onSelect: (tenantId: string) => void
  variant?: 'compact' | 'detailed'
  className?: string
  dataAttribute?: string
  disabled?: boolean
  disableWhenActive?: boolean
  activeClassName?: string
  inactiveClassName?: string
  showStatusIndicator?: boolean
  showRoleIcon?: boolean
  useGradientAvatar?: boolean
  avatarClassName?: string
  avatarTextClassName?: string
  titleClassName?: string
  titleSuffix?: ReactNode
  details?: ReactNode
  trailing?: ReactNode
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
}

export const WorkspaceListItem = ({
  workspace,
  isActive,
  isSwitching,
  onSelect,
  variant = 'detailed',
  className = '',
  dataAttribute,
  disabled = false,
  disableWhenActive = true,
  activeClassName = 'bg-secondary border border-secondary',
  inactiveClassName = 'hover:bg-secondary',
  showStatusIndicator = true,
  showRoleIcon = true,
  useGradientAvatar = true,
  avatarClassName = '',
  avatarTextClassName = '',
  titleClassName = '',
  titleSuffix,
  details,
  trailing,
  onKeyDown,
}: WorkspaceListItemProps) => {
  const showDetails = variant === 'detailed'
  const isDisabled = disabled || isSwitching || (disableWhenActive && isActive)
  const platformCount = workspace.connected_platforms.length
  const resolvedDetails = details ?? (showDetails ? (
    <div className="flex items-center gap-2 paragraph-xs text-quaternary">
      <span>
        {workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}
      </span>
      {platformCount > 0 && (
        <>
          <span>·</span>
          <span>
            {platformCount} platform{platformCount !== 1 ? 's' : ''}
          </span>
        </>
      )}
    </div>
  ) : null)
  const trailingContent = trailing ?? (showStatusIndicator ? (
    isActive ? (
      <Icon.check size={20} className="text-utility-info-500 shrink-0" />
    ) : isSwitching ? (
      <div className="w-5 h-5 border-2 border-primary border-t-utility-brand-600 rounded-full animate-spin shrink-0" />
    ) : null
  ) : null)
  const avatarGradientClasses = useGradientAvatar ? 'bg-linear-to-br from-utility-info-500 to-utility-purple-600' : ''

  return (
    <button
      type="button"
      data-workspace-item={dataAttribute}
      onClick={() => onSelect(workspace.tenant_id)}
      onKeyDown={onKeyDown}
      disabled={isDisabled}
      className={`w-full px-3 py-2 text-left rounded-lg flex items-center gap-3 paragraph-sm transition-colors ${
        isActive ? activeClassName : inactiveClassName
      } ${className}`.trim()}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white label-sm shrink-0 ${avatarGradientClasses} ${avatarClassName} ${avatarTextClassName}`.trim()}
      >
        {workspace.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`subheading-md text-primary truncate ${titleClassName}`.trim()}>{workspace.name}</span>
          {titleSuffix}
          {showRoleIcon && <WorkspaceRoleIcon role={workspace.role} />}
        </div>
        {resolvedDetails}
      </div>

      {trailingContent}
    </button>
  )
}
