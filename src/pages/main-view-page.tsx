import { lazy } from 'react'
import { useNavigation } from '@contexts/navigation-context'

const MainView = lazy(() => import('@components/main-view'))

export const MainViewPage = () => {
  const {
    navigateIntegrations,
    navigateWorkspaceSettings,
    navigateInsight,
    handleLogout
  } = useNavigation()

  return (
    <div className="w-full h-full">
      <MainView
        onLogout={handleLogout}
        onIntegrationsClick={navigateIntegrations}
        onWorkspaceSettingsClick={navigateWorkspaceSettings}
        onSummaryQuickClick={(platforms) => {
          navigateInsight('summary', { platforms })
        }}
        onGrowQuickClick={(platforms) => {
          navigateInsight('grow', { platforms, showDatePicker: true })
        }}
        onOptimizeQuickClick={(platforms) => {
          navigateInsight('optimize', { platforms, showDatePicker: true })
        }}
        onProtectQuickClick={(platforms) => {
          navigateInsight('protect', { platforms, showDatePicker: true })
        }}
      />
    </div>
  )
}

export default MainViewPage
