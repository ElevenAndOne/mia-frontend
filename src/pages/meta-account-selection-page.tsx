import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import LoadingScreen from '../components/loading-screen'
import { Alert } from '../components/alert'
import { AccountSelectionHeader } from '../components/account-selection-header'
import { NarrowPageContainer } from '../components/narrow-page-container'
import { SelectionCard } from '../components/selection-card'
import { MetaLogoBadge } from '../components/meta-logo-badge'
import { Spinner } from '../components/spinner'
import { useSession } from '../contexts/session-context'
import { useMetaAccountSelection } from '../features/accounts/hooks/use-meta-account-selection'

interface MetaAccountSelectionPageProps {
  onAccountSelected?: () => void
}

const MetaAccountSelectionPage = ({ onAccountSelected }: MetaAccountSelectionPageProps) => {
  const navigate = useNavigate()
  const { logout } = useSession()

  const handleAccountSelected = () => {
    if (onAccountSelected) {
      onAccountSelected()
      return
    }
    navigate('/onboarding')
  }

  const handleBack = () => {
    logout()
    navigate('/')
  }

  const {
    metaUser,
    metaAccountItems,
    errorMessage,
    isPageLoading,
    handleAccountSelect,
  } = useMetaAccountSelection({ onAccountSelected: handleAccountSelected })

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
        onBack={handleBack}
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
            <p className="paragraph-sm text-tertiary mb-6">
              Make sure you have access to at least one Meta Ads account.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={handleBack}
                className="w-full px-4 py-3 bg-brand-solid text-primary-onbrand rounded-xl subheading-md hover:bg-brand-solid-hover transition-colors"
              >
                Try Different Account
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-3 border border-secondary text-secondary rounded-xl subheading-md hover:bg-secondary transition-colors"
              >
                Back to Login
              </button>
            </div>
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
                          <Spinner size="sm" />
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
