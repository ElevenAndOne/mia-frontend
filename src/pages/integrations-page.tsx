import { useNavigate, useSearchParams } from 'react-router-dom'
import IntegrationsView from '../features/integrations/integrations-page'

/** Where "back" goes, by where you came from. Basic reaches Connections from Workspace
 *  settings and has no nav entry to return by, so backing out to Home would strand them. */
const RETURN_TO: Record<string, string> = {
  settings: '/settings/workspace?tab=members',
}

const IntegrationsPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const back = RETURN_TO[searchParams.get('from') ?? ''] ?? '/home'

  return (
    <>
      <div className="w-full h-full">
        <IntegrationsView onBack={() => navigate(back)} />
      </div>
    </>
  )
}

export default IntegrationsPage
