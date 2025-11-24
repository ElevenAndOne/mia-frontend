import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export interface NavigationTab {
  id: string
  label: string
  icon?: string
  image?: string
  disabled?: boolean
}

export interface NavigationTabsProps {
  tabs: NavigationTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  variant?: 'default' | 'pills' | 'underline'
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
  variant = 'default'
}) => {
  const handleTabClick = (tab: NavigationTab) => {
    if (!tab.disabled) {
      onTabChange(tab.id)
    }
  }

  const renderTabContent = (tab: NavigationTab) => (
    <>
      {tab.image && (
        <img 
          src={tab.image} 
          alt={tab.label}
          className="w-6 h-6 object-contain"
        />
      )}
      {tab.icon && !tab.image && (
        <span className="text-lg">{tab.icon}</span>
      )}
      <span className="font-medium">{tab.label}</span>
    </>
  )

  if (variant === 'pills') {
    return (
      <div className={clsx('flex gap-2 p-1 bg-gray-100 rounded-lg', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              disabled={tab.disabled}
              className={clsx(
                'relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isActive 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200',
                tab.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {renderTabContent(tab)}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-md shadow-sm -z-10"
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  if (variant === 'underline') {
    return (
      <div className={clsx('flex border-b border-gray-200', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              disabled={tab.disabled}
              className={clsx(
                'relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isActive 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300',
                tab.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {renderTabContent(tab)}
              {isActive && (
                <motion.div
                  layoutId="activeUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Default variant
  return (
    <div className={clsx('flex gap-1 p-1 bg-gray-100 rounded-lg', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <motion.button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            disabled={tab.disabled}
            whileHover={!tab.disabled ? { scale: 1.02 } : undefined}
            whileTap={!tab.disabled ? { scale: 0.98 } : undefined}
            className={clsx(
              'relative flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-md text-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              isActive 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {renderTabContent(tab)}
            {isActive && (
              <motion.div
                layoutId="activeTabBg"
                className="absolute inset-0 bg-white rounded-md shadow-sm -z-10"
                initial={false}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
