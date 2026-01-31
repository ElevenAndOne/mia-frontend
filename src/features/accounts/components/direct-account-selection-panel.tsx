import { SelectionCard } from '../../../components/selection-card'
import type { AccountSelectionItem } from '../types'

interface DirectAccountSelectionPanelProps {
  accounts: AccountSelectionItem[]
  onSelectAccount: (accountId: string) => void
}

export const DirectAccountSelectionPanel = ({
  accounts,
  onSelectAccount,
}: DirectAccountSelectionPanelProps) => {
  return (
    <div className="px-6 pb-8">
      <div className="mb-3">
        <p className="paragraph-sm text-quaternary">Select the account you'd like to analyze</p>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-8">
          <div className="title-h2 mb-3">📊</div>
          <h3 className="subheading-bg text-primary mb-1">No Accounts Available</h3>
          <p className="paragraph-sm text-tertiary">
            Please contact support to set up your marketing accounts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
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
                <svg className="w-5 h-5 text-placeholder-subtle shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
              footer={
                account.isSelecting ? (
                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      <span className="paragraph-sm text-tertiary">Connecting...</span>
                    </div>
                  </div>
                ) : null
              }
            >
              <div className="min-w-0">
                <h3 className="subheading-bg text-primary truncate">{account.name}</h3>
                <p className="paragraph-sm text-quaternary">{account.detail}</p>
              </div>
            </SelectionCard>
          ))}
        </div>
      )}
    </div>
  )
}
