import { Suspense, lazy } from 'react'
import { AppRoutes } from './routes'
import LoadingScreen from './components/loading-screen'
import { ToastContainer } from './components/toast'
import CreateWorkspaceModal from './features/workspace/views/create-workspace-modal'
import { useAppController } from './hooks/use-app-controller'

const InsightsDatePickerModal = lazy(() => import('./features/insights/views/insights-date-picker-modal'))

function App() {
  const {
    hasSeenIntro,
    showLoadingScreen,
    loadingPlatform,
    onOAuthPopupClosed,
    appRoutes,
    insightsDatePicker,
    createWorkspaceModal,
  } = useAppController()

  if (showLoadingScreen) {
    return <LoadingScreen platform={loadingPlatform} />
  }

  return (
    <div className="w-screen h-dvh">
      <div className="w-full h-full">
        <AppRoutes
          onAuthSuccess={appRoutes.onAuthSuccess}
          onMetaAuthSuccess={appRoutes.onMetaAuthSuccess}
          hasSeenIntro={hasSeenIntro}
          onOAuthPopupClosed={onOAuthPopupClosed}
          onOnboardingComplete={appRoutes.onOnboardingComplete}
          onConnectPlatform={appRoutes.onConnectPlatform}
          onInviteAccepted={appRoutes.onInviteAccepted}
        />
      </div>

      <Suspense fallback={null}>
        <InsightsDatePickerModal
          isOpen={insightsDatePicker.isOpen}
          onClose={insightsDatePicker.onClose}
          onGenerate={insightsDatePicker.onGenerate}
          insightType={insightsDatePicker.insightType}
        />
      </Suspense>

      <CreateWorkspaceModal
        isOpen={createWorkspaceModal.isOpen}
        required={createWorkspaceModal.required}
        onClose={createWorkspaceModal.onClose}
        onSuccess={createWorkspaceModal.onSuccess}
      />

      <ToastContainer />
    </div>
  )
}

export default App
