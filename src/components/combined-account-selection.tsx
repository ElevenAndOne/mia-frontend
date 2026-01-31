import LoadingScreen from './loading-screen'
import { UserAvatar } from './user-avatar'
import { Alert } from './alert'
import { AccountSelectionHeader } from './account-selection-header'
import { NarrowPageContainer } from './narrow-page-container'
import { MccSelectionPanel } from '../features/accounts/components/mcc-selection-panel'
import { DirectAccountSelectionPanel } from '../features/accounts/components/direct-account-selection-panel'
import { useCombinedAccountSelection } from '../features/accounts/hooks/use-combined-account-selection'

interface CombinedAccountSelectionProps {
  onAccountSelected: () => void
  onBack?: () => void
}

const CombinedAccountSelection = ({ onAccountSelected, onBack }: CombinedAccountSelectionProps) => {
  const {
    user,
    error,
    isPageLoading,
    showMccStep,
    mccItems,
    standaloneAccounts,
    directAccounts,
    selectMcc,
    clearSelection,
    handleAccountSelect,
  } = useCombinedAccountSelection({ onAccountSelected })

  if (isPageLoading) {
    return <LoadingScreen platform="google" />
  }

  return (
    <NarrowPageContainer>
      <AccountSelectionHeader
        onBack={onBack}
        title={`Welcome${user?.name ? `, ${user.name.split(' ')[0]}` : ''}!`}
        leading={user ? (
          <UserAvatar
            name={user.name}
            imageUrl={user.picture_url}
            size="lg"
            className="border-2 border-secondary"
          />
        ) : null}
      />

      {error && (
        <div className="mx-6 mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {showMccStep ? (
        <MccSelectionPanel
          mccItems={mccItems}
          standaloneAccounts={standaloneAccounts}
          onSelectMcc={selectMcc}
          onClearMcc={clearSelection}
          onSelectAccount={handleAccountSelect}
        />
      ) : (
        <DirectAccountSelectionPanel
          accounts={directAccounts}
          onSelectAccount={handleAccountSelect}
        />
      )}
    </NarrowPageContainer>
  )
}

export default CombinedAccountSelection
