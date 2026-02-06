import { lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@contexts/session-context'

const CombinedAccountSelection = lazy(
  () => import('@components/combined-account-selection')
)

interface AccountsPageProps {
  onAccountSelected: () => void
}

export const AccountsPage = ({ onAccountSelected }: AccountsPageProps) => {
  const navigate = useNavigate()
  const { logout, activeWorkspace } = useSession()

  const handleBack = () => {
    if (activeWorkspace) {
      navigate('/home')
    } else {
      logout()
      navigate('/login')
    }
  }

  return (
    <div className="w-full h-full">
      <CombinedAccountSelection
        onAccountSelected={onAccountSelected}
        onBack={handleBack}
      />
    </div>
  )
}

export default AccountsPage
