import React, { useState } from 'react'
import { useSession } from '../../contexts/SessionContext'
import { Button } from '../ui/Button'
import { AccountSelector } from './AccountSelector'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export interface PageHeaderProps {
  title?: string
  subtitle?: string
  onBack?: () => void
  showAccountInfo?: boolean
  showLogout?: boolean
  className?: string
  children?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showAccountInfo = true,
  showLogout = true,
  className,
  children
}) => {
  const { selectedAccount, user, logout } = useSession()
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const getAccountIcon = (businessType: string) => {
    switch (businessType?.toLowerCase()) {
      case 'engineering': return '⚙️'
      case 'food': return '🍒'
      default: return '🏢'
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className={`bg-white border-b border-gray-200 ${className || ''}`}>
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Left side - Back button and title */}
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                }
                iconPosition="left"
              >
                Back
              </Button>
            )}
            
            {title && (
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          {/* Center - Custom content */}
          {children && (
            <div className="flex-1 flex justify-center">
              {children}
            </div>
          )}

          {/* Right side - Account info and logout */}
          <div className="flex items-center gap-3">
            {showAccountInfo && selectedAccount && (
              <div className="relative">
                <button
                  onClick={() => setShowAccountSelector(!showAccountSelector)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <span className="text-lg">
                    {getAccountIcon(selectedAccount.business_type)}
                  </span>
                  <div className="text-left min-w-0">
                    <p className="font-medium text-gray-900 truncate max-w-32">
                      {selectedAccount.display_name || selectedAccount.name}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AccountSelector
                  isOpen={showAccountSelector}
                  onClose={() => setShowAccountSelector(false)}
                />
              </div>
            )}

            {user && (
              <div className="flex items-center gap-2">
                {user.picture_url && (
                  <img 
                    src={user.picture_url} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user.name}
                </span>
              </div>
            )}

            {showLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                icon={isLoggingOut ? <LoadingSpinner size="sm" /> : 
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                }
              >
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
