import { useState, useRef } from 'react'
import { useSession } from '../contexts/session-context'
import { Popover } from '../features/overlay'
import { Icon } from './icon'

interface SidebarUserMenuProps {
  onIntegrationsClick?: () => void
  onWorkspaceSettings?: () => void
  onLogout: () => void
}

export const SidebarUserMenu = ({
  onIntegrationsClick,
  onWorkspaceSettings,
  onLogout
}: SidebarUserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const { user } = useSession()

  const handleLogout = () => {
    setIsOpen(false)
    onLogout()
  }

  const handleIntegrations = () => {
    setIsOpen(false)
    onIntegrationsClick?.()
  }

  const handleWorkspaceSettings = () => {
    setIsOpen(false)
    onWorkspaceSettings?.()
  }

  const renderAvatar = (size: 'sm' | 'lg' = 'sm') => {
    const sizeClasses = size === 'lg' ? 'w-12 h-12 text-lg' : 'w-8 h-8 text-sm'

    if (user?.picture_url) {
      return (
        <img
          src={user.picture_url}
          alt={user.name || 'User'}
          className={`${sizeClasses} rounded-full object-cover`}
        />
      )
    }

    return (
      <div className={`${sizeClasses} rounded-full bg-yellow-400 flex items-center justify-center font-medium text-yellow-900`}>
        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`User menu for ${user?.name || 'User'}`}
      >
        {renderAvatar('sm')}
      </button>

      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={triggerRef}
        placement="right-end"
        className="w-64"
      >
        {/* User Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {renderAvatar('lg')}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2" role="menu">
          {onWorkspaceSettings && (
            <button
              onClick={handleWorkspaceSettings}
              className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
              role="menuitem"
            >
              <svg className="w-[18px] h-[18px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Workspace Settings</span>
            </button>
          )}

          {onIntegrationsClick && (
            <button
              onClick={handleIntegrations}
              className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition-colors"
              role="menuitem"
            >
              <Icon.globe_01 size={18} className="text-gray-500" />
              <span>Integrations</span>
            </button>
          )}

          <div className="border-t border-gray-100 my-1" />

          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
            role="menuitem"
          >
            <Icon.log_out_01 size={18} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            v1.0.0
          </p>
        </div>
      </Popover>
    </>
  )
}
