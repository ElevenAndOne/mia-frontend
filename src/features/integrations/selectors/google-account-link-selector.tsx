import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useGoogleAccountLinkSelector } from './hooks/use-google-account-link-selector'

interface GoogleAccountLinkSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (linkedAccountId: string) => void
}

function GoogleIcon() {
  return (
    <svg className="w-6 h-6 text-utility-info-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  )
}

const GoogleAccountLinkSelector = ({ isOpen, onClose, onSuccess }: GoogleAccountLinkSelectorProps) => {
  const {
    isLoading,
    isSubmitting,
    error,
    success,
    selectedId,
    accountItems,
    isEmpty,
    subtitle,
    setSelectedId,
    handleLinkAccount,
    handleClose,
  } = useGoogleAccountLinkSelector({ isOpen, onClose, onSuccess })

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Google Ads Account"
      subtitle={subtitle}
      icon={<GoogleIcon />}
      iconBgColor="bg-utility-info-200"
      isLoading={isLoading}
      loadingMessage="Loading Google Ads accounts..."
      error={error}
      success={success}
      isEmpty={isEmpty}
      emptyMessage="No Google Ads accounts found"
      emptySubMessage="Make sure you have access to Google Ads"
      isSubmitting={isSubmitting}
      onSubmit={handleLinkAccount}
      submitLabel="Link Account"
      submitLoadingLabel="Linking..."
      submitDisabled={!selectedId}
      accentColor="blue"
    >
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {accountItems.map((account) => (
          <SelectorItem
            key={account.id}
            isSelected={selectedId === account.id}
            onSelect={() => setSelectedId(account.id)}
            title={account.title}
            subtitle={account.subtitle}
            accentColor="blue"
          />
        ))}
      </div>

      <div className="bg-utility-info-100 border border-utility-info-300 rounded-lg p-3 mt-4">
        <p className="paragraph-xs text-utility-info-700">
          This Google Ads account will be linked to your Meta account for cross-platform insights.
        </p>
      </div>
    </AccountSelectorModal>
  )
}

export default GoogleAccountLinkSelector
