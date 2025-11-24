import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'white' | 'gray'
  className?: string
  text?: string
  centered?: boolean
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-4'
}

const colorClasses = {
  primary: 'border-blue-200 border-t-blue-600',
  white: 'border-white/30 border-t-white',
  gray: 'border-gray-200 border-t-gray-600'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
  text,
  centered = false
}) => {
  const spinner = (
    <div className={clsx('flex items-center gap-3', centered && 'justify-center')}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear'
        }}
        className={clsx(
          'rounded-full',
          sizeClasses[size],
          colorClasses[color],
          className
        )}
      />
      {text && (
        <span className={clsx(
          'text-sm',
          color === 'white' ? 'text-white' : 'text-gray-600'
        )}>
          {text}
        </span>
      )}
    </div>
  )

  if (centered) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[100px]">
        {spinner}
      </div>
    )
  }

  return spinner
}

// Full page loading overlay
export const LoadingOverlay: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 shadow-xl">
      <LoadingSpinner size="lg" text={text} centered />
    </div>
  </div>
)
