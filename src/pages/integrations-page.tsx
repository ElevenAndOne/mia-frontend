import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Crumb } from '../components/breadcrumbs'
import IntegrationsView from '../features/integrations/integrations-page'

/** Where "up" goes, by where you came from. Basic reaches Connections from Workspace
 *  settings and has no nav entry to return by — and the back arrow was removed app-wide,
 *  so the breadcrumb is the only way out. */
const TRAIL: Record<string, Crumb[]> = {
  settings: [
    { label: 'Home', to: '/home' },
    { label: 'Workspace settings', to: '/settings/workspace?tab=members' },
  ],
}

const IntegrationsPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const trail = TRAIL[searchParams.get('from') ?? '']

  return (
    <>
      <div className="w-full h-full">
        <IntegrationsView
          onBack={() => navigate(trail ? '/settings/workspace?tab=members' : '/home')}
          breadcrumbs={trail ? [...trail, { label: 'Connections' }] : undefined}
        />
      </div>
    </>
  )
}

export default IntegrationsPage
