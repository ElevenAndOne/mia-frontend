import { AnimatePresence, motion } from 'framer-motion'
import { SelectionCard } from '../../../components/selection-card'
import { Spinner } from '../../../components/spinner'
import type { AccountSelectionItem, MccSelectionItem } from '../types'

interface MccSelectionPanelProps {
  mccItems: MccSelectionItem[]
  standaloneAccounts: AccountSelectionItem[]
  onSelectMcc: (mccId: string) => void
  onClearMcc: () => void
  onSelectAccount: (accountId: string) => void
}

export const MccSelectionPanel = ({
  mccItems,
  standaloneAccounts,
  onSelectMcc,
  onClearMcc,
  onSelectAccount,
}: MccSelectionPanelProps) => {
  return (
    <div className="max-w-3xl h-full mx-auto px-6 pb-4">
      <div className="mb-3">
        <h2 className="label-md text-primary">Step 1: Select Manager Account</h2>
        <p className="paragraph-sm text-quaternary">Choose which Manager Account to use</p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {mccItems.map((mccItem, index) => (
          <motion.div
            key={mccItem.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (index + 1) }}
            className="space-y-2"
          >
            <SelectionCard
              onSelect={() => (mccItem.isSelected ? onClearMcc() : onSelectMcc(mccItem.id))}
              aria-expanded={mccItem.isSelected}
              className={`w-full p-4 rounded-xl border-2 text-left cursor-pointer ${mccItem.isSelected
                ? 'border-brand bg-brand-primary'
                : 'border-secondary hover:border-primary hover:bg-secondary'
                }`}
              leading={
                <div className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center paragraph-bg">
                  🏢
                </div>
              }
              trailing={
                <svg
                  className={`w-5 h-5 text-placeholder-subtle transition-transform duration-200 ${mccItem.isSelected ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              <div>
                <h3 className="subheading-bg text-primary">{mccItem.name}</h3>
                <p className="paragraph-sm text-quaternary">{mccItem.accountCountLabel}</p>
              </div>
            </SelectionCard>

            <AnimatePresence>
              {mccItem.isSelected && mccItem.subAccounts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="pl-4 space-y-2 overflow-hidden"
                >
                  {mccItem.subAccounts.map((account) => (
                    <SelectionCard
                      key={account.id}
                      onSelect={() => onSelectAccount(account.id)}
                      disabled={account.disabled}
                      className={`w-full p-3 rounded-lg border text-left ${account.disabled
                        ? 'opacity-60 cursor-not-allowed border-secondary'
                        : 'border-secondary hover:border-brand-alt hover:bg-brand-primary'
                        }`}
                      leading={
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center paragraph-sm"
                          style={{ backgroundColor: account.iconBackground }}
                        >
                          {account.icon}
                        </div>
                      }
                      trailing={
                        account.isSelecting ? (
                          <Spinner size="sm" />
                        ) : (
                          <svg className="w-4 h-4 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )
                      }
                    >
                      <div className="min-w-0">
                        <h4 className="subheading-md text-primary truncate">{account.name}</h4>
                        <p className="paragraph-xs text-quaternary">{account.detail}</p>
                      </div>
                    </SelectionCard>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      {standaloneAccounts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-secondary">
          <h3 className="subheading-md text-quaternary mb-3">Standalone Accounts</h3>
          <div className="space-y-3">
            {standaloneAccounts.map((account) => (
              <SelectionCard
                key={account.id}
                onSelect={() => onSelectAccount(account.id)}
                disabled={account.disabled}
                className={`w-full p-4 rounded-xl border-2 text-left ${account.disabled
                  ? 'opacity-60 cursor-not-allowed border-secondary'
                  : 'border-secondary hover:border-primary hover:bg-secondary'
                  }`}
                leading={
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center paragraph-bg"
                    style={{ backgroundColor: account.iconBackground }}
                  >
                    {account.icon}
                  </div>
                }
                trailing={
                  account.isSelecting ? (
                    <Spinner size="sm" />
                  ) : (
                    <svg className="w-5 h-5 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )
                }
              >
                <div className="min-w-0">
                  <h3 className="subheading-bg text-primary truncate">{account.name}</h3>
                  <p className="paragraph-xs text-quaternary">{account.detail}</p>
                </div>
              </SelectionCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
