import { useCallback } from 'react'

interface Account {
  id: string
  name: string
  business_type: string
  color: string
}

interface AccountSwitcherProps {
  selectedAccount: Account | null
  availableAccounts: Account[]
  onSwitch: (accountId: string) => void
  isLoading: boolean
  onClose: () => void
}

const AccountSwitcher = ({
  selectedAccount,
  availableAccounts,
  onSwitch,
  isLoading,
  onClose
}: AccountSwitcherProps) => {
  const getAccountIcon = useCallback((businessType: string) => {
    switch (businessType?.toLowerCase()) {
      case 'food':
        return '🍎'
      case 'engineering':
        return '⚙️'
      case 'retail':
        return '🏪'
      default:
        return '🏢'
    }
  }, [])

  return (
    <div className="absolute top-8 left-0 bg-white rounded-lg shadow-lg border border-gray-200 min-w-64 z-30">
      {/* Back Button */}
      <button
        onClick={onClose}
        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        <div className="font-medium text-gray-900 text-sm">Back</div>
      </button>

      {/* Available Accounts */}
      <div className="px-2 py-2">
        {availableAccounts.map((account) => (
          <button
            key={account.id}
            onClick={() => onSwitch(account.id)}
            disabled={isLoading || account.id === selectedAccount?.id}
            className={`w-full px-3 py-2 text-left rounded-lg flex items-center gap-3 text-sm transition-colors ${
              account.id === selectedAccount?.id
                ? 'bg-gray-50 text-gray-400 cursor-default'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: account.color }}
            >
              {getAccountIcon(account.business_type)}
            </div>
            <div className="flex-1">
              <div className="font-medium">{account.name}</div>
              <div className="text-xs text-gray-500">{account.business_type}</div>
            </div>
            {account.id === selectedAccount?.id && (
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {isLoading && account.id !== selectedAccount?.id && (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default AccountSwitcher
