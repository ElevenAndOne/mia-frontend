import { Suspense, lazy } from 'react'
import { AppRoutes } from './routes'
import LoadingScreen from './components/loading-screen'
import { ToastContainer } from './components/toast'
import { useAppController } from './hooks/use-app-controller'

// Lazy: keeps the modal (and the overlay/framer-motion graph behind it) out of
// the entry chunk — it only loads the first time a user actually opens it.
const CreateWorkspaceModal = lazy(() => import('./features/workspace/views/create-workspace-modal'))

const InsightsDatePickerModal = lazy(
  () => import('./features/insights/views/insights-date-picker-modal')
)

const WhatsAppAlertModal = lazy(
  () =>
    import('./features/whatsapp-alerts/whatsapp-alert-modal').then((m) => ({
      default: m.WhatsAppAlertModal,
    }))
)

function App() {
  const {
    hasSeenIntro,
    showLoadingScreen,
    loadingPlatform,
    onOAuthPopupClosed,
    appRoutes,
    insightsDatePicker,
    createWorkspaceModal,
    waAlertData,
    snoozeWaAlert,
    clearWaAlert,
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

      {createWorkspaceModal.isOpen && (
        <Suspense fallback={null}>
          <CreateWorkspaceModal
            isOpen={createWorkspaceModal.isOpen}
            required={createWorkspaceModal.required}
            onClose={createWorkspaceModal.onClose}
            onSuccess={createWorkspaceModal.onSuccess}
          />
        </Suspense>
      )}

      {waAlertData && (
        <Suspense fallback={null}>
          <WhatsAppAlertModal
            data={waAlertData}
            onSnooze={snoozeWaAlert}
            onDismiss={clearWaAlert}
          />
        </Suspense>
      )}

      <ToastContainer />
    </div>
  )
}

export default App
