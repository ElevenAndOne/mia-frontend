import type { PlatformConfigItem } from '../../integrations/config/platforms'

interface DashboardHomePanelProps {
  userName: string
  configurationGuidance: string | null
  platformConfig: PlatformConfigItem[]
  connectedPlatforms: string[]
  selectedPlatforms: string[]
  onTogglePlatform: (platformId: string) => void
  onIntegrationsClick: () => void
  onGrowQuickClick: (platforms?: string[]) => void
  onOptimizeQuickClick: (platforms?: string[]) => void
  onProtectQuickClick: (platforms?: string[]) => void
  showMore: boolean
  onShowMore: () => void
  onShowChat: () => void
}

export const DashboardHomePanel = ({
  userName,
  configurationGuidance,
  platformConfig,
  connectedPlatforms,
  selectedPlatforms,
  onTogglePlatform,
  onIntegrationsClick,
  onGrowQuickClick,
  onOptimizeQuickClick,
  onProtectQuickClick,
  showMore,
  onShowMore,
  onShowChat,
}: DashboardHomePanelProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5 w-full max-w-sm" style={{ fontFamily: 'Geologica, system-ui, sans-serif' }}>
        <div className="text-center">
          <h2 className="paragraph-lg text-primary leading-[110%] tracking-[-0.03em] mb-1">
            Hello {userName}.
          </h2>
          <p className="paragraph-lg text-primary leading-[110%] tracking-[-0.03em]">
            How can I help today?
          </p>
        </div>

        {configurationGuidance && (
          <button
            onClick={onIntegrationsClick}
            data-track-id="dashboard-home-open-integrations-guidance"
            className="flex items-center gap-2 px-4 py-2 bg-utility-info-100 border border-utility-info-300 rounded-full text-utility-info-700 paragraph-xs hover:bg-utility-info-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{configurationGuidance}</span>
          </button>
        )}

        <div className="flex items-center justify-center gap-3">
          {platformConfig.map((platform) => {
            const isConnected = connectedPlatforms.includes(platform.id)
            const isSelected = selectedPlatforms.includes(platform.id)

            return (
              <button
                key={platform.id}
                onClick={() => isConnected && onTogglePlatform(platform.id)}
                data-track-id={`dashboard-home-toggle-platform-${platform.id}`}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 group relative"
                style={{
                  opacity: isConnected ? (isSelected ? 1 : 0.4) : 0.3,
                  transform: isSelected ? 'scale(1)' : 'scale(0.9)',
                  cursor: isConnected ? 'pointer' : 'not-allowed',
                }}
                disabled={!isConnected}
              >
                <img
                  src={platform.icon}
                  alt={platform.name}
                  className="w-6 h-6"
                  style={{
                    filter: isConnected && isSelected ? 'none' : 'grayscale(100%)',
                  }}
                />
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-primary-solid text-primary-onbrand paragraph-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {platform.name}{!isConnected && ' (not connected)'}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={(event) => {
              event.preventDefault()
              setTimeout(() => onGrowQuickClick(selectedPlatforms), 150)
            }}
            data-track-id="dashboard-home-quick-action-grow"
            className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-5 py-3 transition-all duration-200 active:scale-95 touch-manipulation"
          >
            Grow
          </button>

          <button
            onClick={(event) => {
              event.preventDefault()
              setTimeout(() => onOptimizeQuickClick(selectedPlatforms), 150)
            }}
            data-track-id="dashboard-home-quick-action-optimise"
            className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-5 py-3 transition-all duration-200 active:scale-95 touch-manipulation"
          >
            Optimise
          </button>

          <button
            onClick={(event) => {
              event.preventDefault()
              setTimeout(() => onProtectQuickClick(selectedPlatforms), 150)
            }}
            data-track-id="dashboard-home-quick-action-protect"
            className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-5 py-3 transition-all duration-200 active:scale-95 touch-manipulation"
          >
            Protect
          </button>
        </div>

        {!showMore ? (
          <button
            onClick={(event) => {
              event.preventDefault()
              onShowMore()
            }}
            data-track-id="dashboard-home-show-more"
            className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-6 py-3 opacity-50 transition-all duration-200 active:scale-95 touch-manipulation"
          >
            More
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              disabled
              title="Coming Soon"
              className="inline-flex items-center justify-center rounded-full cursor-not-allowed opacity-50 bg-secondary text-quaternary paragraph-sm px-6 py-3 whitespace-nowrap"
            >
              Summary
            </button>

            <button
              onClick={(event) => {
                event.preventDefault()
                setTimeout(() => onShowChat(), 150)
              }}
              data-track-id="dashboard-home-chat-with-mia"
              className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-5 py-3 whitespace-nowrap transition-all duration-200 active:scale-95 touch-manipulation"
            >
              Chat with Mia
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
