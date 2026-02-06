import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { LazyLoadSpinner } from '@components/lazy-load-spinner'

// Critical path components - load immediately
import VideoIntroView from '@components/video-intro-view'

// Lazy load pages
const LoginPage = lazy(() => import('@/pages/login-page'))
const AccountsPage = lazy(() => import('@/pages/accounts-page'))
const MetaAccountsPage = lazy(() => import('@/pages/meta-accounts-page'))
const ChatPage = lazy(() => import('@/pages/chat-page'))
const MainViewPage = lazy(() => import('@/pages/main-view-page'))
const IntegrationsPageWrapper = lazy(() => import('@/pages/integrations-page-wrapper'))
const HelpPageWrapper = lazy(() => import('@/pages/help-page-wrapper'))
const WorkspaceSettingsPageWrapper = lazy(() => import('@/pages/workspace-settings-page-wrapper'))
const InsightPageWrapper = lazy(() => import('@/pages/insight-page-wrapper'))
const InvitePage = lazy(() => import('@/pages/invite-page'))
const OnboardingChat = lazy(() => import('@features/onboarding/components/onboarding-chat'))

interface AppRoutesProps {
  onAuthSuccess: () => void
  onMetaAuthSuccess: () => void
  hasSeenIntro: boolean
  onOAuthPopupClosed: (platform: 'google' | 'meta' | null) => void
  onOnboardingComplete: () => void
  onConnectPlatform: (platformId: string) => Promise<void>
  onInviteAccepted: (tenantId: string, skipAccountSelection?: boolean) => Promise<void>
  onAccountSelected: () => void
}

export const AppRoutes = ({
  onAuthSuccess,
  onMetaAuthSuccess,
  hasSeenIntro,
  onOAuthPopupClosed,
  onOnboardingComplete,
  onConnectPlatform,
  onInviteAccepted,
  onAccountSelected
}: AppRoutesProps) => {
  const location = useLocation()

  return (
    <Suspense fallback={<LazyLoadSpinner />}>
      <Routes location={location}>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <VideoIntroView
              onAuthSuccess={onAuthSuccess}
              onMetaAuthSuccess={onMetaAuthSuccess}
              hasSeenIntro={hasSeenIntro}
              onOAuthPopupClosed={onOAuthPopupClosed}
            />
          }
        />

        <Route
          path="/invite/:inviteId"
          element={<InvitePage onAccepted={onInviteAccepted} />}
        />

        {/* Auth Routes - Login is pure authentication */}
        <Route
          path="/login"
          element={
            <LoginPage
              onAuthSuccess={onAuthSuccess}
              onMetaAuthSuccess={onMetaAuthSuccess}
              onOAuthPopupClosed={onOAuthPopupClosed}
            />
          }
        />

        {/* Account Selection Routes */}
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AccountsPage onAccountSelected={onAccountSelected} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/accounts/meta"
          element={
            <ProtectedRoute requireMetaAuth>
              <MetaAccountsPage onAccountSelected={onAccountSelected} />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute requireAccount>
              <OnboardingChat
                onComplete={onOnboardingComplete}
                onConnectPlatform={onConnectPlatform}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute requireAccount>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireAccount>
              <MainViewPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/integrations"
          element={
            <ProtectedRoute>
              <IntegrationsPageWrapper />
            </ProtectedRoute>
          }
        />

        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpPageWrapper />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/workspace"
          element={
            <ProtectedRoute requireAccount requireWorkspace>
              <WorkspaceSettingsPageWrapper />
            </ProtectedRoute>
          }
        />

        {/* Insights Routes */}
        <Route
          path="/insights/grow"
          element={
            <ProtectedRoute requireAccount>
              <InsightPageWrapper insightType="grow" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights/optimize"
          element={
            <ProtectedRoute requireAccount>
              <InsightPageWrapper insightType="optimize" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights/protect"
          element={
            <ProtectedRoute requireAccount>
              <InsightPageWrapper insightType="protect" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights/summary"
          element={
            <ProtectedRoute requireAccount>
              <InsightPageWrapper insightType="summary" />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
