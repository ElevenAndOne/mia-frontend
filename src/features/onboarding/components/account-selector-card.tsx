import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../../../contexts/session-context'
import { Icon } from '../../../components/icon'

interface AccountSelectorCardProps {
  onAccountSelected: (accountId: string) => void
}

export const AccountSelectorCard = ({ onAccountSelected }: AccountSelectorCardProps) => {
  const { availableAccounts, selectedAccount, selectAccount, isLoading } = useSession()
  const [selectedId, setSelectedId] = useState<string | null>(selectedAccount?.id || null)
  const [isSelecting, setIsSelecting] = useState(false)

  // Group accounts by type (MCC vs standalone)
  const { mccAccounts, standaloneAccounts } = useMemo(() => {
    const mcc: typeof availableAccounts = []
    const standalone: typeof availableAccounts = []

    availableAccounts.forEach(account => {
      if (account.google_ads_account_type === 'mcc') {
        mcc.push(account)
      } else {
        standalone.push(account)
      }
    })

    return { mccAccounts: mcc, standaloneAccounts: standalone }
  }, [availableAccounts])

  const handleSelect = async (accountId: string) => {
    if (isSelecting) return

    setSelectedId(accountId)
    setIsSelecting(true)

    try {
      const success = await selectAccount(accountId)
      if (success) {
        onAccountSelected(accountId)
      }
    } catch (error) {
      console.error('Failed to select account:', error)
    } finally {
      setIsSelecting(false)
    }
  }

  if (isLoading && availableAccounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-secondary rounded-2xl p-4 max-w-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-utility-brand-600 rounded-full animate-spin" />
          <span className="paragraph-sm text-secondary">Loading your accounts...</span>
        </div>
      </motion.div>
    )
  }

  if (availableAccounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-secondary rounded-2xl p-4 max-w-md"
      >
        <p className="paragraph-sm text-secondary">No accounts found. Please connect a platform first.</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-secondary rounded-2xl p-4 max-w-md w-full"
    >
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {/* MCC Accounts */}
        {mccAccounts.length > 0 && (
          <div className="mb-3">
            <p className="paragraph-xs text-tertiary mb-2 uppercase tracking-wide">Manager Accounts</p>
            {mccAccounts.map(account => (
              <AccountItem
                key={account.id}
                account={account}
                isSelected={selectedId === account.id}
                isSelecting={isSelecting && selectedId === account.id}
                onSelect={handleSelect}
                icon={<img src="/icons/google-ads.svg" alt="" className="w-5 h-5" />}
              />
            ))}
          </div>
        )}

        {/* Standalone Accounts */}
        {standaloneAccounts.length > 0 && (
          <div>
            {mccAccounts.length > 0 && (
              <p className="paragraph-xs text-tertiary mb-2 uppercase tracking-wide">Accounts</p>
            )}
            {standaloneAccounts.map(account => (
              <AccountItem
                key={account.id}
                account={account}
                isSelected={selectedId === account.id}
                isSelecting={isSelecting && selectedId === account.id}
                onSelect={handleSelect}
                icon={<img src="/icons/google-ads.svg" alt="" className="w-5 h-5" />}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface AccountItemProps {
  account: {
    id: string
    name: string
    google_ads_id?: string
  }
  isSelected: boolean
  isSelecting: boolean
  onSelect: (id: string) => void
  icon: React.ReactNode
}

const AccountItem = ({ account, isSelected, isSelecting, onSelect, icon }: AccountItemProps) => (
  <button
    type="button"
    onClick={() => onSelect(account.id)}
    disabled={isSelecting}
    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
      isSelected
        ? 'bg-utility-brand-100 border-2 border-utility-brand-500'
        : 'bg-tertiary hover:bg-quaternary border-2 border-transparent'
    }`}
  >
    <div className="w-8 h-8 rounded-lg bg-utility-info-200 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0 text-left">
      <p className="subheading-sm text-primary truncate">{account.name}</p>
      {account.google_ads_id && (
        <p className="paragraph-xs text-tertiary">ID: {account.google_ads_id}</p>
      )}
    </div>
    {isSelecting ? (
      <div className="w-5 h-5 border-2 border-primary border-t-utility-brand-600 rounded-full animate-spin shrink-0" />
    ) : isSelected ? (
      <Icon.check size={20} className="text-utility-brand-600 shrink-0" />
    ) : null}
  </button>
)
