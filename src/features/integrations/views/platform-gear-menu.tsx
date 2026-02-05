import { useState, useRef, useMemo } from 'react'
import { useToast } from '../../../contexts/toast-context'
import { Dropdown, Modal, type DropdownItem } from '../../overlay'
import { usePlatformDisconnect } from '../hooks/use-platform-disconnect'
import { IconButton } from '../../../components/icon-button'
import { Icon } from '../../../components/icon'

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
  onDisconnectSuccess,
}: PlatformGearMenuProps) => {
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { isDisconnecting, handleDisconnect } = usePlatformDisconnect({
    sessionId,
    platformId,
    onSuccess: () => {
      setShowConfirmDisconnect(false)
      onDisconnectSuccess()
    },
    onError: () => {
      showToast('error', `Failed to disconnect ${platformName}. Please try again.`)
    },
  })

  // Platforms that support adding multiple accounts
  const supportsMultiAccount = ['brevo', 'hubspot', 'mailchimp'].includes(platformId)

  // OAuth platforms that support reconnecting (to refresh credentials / link to workspace)
  const supportsReconnect = ['google', 'meta', 'ga4', 'hubspot', 'mailchimp'].includes(platformId)

  // All platforms can be disconnected, including Google Ads
  // This allows users to clear invalid connections (e.g., when google_ads_id is set but no valid account exists)
  const canDisconnect = true

  // Build dropdown items based on platform capabilities
  const menuItems: DropdownItem[] = useMemo(() => {
    const items: DropdownItem[] = [
      {
        id: 'manage',
        label: 'Manage Accounts',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            />
          </svg>
        ),
        onClick: onManage,
      },
    ]

    if (supportsReconnect && onReconnect) {
      items.push({
        id: 'reconnect',
        label: 'Reconnect',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        ),
        onClick: onReconnect,
      })
    }

    if (supportsMultiAccount && onAddAccount) {
      items.push({
        id: 'add-account',
        label: 'Add Account',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        ),
        onClick: onAddAccount,
      })
    }

    if (canDisconnect) {
      items.push({ id: 'divider', label: '', onClick: () => {}, divider: true })
      items.push({
        id: 'disconnect',
        label: 'Disconnect',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        ),
        onClick: () => setShowConfirmDisconnect(true),
        destructive: true,
      })
    }

    return items
  }, [supportsReconnect, supportsMultiAccount, canDisconnect, onManage, onReconnect, onAddAccount])

  const handleDisconnectConfirm = async () => {
    await handleDisconnect()
  }

  if (!isConnected) return null

  return (
    <div className="relative">
      {/* Gear Icon Button */}
      <IconButton 
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="w-5 h-5 text-primary hover:opacity-70 transition-opacity"
        title={`${platformName} options`}
        disabled={isDisconnecting}>
          <Icon.dots_vertical />
      </IconButton>

      {/* Dropdown Menu */}
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={buttonRef}
        items={menuItems}
        placement="bottom-end"
      />

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmDisconnect}
        onClose={() => setShowConfirmDisconnect(false)}
        size="sm"
        showCloseButton={false}
        panelClassName="p-6"
      >
        <h3 className="label-bg text-primary mb-2">Disconnect {platformName}?</h3>
        <p className="paragraph-sm text-tertiary mb-4">
          This will remove your credentials. You'll need to re-authenticate to use {platformName} again.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirmDisconnect(false)}
            disabled={isDisconnecting}
            className="flex-1 px-4 py-2 border border-primary rounded-lg subheading-md text-secondary hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDisconnectConfirm}
            disabled={isDisconnecting}
            className="flex-1 px-4 py-2 bg-error-solid text-primary-onbrand rounded-lg subheading-md hover:bg-error-solid-hover disabled:opacity-50"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default PlatformGearMenu
