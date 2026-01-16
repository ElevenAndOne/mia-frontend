import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './contexts/session-context'
import { useModalContext } from './contexts/modal-context'
import { useAppNavigation } from './hooks/use-app-navigation'
import LoadingScreen from './components/ui/loading-screen'
import CreateWorkspaceModal from './features/workspaces/components/create-workspace-modal'

// Critical path components - load immediately
import VideoIntroView from './screens/video-intro-view'
import CombinedAccountSelection from './screens/combined-account-selection'
import MetaAccountSelectionPage from './screens/meta-account-selection-page'

// Lazy loaded screens
const MainViewCopy = lazy(() => import('./screens/main-view-copy'))
const IntegrationsPage = lazy(() => import('./screens/integrations-page'))
const OnboardingChat = lazy(() => import('./screens/onboarding-chat-v2'))
const InviteLandingPage = lazy(() => import('./screens/invite-landing-page'))
const WorkspaceSettingsPage = lazy(() => import('./screens/workspace-settings-page'))
const GrowInsightsStreaming = lazy(() => import('./features/insights/components/grow-insights-streaming'))
const OptimizeInsightsStreaming = lazy(() => import('./features/insights/components/optimize-insights-streaming'))
const ProtectInsightsStreaming = lazy(() => import('./features/insights/components/protect-insights-streaming'))
const SummaryInsights = lazy(() => import('./features/insights/components/summary-insights'))
const InsightsDatePickerModal = lazy(() => import('./features/insights/components/insights-date-picker-modal'))

const LazySpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
  </div>
)

function App() {
  const { logout, loginMeta, refreshAccounts, refreshWorkspaces, switchWorkspace } = useSession()
  const { selectedAccount, hasSeenIntro, isAuthenticated, isMetaAuthenticated, activeWorkspace } = useSession()
  const { goToMain, goToAccountSetup, goToMetaAccountSetup, goToOnboarding, goToIntegrations, goToInsights, goToHome } = useAppNavigation()
  const {
    oauthLoadingPlatform,
    setOAuthLoading,
    showCreateWorkspaceModal,
    setShowCreateWorkspaceModal,
    showInsightsDatePicker,
    pendingInsightType,
    selectedInsightDateRange,
    pendingPlatforms,
    openInsightsDatePicker,
    closeInsightsDatePicker,
    handleInsightsDateGenerate
  } = useModalContext()

  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated

  // Preload critical images
  useEffect(() => {
    const criticalImages = [
      '/icons/Vector.png',
      '/icons/Mia.png',
      '/images/Grow Nav.png',
      '/images/Optimise Nav.png',
      '/images/Protect Nav.png'
    ]
    criticalImages.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })
  }, [])

  // OAuth loading screen
  if (oauthLoadingPlatform) {
    return <LoadingScreen platform={oauthLoadingPlatform} />
  }

  const onInsightsDateGenerate = (dateRange: string) => {
    const insightType = handleInsightsDateGenerate(dateRange)
    if (insightType) {
      goToInsights(insightType as 'grow' | 'optimize' | 'protect' | 'summary')
    }
  }

  return (
    <div className="w-full h-full relative">
      <Suspense fallback={<LazySpinner />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <VideoIntroView
                onAuthSuccess={() => selectedAccount ? goToMain() : goToAccountSetup()}
                onMetaAuthSuccess={() => goToMetaAccountSetup()}
                hasSeenIntro={hasSeenIntro}
                onOAuthPopupClosed={setOAuthLoading}
              />
            }
          />
          <Route
            path="/invite/:inviteId"
            element={
              <InviteLandingPage
                inviteId={window.location.pathname.split('/invite/')[1] || ''}
                onAccepted={async (tenantId) => {
                  window.history.replaceState({}, '', '/')
                  await refreshWorkspaces()
                  await switchWorkspace(tenantId)
                  if (isAnyAuthenticated && selectedAccount) goToMain()
                  else if (isAnyAuthenticated) goToAccountSetup()
                  else goToHome()
                }}
                onBack={() => {
                  window.history.replaceState({}, '', '/')
                  goToHome()
                }}
              />
            }
          />

          {/* Setup routes */}
          <Route
            path="/setup/account"
            element={<CombinedAccountSelection onAccountSelected={() => {}} onBack={() => logout()} />}
          />
          <Route
            path="/setup/meta-account"
            element={<MetaAccountSelectionPage onAccountSelected={() => goToOnboarding()} onBack={() => logout()} />}
          />
          <Route
            path="/onboarding"
            element={
              <OnboardingChat
                onComplete={() => goToMain()}
                onSkip={() => goToMain()}
                onConnectPlatform={async (platformId) => {
                  if (['meta_ads', 'meta', 'facebook_organic'].includes(platformId)) {
                    const success = await loginMeta()
                    if (success) await refreshAccounts()
                  } else {
                    localStorage.setItem('pending_platform_connect', platformId)
                    goToIntegrations()
                  }
                }}
              />
            }
          />

          {/* App routes */}
          <Route
            path="/app"
            element={
              <MainViewCopy
                onLogout={async () => { await logout(); goToHome() }}
                onIntegrationsClick={() => goToIntegrations()}
                onWorkspaceSettingsClick={() => goToInsights('summary')}
                onSummaryQuickClick={() => goToInsights('summary')}
                onGrowQuickClick={(platforms) => openInsightsDatePicker('grow', platforms || [])}
                onOptimizeQuickClick={(platforms) => openInsightsDatePicker('optimize', platforms || [])}
                onProtectQuickClick={(platforms) => openInsightsDatePicker('protect', platforms || [])}
              />
            }
          />
          <Route path="/app/integrations" element={<IntegrationsPage onBack={() => goToMain()} />} />
          <Route path="/app/settings" element={<WorkspaceSettingsPage onBack={() => goToMain()} />} />
          <Route
            path="/app/insights/grow"
            element={<GrowInsightsStreaming onBack={() => goToMain()} initialDateRange={selectedInsightDateRange} platforms={pendingPlatforms} />}
          />
          <Route
            path="/app/insights/optimize"
            element={<OptimizeInsightsStreaming onBack={() => goToMain()} initialDateRange={selectedInsightDateRange} platforms={pendingPlatforms} />}
          />
          <Route
            path="/app/insights/protect"
            element={<ProtectInsightsStreaming onBack={() => goToMain()} initialDateRange={selectedInsightDateRange} platforms={pendingPlatforms} />}
          />
          <Route
            path="/app/insights/summary"
            element={<SummaryInsights onBack={() => goToMain()} />}
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Modals */}
      <Suspense fallback={null}>
        <InsightsDatePickerModal
          isOpen={showInsightsDatePicker}
          onClose={closeInsightsDatePicker}
          onGenerate={onInsightsDateGenerate}
          insightType={pendingInsightType || 'grow'}
        />
      </Suspense>

      <CreateWorkspaceModal
        isOpen={showCreateWorkspaceModal}
        required={true}
        onClose={() => {}}
        onSuccess={(tenantId) => {
          setShowCreateWorkspaceModal(false)
          goToOnboarding()
        }}
      />
    </div>
  )
}

export default App
