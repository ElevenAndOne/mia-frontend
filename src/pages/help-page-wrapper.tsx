import { lazy } from 'react'
import { useNavigation } from '@contexts/navigation-context'
import { AppLayout } from '@components/app-layout'

const HelpPage = lazy(() => import('@components/help-page'))

export const HelpPageWrapper = () => {
  const { navigateBack } = useNavigation()

  return (
    <AppLayout>
      <div className="w-full h-full">
        <HelpPage onBack={navigateBack} />
      </div>
    </AppLayout>
  )
}

export default HelpPageWrapper
