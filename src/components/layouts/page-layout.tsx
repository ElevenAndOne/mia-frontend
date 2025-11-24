import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageLayoutProps {
  children: ReactNode
  className?: string
  showBackButton?: boolean
  onBack?: () => void
  headerContent?: ReactNode
  footerContent?: ReactNode
  animate?: boolean
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  className = '',
  showBackButton = false,
  onBack,
  headerContent,
  footerContent,
  animate = true
}) => {
  const content = (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {/* Header Section */}
      {(showBackButton || headerContent) && (
        <div className="flex items-center justify-between p-4 safe-top">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          {headerContent}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Footer Section */}
      {footerContent && (
        <div className="p-4 safe-bottom">
          {footerContent}
        </div>
      )}
    </div>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full"
      >
        {content}
      </motion.div>
    )
  }

  return content
}
