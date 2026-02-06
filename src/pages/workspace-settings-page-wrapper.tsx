import { lazy } from 'react'
import { useNavigation } from '@contexts/navigation-context'
import { AppLayout } from '@components/app-layout'

const WorkspaceSettingsPage = lazy(() => import('@components/workspace-settings-page'))

export const WorkspaceSettingsPageWrapper = () => {
  const { navigateBack } = useNavigation()

  return (
    <AppLayout>
      <div className="w-full h-full">
        <WorkspaceSettingsPage onBack={navigateBack} />
      </div>
    </AppLayout>
  )
}

export default WorkspaceSettingsPageWrapper
