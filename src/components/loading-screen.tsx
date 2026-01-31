import React from 'react'

interface LoadingScreenProps {
  platform?: 'google' | 'meta' | null
  message?: string
}

/**
 * Loading screen with Mia logo and glow animation
 * Used during initial auth check and account fetching
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ platform, message }) => {
  // Determine loading text based on platform or custom message
  const loadingText = message
    ? message
    : platform === 'meta'
      ? 'Connecting to Meta Ads...'
      : platform === 'google'
        ? 'Connecting to Google Ads...'
        : 'Setting up your workspace...'

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-primary">
      {/* Mia logo with glow effect */}
      <div className="relative">
        {/* Glow effect behind logo */}
        <div className="absolute inset-0 animate-pulse-glow">
          <div
            className="w-24 h-24 rounded-full"
            style={{
              background: 'radial-gradient(circle, var(--color-utility-purple-500) 0%, transparent 70%)',
              filter: 'blur(20px)',
              transform: 'scale(1.5)',
              opacity: 0.4,
            }}
          />
        </div>

        {/* Mia logo */}
        <img
          src="/icons/mia-logo.png"
          alt="Mia"
          className="w-24 h-24 relative z-10 animate-float"
        />
      </div>

      {/* Loading text */}
      <p className="mt-8 paragraph-bg text-tertiary">
        {loadingText}
      </p>

      {/* Subtle loading dots */}
      <div className="flex items-center gap-1 mt-3">
        <div className="w-2 h-2 bg-utility-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-utility-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-utility-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default LoadingScreen
