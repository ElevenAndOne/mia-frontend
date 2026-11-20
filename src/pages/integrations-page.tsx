import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Crumb } from '../components/breadcrumbs'
import IntegrationsView from '../features/integrations/integrations-page'
import { useExperience } from '../features/workspace/hooks/use-experience'

const IntegrationsPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isBasic } = useExperience()
  // Reached from Settings → Workspace: the trail goes back there.
  const trail: Crumb[] | undefined =
    searchParams.get('from') === 'settings'
      ? [
          { label: 'Home', to: '/home' },
          { label: isBasic ? 'Workspace settings' : 'Settings', to: '/settings/workspace' },
          { label: 'Workspace', to: '/settings/workspace?tab=members' },
        ]
      : undefined

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
