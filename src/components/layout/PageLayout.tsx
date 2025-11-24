import React from 'react'
import { PageHeader, PageHeaderProps } from '../common/PageHeader'
import { LoadingOverlay } from '../ui/LoadingSpinner'
import { ErrorState } from '../ui/ErrorState'
import { useUIState } from '../../contexts/UIStateContext'

export interface PageLayoutProps extends Omit<PageHeaderProps, 'children'> {
  children: React.ReactNode
  loading?: boolean
  error?: string | Error | null
  onRetry?: () => void
  showHeader?: boolean
  className?: string
  contentClassName?: string
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  loading = false,
  error,
  onRetry,
  showHeader = true,
  className = '',
  contentClassName = '',
  ...headerProps
}) => {
  const { loading: globalLoading } = useUIState()
  const isLoading = loading || globalLoading.page || globalLoading.global

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {showHeader && <PageHeader {...headerProps} />}
      
      <main className={`flex-1 ${contentClassName}`}>
        {error ? (
          <div className="container mx-auto px-4 py-8">
            <ErrorState 
              error={error}
              onRetry={onRetry}
              showRetry={!!onRetry}
            />
          </div>
        ) : isLoading ? (
          <LoadingOverlay text="Loading page..." />
        ) : (
          children
        )}
      </main>
    </div>
  )
}

// Specialized layout for pages with sidebars
export interface SidebarLayoutProps extends PageLayoutProps {
  sidebar: React.ReactNode
  sidebarWidth?: 'sm' | 'md' | 'lg'
  sidebarPosition?: 'left' | 'right'
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  sidebar,
  sidebarWidth = 'md',
  sidebarPosition = 'left',
  children,
  ...pageLayoutProps
}) => {
  const widthClasses = {
    sm: 'w-64',
    md: 'w-80', 
    lg: 'w-96'
  }

  const content = (
    <div className="flex h-full">
      {sidebarPosition === 'left' && (
        <aside className={`${widthClasses[sidebarWidth]} flex-shrink-0 bg-white border-r border-gray-200`}>
          {sidebar}
        </aside>
      )}
      
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
      
      {sidebarPosition === 'right' && (
        <aside className={`${widthClasses[sidebarWidth]} flex-shrink-0 bg-white border-l border-gray-200`}>
          {sidebar}
        </aside>
      )}
    </div>
  )

  return (
    <PageLayout {...pageLayoutProps} contentClassName="h-screen flex flex-col">
      {content}
    </PageLayout>
  )
}

// Layout for centered content (like forms, login pages)
export interface CenteredLayoutProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  showBackground?: boolean
  className?: string
}

export const CenteredLayout: React.FC<CenteredLayoutProps> = ({
  children,
  maxWidth = 'md',
  showBackground = true,
  className = ''
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${showBackground ? 'bg-gray-50' : ''} ${className}`}>
      <div className={`w-full ${maxWidthClasses[maxWidth]}`}>
        {children}
      </div>
    </div>
  )
}
