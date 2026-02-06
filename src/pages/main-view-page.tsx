import { lazy } from 'react'
import { useNavigation } from '@contexts/navigation-context'
import { useInsightsDatePicker } from '@contexts/insights-date-picker-context'

const MainView = lazy(() => import('@components/main-view'))

export const MainViewPage = () => {
  const {
    navigateIntegrations,
    navigateWorkspaceSettings,
    navigateInsight,
    handleLogout
  } = useNavigation()
  const { showDatePicker } = useInsightsDatePicker()

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
          showDatePicker('grow', platforms)
        }}
        onOptimizeQuickClick={(platforms) => {
          showDatePicker('optimize', platforms)
        }}
        onProtectQuickClick={(platforms) => {
          showDatePicker('protect', platforms)
        }}
      />
    </div>
  )
}

export default MainViewPage
