import { AccountSelectorModal } from '../../integrations/selectors/components/account-selector-modal'
import { SelectorItem } from '../../integrations/selectors/components/selector-item'
import { useOnboardingAccountSelector } from '../hooks/use-onboarding-account-selector'

type Provider = 'google' | 'meta'

interface OnboardingAccountSelectorProps {
  isOpen: boolean
  provider: Provider
  onClose: () => void
  onSuccess: () => void
}

const renderAccountLabel = (provider: Provider) => {
  return provider === 'google' ? 'Google Ads Account' : 'Meta Ads Account'
}

export const OnboardingAccountSelector = ({ isOpen, provider, onClose, onSuccess }: OnboardingAccountSelectorProps) => {
  const {
    isLoading,
    isSubmitting,
    error,
    selectedAccountId,
    managerGroups,
    standaloneGoogleAccounts,
    metaAccounts,
    expandedManagerId,
    setExpandedManagerId,
    setSelectedAccountId,
    handleSubmit
  } = useOnboardingAccountSelector({ isOpen, provider, onSuccess })

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Select ${renderAccountLabel(provider)}`}
      subtitle="Choose the account to use in onboarding"
      icon={
        <svg className="w-6 h-6 text-utility-info-600" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
      }
      iconBgColor="bg-utility-info-200"
      isLoading={isLoading}
      loadingMessage="Loading your available accounts..."
      error={error}
      success={false}
      isEmpty={provider === 'google' ? standaloneGoogleAccounts.length === 0 && managerGroups.length === 0 : metaAccounts.length === 0}
      emptyMessage="No compatible accounts found"
      emptySubMessage="Connect a platform and try again."
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      submitLabel="Continue"
      submitLoadingLabel="Saving..."
      submitDisabled={!selectedAccountId}
      accentColor="blue"
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {provider === 'google' ? (
          <>
            {managerGroups.map((manager) => {
              const isExpanded = expandedManagerId === manager.id
              return (
                <div key={manager.id} className="space-y-2">
                  <SelectorItem
                    isSelected={isExpanded}
                    onSelect={() => setExpandedManagerId(isExpanded ? null : manager.id)}
                    title={manager.name}
                    subtitle={`${manager.subAccounts.length} managed accounts`}
                    badge="Manager"
                    badgeColor="blue"
                    selectionStyle="radio"
                    accentColor="blue"
                  />
                  {isExpanded ? (
                    <div className="pl-5 space-y-2">
                      {manager.subAccounts.map((account) => (
                        <SelectorItem
                          key={account.id}
                          isSelected={selectedAccountId === account.id}
                          onSelect={() => setSelectedAccountId(account.id)}
                          title={account.displayName}
                          subtitle={`ID: ${account.googleAdsId}`}
                          selectionStyle="radio"
                          accentColor="blue"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
            {standaloneGoogleAccounts.map((account) => (
              <SelectorItem
                key={account.id}
                isSelected={selectedAccountId === account.id}
                onSelect={() => setSelectedAccountId(account.id)}
                title={account.displayName}
                subtitle={`ID: ${account.googleAdsId}`}
                selectionStyle="radio"
                accentColor="blue"
              />
            ))}
          </>
        ) : (
          <>
            {metaAccounts.map((account) => (
              <SelectorItem
                key={account.id}
                isSelected={selectedAccountId === account.id}
                onSelect={() => setSelectedAccountId(account.id)}
                title={account.displayName}
                subtitle={account.metaAdsId ? `ID: ${account.metaAdsId}` : 'Meta account'}
                selectionStyle="radio"
                accentColor="blue"
              />
            ))}
          </>
        )}
      </div>
    </AccountSelectorModal>
  )
}
