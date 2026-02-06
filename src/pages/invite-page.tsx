import { lazy } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const InviteLandingPage = lazy(() => import('@components/invite-landing-page'))

interface InvitePageProps {
  onAccepted: (tenantId: string, skip?: boolean) => Promise<void>
}

export const InvitePage = ({ onAccepted }: InvitePageProps) => {
  const navigate = useNavigate()
  const { inviteId } = useParams<{ inviteId: string }>()

  if (!inviteId) {
    navigate('/')
    return null
  }

  return (
    <div className="w-full h-full">
      <InviteLandingPage
        inviteId={inviteId}
        onAccepted={onAccepted}
        onBack={() => {
          window.history.replaceState({}, '', '/')
          navigate('/')
        }}
      />
    </div>
  )
}

export default InvitePage
