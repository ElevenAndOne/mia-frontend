import { useState } from 'react'

interface InsightsNavigationProps {
  onGrowClick?: (platforms?: string[]) => void
  onOptimizeClick?: (platforms?: string[]) => void
  onProtectClick?: (platforms?: string[]) => void
  onSummaryClick?: (platforms?: string[]) => void
  onChatClick?: () => void
  selectedPlatforms: string[]
}

const InsightsNavigation = ({
  onGrowClick,
  onOptimizeClick,
  onProtectClick,
  onChatClick,
  selectedPlatforms
}: InsightsNavigationProps) => {
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      {/* Row 1: Grow, Optimise, Protect - Horizontal */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2" style={{ marginTop: '55px' }}>
        {onGrowClick && (
          <button
            onClick={(e) => {
              e.preventDefault()
              if (onGrowClick) {
                setTimeout(() => onGrowClick(selectedPlatforms), 150)
              }
            }}
            className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
            style={{
              backgroundColor: '#E6E6E6',
              color: '#000',
              fontFamily: 'Geologica, system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '12px',
              paddingBottom: '12px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            Grow
          </button>
        )}

        {onOptimizeClick && (
          <button
            onClick={(e) => {
              e.preventDefault()
              if (onOptimizeClick) {
                setTimeout(() => onOptimizeClick(selectedPlatforms), 150)
              }
            }}
            className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
            style={{
              backgroundColor: '#E6E6E6',
              color: '#000',
              fontFamily: 'Geologica, system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '12px',
              paddingBottom: '12px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            Optimise
          </button>
        )}

        {onProtectClick && (
          <button
            onClick={(e) => {
              e.preventDefault()
              if (onProtectClick) {
                setTimeout(() => onProtectClick(selectedPlatforms), 150)
              }
            }}
            className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
            style={{
              backgroundColor: '#E6E6E6',
              color: '#000',
              fontFamily: 'Geologica, system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '12px',
              paddingBottom: '12px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            Protect
          </button>
        )}
      </div>

      {/* Row 2: More button OR Summary + Chat with Mia */}
      {!showMore ? (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ marginTop: '107px' }}>
          <button
            onClick={(e) => {
              e.preventDefault()
              setShowMore(true)
            }}
            className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
            style={{
              backgroundColor: '#E6E6E6',
              color: '#000',
              fontFamily: 'Geologica, system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              opacity: 0.5,
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingTop: '12px',
              paddingBottom: '12px',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            More
          </button>
        </div>
      ) : (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2" style={{ marginTop: '107px', marginLeft: '5px' }}>
          {/* Summary button - disabled/coming soon */}
          <button
            disabled
            title="Coming Soon"
            className="inline-flex items-center justify-center rounded-full cursor-not-allowed opacity-50"
            style={{
              backgroundColor: '#E6E6E6',
              color: '#999',
              fontFamily: 'Geologica, system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingTop: '12px',
              paddingBottom: '12px',
              whiteSpace: 'nowrap'
            }}
          >
            Summary
          </button>

          <button
            onClick={(e) => {
              e.preventDefault()
              if (onChatClick) {
                setTimeout(() => onChatClick(), 150)
              }
            }}
            className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
            style={{
              backgroundColor: '#E6E6E6',
              color: '#000',
              fontFamily: 'Geologica, system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingTop: '12px',
              paddingBottom: '12px',
              whiteSpace: 'nowrap',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            Chat with Mia
          </button>
        </div>
      )}
    </>
  )
}

export default InsightsNavigation
