import React from 'react'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message?: string
  error?: Error | string
  onRetry?: () => void
  showRetry?: boolean
  icon?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
}

const iconSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading the content. Please try again.',
  error,
  onRetry,
  showRetry = true,
  icon,
  className,
  size = 'md'
}) => {
  const errorMessage = error 
    ? typeof error === 'string' 
      ? error 
      : error.message
    : message

  const defaultIcon = (
    <svg 
      className={`${iconSizes[size]} text-red-400 mx-auto`}
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
      />
    </svg>
  )

  return (
    <div className={`text-center ${sizeClasses[size]} ${className || ''}`}>
      {icon || defaultIcon}
      <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 mb-6">
        {errorMessage}
      </p>
      {showRetry && onRetry && (
        <Button onClick={onRetry} variant="primary">
          Try Again
        </Button>
      )}
    </div>
  )
}

// Inline error message component
export const ErrorMessage: React.FC<{
  message: string
  className?: string
}> = ({ message, className }) => (
  <div className={`flex items-center gap-2 text-red-600 text-sm ${className || ''}`}>
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
    <span>{message}</span>
  </div>
)
