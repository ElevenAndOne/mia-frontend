import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import * as Dialog from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { apiFetch } from '@/utils/api'

interface PlatformGearMenuProps {
  platformId: string
  platformName: string
  isConnected: boolean
  sessionId: string | null
  onManage?: () => void
  onAddAccount?: () => void
  onReconnect?: () => void
  onDisconnectSuccess?: () => void
}

// Shared menu item component
const MenuItem = ({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) => (
  <button
    onClick={onClick}
    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
      danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    {icon}
    {label}
  </button>
)

// Icons as components
const icons = {
  gear: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  refresh: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
  ),
  disconnect: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
}

const PlatformGearMenu = ({
  platformId,
  platformName,
  isConnected,
  sessionId,
  onManage,
  onAddAccount,
  onReconnect,
  onDisconnectSuccess,
}: PlatformGearMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const supportsMultiAccount = ['brevo', 'hubspot', 'mailchimp'].includes(platformId)
  const supportsReconnect = ['google', 'meta', 'ga4', 'hubspot', 'mailchimp'].includes(platformId)
  const canDisconnect = platformId !== 'google'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const openMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({ top: rect.bottom + 4, left: rect.right - 176 })
    }
    setIsOpen(true)
  }

  const closeAndRun = (fn?: () => void) => {
    setIsOpen(false)
    fn?.()
  }

  const handleDisconnect = async () => {
    if (!sessionId) return
    setIsDisconnecting(true)
    try {
      const response = await apiFetch(`/api/platform/${platformId}/disconnect`, {
        method: 'POST',
        headers: { 'X-Session-ID': sessionId },
      })
      if (!response.ok) throw new Error('Failed to disconnect')
      setShowConfirmDisconnect(false)
      onDisconnectSuccess?.()
    } catch (error) {
      console.error(`Error disconnecting ${platformName}:`, error)
      alert(`Failed to disconnect ${platformName}. Please try again.`)
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (!isConnected) return null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); openMenu() }}
        className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
        title={`${platformName} options`}
        disabled={isDisconnecting}
      >
        {icons.gear}
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-100 py-1"
          style={menuPosition}
        >
          {onManage && <MenuItem icon={icons.users} label="Manage Accounts" onClick={() => closeAndRun(onManage)} />}
          {supportsReconnect && onReconnect && <MenuItem icon={icons.refresh} label="Reconnect" onClick={() => closeAndRun(onReconnect)} />}
          {supportsMultiAccount && onAddAccount && <MenuItem icon={icons.plus} label="Add Account" onClick={() => closeAndRun(onAddAccount)} />}
          {canDisconnect && (
            <>
              <div className="border-t border-gray-200 my-1" />
              <MenuItem icon={icons.disconnect} label="Disconnect" onClick={() => closeAndRun(() => setShowConfirmDisconnect(true))} danger />
            </>
          )}
        </div>,
        document.body
      )}

      <Dialog.Root isOpen={showConfirmDisconnect} onClose={() => setShowConfirmDisconnect(false)} disabled={isDisconnecting}>
        <Dialog.Overlay>
          <Dialog.Content size="sm">
            <Dialog.Body className="pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Disconnect {platformName}?</h3>
              <p className="text-sm text-gray-600">
                This will remove your credentials. You'll need to re-authenticate to use {platformName} again.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Close disabled={isDisconnecting}>Cancel</Dialog.Close>
              <Button
                color="red"
                onClick={handleDisconnect}
                isLoading={isDisconnecting}
                className="flex-1"
              >
                Disconnect
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Root>
    </>
  )
}

export default PlatformGearMenu
