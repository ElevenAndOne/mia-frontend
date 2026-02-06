import { lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@contexts/session-context'

const MetaAccountSelectionPage = lazy(
  () => import('@components/meta-account-selection-page')
)

interface MetaAccountsPageProps {
  onAccountSelected: () => void
}

export const MetaAccountsPage = ({ onAccountSelected }: MetaAccountsPageProps) => {
  const navigate = useNavigate()
  const { logout } = useSession()

  const handleBack = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="w-full h-full">
      <MetaAccountSelectionPage
        onAccountSelected={onAccountSelected}
        onBack={handleBack}
      />
    </div>
  )
}

export default MetaAccountsPage
