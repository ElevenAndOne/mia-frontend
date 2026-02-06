import { useState, useRef } from 'react'
import { useSession } from '../contexts/session-context'
import { useTheme } from '../contexts/theme-context'
import { Popover } from '../features/overlay'
import { Icon } from './icon'
import { MenuItemButton } from './menu-item-button'
import { SegmentedControl, type SegmentedControlOption } from './segmented-control'
import { UserAvatar } from './user-avatar'

interface SidebarUserMenuProps {
  onIntegrationsClick?: () => void
  onHelpClick?: () => void
  onWorkspaceSettings?: () => void
  onLogout: () => void
}

export const SidebarUserMenu = ({
  onIntegrationsClick,
  onHelpClick,
  onWorkspaceSettings,
  onLogout
}: SidebarUserMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const { user } = useSession()
  const { theme, setTheme } = useTheme()

  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Icon.monitor_01 size={16} /> },
    { value: 'light', label: 'Light', icon: <Icon.sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Icon.moon_01 size={16} /> },
  ]

  const handleLogout = () => {
    setIsOpen(false)
    onLogout()
  }

  const handleIntegrations = () => {
    setIsOpen(false)
    onIntegrationsClick?.()
  }

  const handleHelp = () => {
    setIsOpen(false)
    onHelpClick?.()
  }

  const handleWorkspaceSettings = () => {
    setIsOpen(false)
    onWorkspaceSettings?.()
  }

  const handleThemeChange = (value: typeof theme) => {
    setTheme(value)
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none focus:ring-2 focus:ring-utility-info-500 focus:ring-offset-2 rounded-full"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`User menu for ${user?.name || 'User'}`}
      >
        <UserAvatar
          name={user?.name || 'User'}
          imageUrl={user?.picture_url}
          size="sm"
        />
      </button>

      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={triggerRef}
        placement="right-end"
        className="w-64"
      >
        {/* User Header */}
        <div className="px-4 py-4 border-b border-tertiary">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={user?.name || 'User'}
              imageUrl={user?.picture_url}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <p className="label-md text-primary truncate">
                {user?.name || 'User'}
              </p>
              <p className="paragraph-sm text-tertiary truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2" role="menu">
          {onWorkspaceSettings && (
            <MenuItemButton
              onClick={handleWorkspaceSettings}
              icon={<Icon.settings_01 size={18} />}
              label="Workspace Settings"
            />
          )}

          {onIntegrationsClick && (
            <MenuItemButton
              onClick={handleIntegrations}
              icon={<Icon.globe_01 size={18} />}
              label="Integrations"
            />
          )}

          {onHelpClick && (
            <MenuItemButton
              onClick={handleHelp}
              icon={<Icon.help_circle size={18} />}
              label="Help"
            />
          )}

          <div className="px-3 py-2.5">
            <SegmentedControl
              options={themeOptions}
              value={theme}
              onChange={handleThemeChange}
              fullWidth
            />
          </div>

          <div className="border-t border-tertiary my-1" />

          <MenuItemButton
            onClick={handleLogout}
            icon={<Icon.log_out_01 size={18} />}
            label="Sign Out"
            variant="danger"
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-tertiary">
          <p className="paragraph-xs text-quaternary">
            v1.0.0
          </p>
        </div>
      </Popover>
    </>
  )
}
