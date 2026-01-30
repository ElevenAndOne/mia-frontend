import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '../utils/api'

interface PlatformGearMenuProps {
  platformId: string
  platformName: string
  isConnected: boolean
  sessionId: string | null
  onManage: () => void
  onAddAccount?: () => void
  onReconnect?: () => void
  onDisconnectSuccess: () => void
}

const PlatformGearMenu = ({
  platformId,
  platformName,
  isConnected,
  sessionId,
  onManage,
  onAddAccount,
  onReconnect,
  onDisconnectSuccess
}: PlatformGearMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Platforms that support adding multiple accounts
  const supportsMultiAccount = ['brevo', 'hubspot', 'mailchimp'].includes(platformId)

  // OAuth platforms that support reconnecting (to refresh credentials / link to workspace)
  const supportsReconnect = ['google', 'meta', 'ga4', 'hubspot', 'mailchimp'].includes(platformId)

  // Google Ads disconnect is disabled - it's the main account switcher and removing
  // credentials would break all linked accounts. Users can manage accounts instead.
  const canDisconnect = platformId !== 'google'

  // Calculate menu position when opening
  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 176 // 176px = w-44 (11rem)
      })
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleDisconnectClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    setShowConfirmDisconnect(true)
  }

  const handleDisconnectConfirm = async () => {
    if (!sessionId) return

    setIsDisconnecting(true)
    try {
      const response = await apiFetch(`/api/platform/${platformId}/disconnect`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to disconnect')
      }

      console.log(`[PLATFORM-DISCONNECT] ${platformName} disconnected successfully`)
      setShowConfirmDisconnect(false)
      onDisconnectSuccess()
    } catch (error) {
      console.error(`[PLATFORM-DISCONNECT] Error disconnecting ${platformName}:`, error)
      alert(`Failed to disconnect ${platformName}. Please try again.`)
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (!isConnected) return null

  return (
    <div className="relative">
      {/* Gear Icon Button */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          updateMenuPosition()
          setIsOpen(!isOpen)
        }}
        className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
        title={`${platformName} options`}
        disabled={isDisconnecting}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Dropdown Menu - rendered via portal to avoid overflow clipping */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-100 py-1"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {/* Manage Accounts */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
              onManage()
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            Manage Accounts
          </button>

          {/* Reconnect - for OAuth platforms to refresh/link credentials to workspace */}
          {supportsReconnect && onReconnect && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
                onReconnect()
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reconnect
            </button>
          )}

          {/* Add Account - only for multi-account platforms */}
          {supportsMultiAccount && onAddAccount && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
                onAddAccount()
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Account
            </button>
          )}

          {/* Divider + Disconnect - only show if disconnect is allowed */}
          {canDisconnect && (
            <>
              <div className="border-t border-gray-200 my-1" />
              <button
                onClick={handleDisconnectClick}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmDisconnect && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-200" onClick={() => setShowConfirmDisconnect(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Disconnect {platformName}?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will remove your credentials. You'll need to re-authenticate to use {platformName} again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDisconnect(false)}
                disabled={isDisconnecting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnectConfirm}
                disabled={isDisconnecting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default PlatformGearMenu
