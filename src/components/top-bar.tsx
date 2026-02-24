import { BackButton } from './back-button'

interface TopBarProps {
  title: string
  onBack?: () => void
  backLabel?: string
  rightSlot?: React.ReactNode
  className?: string
}

/**
 * Unified top bar component for consistent page headers
 * Layout: [ BackButton + Title ] [ spacer ] [ Right Slot ]
 */
export function TopBar({
  title,
  onBack,
  backLabel,
  rightSlot,
  className = ''
}: TopBarProps) {
  return (
    <div className={`flex items-center px-4 py-3 bg-primary shrink-0 ${className}`}>
      {/* Left section: Back button + Title */}
      <div className="flex items-center gap-1">
        {onBack && (
          <BackButton onClick={onBack} label={backLabel} variant="dark" />
        )}
        <h1
          className="title-h6 text-primary"
          style={{
            fontFamily: 'Geologica, sans-serif',
            lineHeight: '110%'
          }}
        >
          {title}
        </h1>
      </div>

      {/* Middle spacer */}
      <div className="flex-1" />

      {/* Right section: Optional slot */}
      {rightSlot && (
        <div className="flex items-center">
          {rightSlot}
        </div>
      )}
    </div>
  )
}
