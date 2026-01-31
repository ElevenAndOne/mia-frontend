import { useState, useRef, useCallback } from 'react'
import { useSession } from '../contexts/session-context'
import { Popover } from '../features/overlay'
import { Icon } from './icon'
import type { Workspace } from '../features/workspace/types'

export const SidebarWorkspaceSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const { activeWorkspace, availableWorkspaces, switchWorkspace } = useSession()

  const handleSwitch = useCallback(async (tenantId: string) => {
    if (tenantId === activeWorkspace?.tenant_id) return

    setIsSwitching(true)
    setSwitchingId(tenantId)

    try {
      const success = await switchWorkspace(tenantId)
      if (success) {
        setIsOpen(false)
        window.location.reload()
      }
    } catch (error) {
      console.error('[SIDEBAR-WORKSPACE-SWITCHER] Switch error:', error)
    } finally {
      setIsSwitching(false)
      setSwitchingId(null)
    }
  }, [activeWorkspace, switchWorkspace])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" aria-label="Owner">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      case 'admin':
        return (
          <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20" aria-label="Admin">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'analyst':
        return (
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-label="Analyst">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
        )
      case 'viewer':
        return (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-label="Viewer">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const items = document.querySelectorAll<HTMLButtonElement>('[data-workspace-item]')
    const itemsArray = Array.from(items)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        itemsArray[(index + 1) % itemsArray.length]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        itemsArray[(index - 1 + itemsArray.length) % itemsArray.length]?.focus()
        break
      case 'Home':
        e.preventDefault()
        itemsArray[0]?.focus()
        break
      case 'End':
        e.preventDefault()
        itemsArray[itemsArray.length - 1]?.focus()
        break
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Switch workspace. Current: ${activeWorkspace?.name || 'None'}`}
      >
        {activeWorkspace?.name?.charAt(0).toUpperCase() || 'W'}
      </button>

      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={triggerRef}
        placement="right-start"
        className="w-72"
      >

        {/* Workspace List */}
        <div className="px-2 py-2 max-h-64 overflow-y-auto" role="menu">
          {availableWorkspaces.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              No workspaces yet
            </div>
          ) : (
            availableWorkspaces.map((workspace: Workspace, index: number) => (
              <button
                key={workspace.tenant_id}
                data-workspace-item
                onClick={() => handleSwitch(workspace.tenant_id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={isSwitching || workspace.tenant_id === activeWorkspace?.tenant_id}
                className={`w-full px-3 py-2 text-left rounded-lg flex items-center gap-3 text-sm transition-colors ${
                  workspace.tenant_id === activeWorkspace?.tenant_id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                role="menuitem"
              >
                {/* Workspace Icon */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>

                {/* Workspace Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900 truncate">{workspace.name}</span>
                    {getRoleIcon(workspace.role)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}</span>
                    {workspace.connected_platforms.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{workspace.connected_platforms.length} platform{workspace.connected_platforms.length !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Active Indicator or Loading */}
                {workspace.tenant_id === activeWorkspace?.tenant_id ? (
                  <Icon.check size={20} className="text-blue-500 shrink-0" />
                ) : switchingId === workspace.tenant_id ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin shrink-0" />
                ) : null}
              </button>
            ))
          )}
        </div>

      </Popover>
    </>
  )
}
