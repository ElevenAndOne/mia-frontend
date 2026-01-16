interface Platform {
  id: string
  name: string
  icon: string
  accountKey: string
}

interface PlatformSelectorProps {
  connectedPlatforms: string[]
  selectedPlatforms: string[]
  onToggle: (platformId: string) => void
  platformConfig: Platform[]
}

const PlatformSelector = ({
  connectedPlatforms,
  selectedPlatforms,
  onToggle,
  platformConfig
}: PlatformSelectorProps) => {
  return (
    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-3" style={{ marginTop: '-10px' }}>
      {platformConfig.map(platform => {
        const isConnected = connectedPlatforms.includes(platform.id)
        const isSelected = selectedPlatforms.includes(platform.id)

        return (
          <button
            key={platform.id}
            onClick={() => isConnected && onToggle(platform.id)}
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
            {/* Tooltip */}
            <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {platform.name}{!isConnected && ' (not connected)'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default PlatformSelector
