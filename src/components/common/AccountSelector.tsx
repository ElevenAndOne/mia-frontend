import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession, AccountMapping } from '../../contexts/SessionContext'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { clsx } from 'clsx'

export interface AccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onAccountSelect?: (accountId: string) => Promise<void>
  className?: string
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  isOpen,
  onClose,
  onAccountSelect,
  className
}) => {
  const { selectedAccount, availableAccounts, selectAccount } = useSession()
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectingAccountId, setSelectingAccountId] = useState<string | null>(null)

  const getAccountIcon = (businessType: string) => {
    switch (businessType?.toLowerCase()) {
      case 'engineering': return '⚙️'
      case 'food': return '🍒'
      default: return '🏢'
    }
  }

  const handleAccountSelect = async (accountId: string) => {
    if (isSelecting || accountId === selectedAccount?.id) return

    setIsSelecting(true)
    setSelectingAccountId(accountId)

    try {
      if (onAccountSelect) {
        await onAccountSelect(accountId)
      } else {
        await selectAccount(accountId)
      }
      onClose()
    } catch (error) {
      console.error('Failed to switch account:', error)
    } finally {
      setIsSelecting(false)
      setSelectingAccountId(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-30"
            onClick={onClose}
          />
          
          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={clsx(
              'absolute right-0 top-full mt-2 z-50 w-80 bg-white rounded-lg shadow-lg border border-gray-200',
              className
            )}
          >
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">Switch Account</h3>
              <p className="text-sm text-gray-600 mt-1">
                Select the account you want to analyze
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {availableAccounts.map((account) => {
                const isSelected = account.id === selectedAccount?.id
                const isCurrentlySelecting = selectingAccountId === account.id

                return (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account.id)}
                    disabled={isSelecting}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-blue-50 border-r-2 border-blue-500',
                      isSelecting && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <div className="text-2xl">
                      {getAccountIcon(account.business_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'font-medium truncate',
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      )}>
                        {account.display_name || account.name}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {account.google_ads_id && `Google Ads: ${account.google_ads_id}`}
                        {account.meta_ads_id && ` • Meta: ${account.meta_ads_id}`}
                      </p>
                    </div>

                    <div className="flex items-center">
                      {isCurrentlySelecting && (
                        <LoadingSpinner size="sm" />
                      )}
                      {isSelected && !isCurrentlySelecting && (
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {availableAccounts.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No accounts available
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
