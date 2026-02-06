import { lazy } from 'react'
import { useNavigation } from '@contexts/navigation-context'
import { AppLayout } from '@components/app-layout'

const IntegrationsPage = lazy(() => import('@features/integrations/integrations-page'))

export const IntegrationsPageWrapper = () => {
  const { navigateBack } = useNavigation()

  return (
    <AppLayout>
      <div className="w-full h-full">
        <IntegrationsPage onBack={navigateBack} />
      </div>
    </AppLayout>
  )
}

export default IntegrationsPageWrapper
