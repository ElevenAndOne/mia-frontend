import { ReactNode, forwardRef } from 'react'
import { cn } from '@/utils/utils'

type AlertVariant = 'error' | 'success' | 'warning' | 'info'

export interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
  icon?: ReactNode
  showIcon?: boolean
}

const variantStyles: Record<AlertVariant, { container: string; icon: string }> = {
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-600',
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: 'text-green-600',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: 'text-yellow-600',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'text-blue-600',
  },
}

const defaultIcons: Record<AlertVariant, ReactNode> = {
  error: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
}

/**
 * Alert component for displaying feedback messages
 *
 * @example
 * <Alert variant="error">Something went wrong</Alert>
 * <Alert variant="success">Account linked successfully!</Alert>
 * <Alert variant="warning">Your session will expire soon</Alert>
 * <Alert variant="info">Tip: You can link multiple accounts</Alert>
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', children, className, icon, showIcon = true }, ref) => {
    const styles = variantStyles[variant]
    const displayIcon = icon ?? defaultIcons[variant]

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'border rounded-lg p-4',
          styles.container,
          className
        )}
      >
        <div className="flex items-start gap-3">
          {showIcon && (
            <span className={cn('shrink-0 mt-0.5', styles.icon)}>
              {displayIcon}
            </span>
          )}
          <div className="flex-1 text-sm">{children}</div>
        </div>
      </div>
    )
  }
)

Alert.displayName = 'Alert'

// Convenience components for common use cases
export const AlertError = forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="error" {...props} />
)
AlertError.displayName = 'AlertError'

export const AlertSuccess = forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="success" {...props} />
)
AlertSuccess.displayName = 'AlertSuccess'

export const AlertWarning = forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="warning" {...props} />
)
AlertWarning.displayName = 'AlertWarning'

export const AlertInfo = forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="info" {...props} />
)
AlertInfo.displayName = 'AlertInfo'
