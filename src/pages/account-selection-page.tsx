import { useNavigate } from 'react-router-dom'
import LoadingScreen from '../components/loading-screen'
import { UserAvatar } from '../components/user-avatar'
import { Alert } from '../components/alert'
import { AccountSelectionHeader } from '../components/account-selection-header'
import { NarrowPageContainer } from '../components/narrow-page-container'
import { useSession } from '../contexts/session-context'
import { MccSelectionPanel } from '../features/accounts/components/mcc-selection-panel'
import { DirectAccountSelectionPanel } from '../features/accounts/components/direct-account-selection-panel'
import { useCombinedAccountSelection } from '../features/accounts/hooks/use-combined-account-selection'

interface AccountSelectionPageProps {
  onAccountSelected?: () => void
}

const AccountSelectionPage = ({ onAccountSelected }: AccountSelectionPageProps) => {
  const navigate = useNavigate()
  const { logout, activeWorkspace } = useSession()
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
  } = useCombinedAccountSelection({ onAccountSelected: onAccountSelected ?? (() => {}) })

  const handleBack = () => {
    if (activeWorkspace) {
      navigate('/home')
      return
    }
    logout()
    navigate('/')
  }

  if (isPageLoading) {
    return <LoadingScreen platform="google" />
  }

  return (
    <NarrowPageContainer>
      <AccountSelectionHeader
        onBack={handleBack}
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
        <div className="px-6 mb-4 max-w-3xl h-full mx-auto ">
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

export default AccountSelectionPage
