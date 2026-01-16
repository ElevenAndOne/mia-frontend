import PlatformGearMenu from './platform-gear-menu'

export interface PlatformCardProps {
  platform: {
    id: string
    name: string
    description: string
    icon: string
  }
  status: {
    connected: boolean
    dataPoints?: number
    lastSync?: string
    autoSync?: boolean
  }
  isSelected?: boolean
  isDisabled?: boolean
  onSelect?: (platformId: string) => void
  onConnect?: (platformId: string) => void
  onManage?: (platformId: string) => void
  onReconnect?: (platformId: string) => void
  onAddAccount?: (platformId: string) => void
  onDisconnectSuccess?: () => void
  sessionId: string | null
  connectingId?: string | null
}

/**
 * Displays a single platform integration card.
 * Shows connection status, data points, and provides actions based on connection state.
 */
const PlatformCard = ({
  platform,
  status,
  isSelected = false,
  isDisabled = false,
  onSelect,
  onConnect,
  onManage,
  onReconnect,
  onAddAccount,
  onDisconnectSuccess,
  sessionId,
  connectingId
}: PlatformCardProps) => {
  const { id, name, description, icon } = platform
  const { connected, dataPoints, lastSync, autoSync } = status

  const isConnecting = connectingId === id

  if (connected) {
    // Connected platform card
    return (
      <div className="w-full">
        <div
          onClick={() => onSelect?.(id)}
          className={`w-full text-left transition-all ${
            isSelected
              ? 'bg-blue-50 border-2 border-blue-500'
              : 'bg-white border-2 border-gray-200'
          } rounded-xl p-3 overflow-hidden cursor-pointer hover:border-blue-300 ${
            isDisabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <img src={icon} alt="" className="w-10 h-10" loading="lazy" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-gray-900 truncate">{name}</h3>
              </div>
              <p className="text-xs text-gray-500 truncate">{description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Platform Gear Menu - unified dropdown for all platforms */}
              <PlatformGearMenu
                platformId={id}
                platformName={name}
                isConnected={connected}
                sessionId={sessionId}
                onManage={onManage ? () => onManage(id) : undefined}
                onReconnect={
                  // OAuth platforms can reconnect to refresh credentials / link to workspace
                  ['google', 'meta', 'ga4', 'hubspot', 'mailchimp'].includes(id) && onReconnect
                    ? () => onReconnect(id)
                    : undefined
                }
                onAddAccount={
                  ['brevo', 'hubspot', 'mailchimp'].includes(id) && onAddAccount
                    ? () => onAddAccount(id)
                    : undefined
                }
                onDisconnectSuccess={onDisconnectSuccess}
              />
              {isSelected ? (
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-500">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <img src="/icons/checkmark-circle-outline.svg" alt="" className="w-5 h-5" />
              )}
            </div>
          </div>
          {dataPoints && (
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pl-[52px]">
              <span>{dataPoints.toLocaleString()} data points</span>
              <span>Last: {lastSync}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Available platform card (not connected)
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img src={icon} alt="" className="w-10 h-10 opacity-60" loading="lazy" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-semibold text-sm text-gray-900 truncate">{name}</h3>
            <p className="text-xs text-gray-500 truncate">{description}</p>
          </div>
        </div>
        <button
          onClick={() => onConnect?.(id)}
          disabled={isDisabled || isConnecting || id === 'linkedin' || id === 'tiktok'}
          className={`px-4 py-2 rounded-lg font-medium text-xs flex-shrink-0 ${
            id === 'linkedin' || id === 'tiktok'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isConnecting
              ? 'bg-gray-600 text-white cursor-wait'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {id === 'linkedin' || id === 'tiktok'
            ? 'Soon'
            : isConnecting
            ? 'Connecting...'
            : 'Connect'}
        </button>
      </div>
    </div>
  )
}

export default PlatformCard
