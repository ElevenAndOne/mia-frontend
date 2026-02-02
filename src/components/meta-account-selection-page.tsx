import { motion } from 'framer-motion'
import LoadingScreen from './loading-screen'
import { Alert } from './alert'
import { AccountSelectionHeader } from './account-selection-header'
import { NarrowPageContainer } from './narrow-page-container'
import { SelectionCard } from './selection-card'
import { MetaLogoBadge } from './meta-logo-badge'
import { useMetaAccountSelection } from '../features/accounts/hooks/use-meta-account-selection'

interface MetaAccountSelectionPageProps {
  onAccountSelected: () => void
  onBack?: () => void
}

const MetaAccountSelectionPage = ({ onAccountSelected, onBack }: MetaAccountSelectionPageProps) => {
  const {
    metaUser,
    metaAccountItems,
    errorMessage,
    isPageLoading,
    handleAccountSelect,
  } = useMetaAccountSelection({ onAccountSelected })

  if (isPageLoading) {
    return (
      <NarrowPageContainer centered scroll={false}>
        <LoadingScreen platform="meta" message="Loading Meta Ad accounts..." />
      </NarrowPageContainer>
    )
  }

  return (
    <NarrowPageContainer>
      <AccountSelectionHeader
        onBack={onBack}
        title={`Welcome${metaUser?.name ? `, ${metaUser.name}` : ''}!`}
        subtitle="Select your Meta Ad account to analyze"
        leading={<MetaLogoBadge />}
      />

      {errorMessage && (
        <div className="mx-6 mb-6">
          <Alert variant="error">{errorMessage}</Alert>
        </div>
      )}

      <div className="px-6 pb-8">
        {metaAccountItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="title-h1 mb-4">📊</div>
            <h3 className="subheading-bg text-primary mb-2">No Meta Ad Accounts Found</h3>
            <p className="paragraph-sm text-tertiary">
              Make sure you have access to at least one Meta Ads account.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {metaAccountItems.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
              >
                <SelectionCard
                  onSelect={() => handleAccountSelect(account.id)}
                  disabled={account.disabled}
                  className={`w-full p-4 rounded-xl border-2 text-left ${account.disabled
                    ? 'opacity-60 cursor-not-allowed border-secondary'
                    : 'border-secondary hover:border-utility-info-300 hover:bg-utility-info-100'
                    }`}
                  leading={<MetaLogoBadge className="bg-utility-info-500" iconClassName="text-white" />}
                  trailing={
                    <svg className="w-6 h-6 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  }
                  footer={
                    account.isSelecting ? (
                      <div className="flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-utility-info-600"></div>
                          <span className="paragraph-sm text-tertiary">Connecting...</span>
                        </div>
                      </div>
                    ) : null
                  }
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="label-md text-primary truncate">{account.name}</h3>
                    </div>
                    <p className="paragraph-sm text-tertiary mb-1">Meta Ads Account</p>
                    {account.metaAdsId && (
                      <div className="flex flex-wrap items-center gap-2 paragraph-xs text-quaternary">
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
                          </svg>
                          ID: {account.metaAdsId}
                        </span>
                      </div>
                    )}
                  </div>
                </SelectionCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </NarrowPageContainer>
  )
}

export default MetaAccountSelectionPage
