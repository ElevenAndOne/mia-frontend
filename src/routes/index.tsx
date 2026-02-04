import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'

import IntroPage from '../pages/intro-page'
import InvitePage from '../pages/invite-page'
import AccountSelectionPage from '../pages/account-selection-page'
import MetaAccountSelectionPage from '../pages/meta-account-selection-page'

const ChatPage = lazy(() => import('../pages/chat-page'))
const DashboardPage = lazy(() => import('../pages/dashboard-page'))
const IntegrationsPage = lazy(() => import('../pages/integrations-page'))
const InsightsGrowPage = lazy(() => import('../pages/insights-grow-page'))
const InsightsOptimizePage = lazy(() => import('../pages/insights-optimize-page'))
const InsightsProtectPage = lazy(() => import('../pages/insights-protect-page'))
const InsightsSummaryPage = lazy(() => import('../pages/insights-summary-page'))
const OnboardingPage = lazy(() => import('../pages/onboarding-page'))
const HelpPage = lazy(() => import('../pages/help-page'))
const WorkspaceSettingsPage = lazy(() => import('../pages/workspace-settings-page'))

const LazyLoadSpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-secondary">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
  </div>
)

interface AppRoutesProps {
  onAuthSuccess: () => void
  onMetaAuthSuccess: () => void
  hasSeenIntro: boolean
  onOAuthPopupClosed: (platform: 'google' | 'meta' | null) => void
  onOnboardingComplete: () => void
  onConnectPlatform: (platformId: string) => Promise<void>
  onInviteAccepted: (tenantId: string, skipAccountSelection?: boolean) => Promise<void>
}

export const AppRoutes = ({
  onAuthSuccess,
  onMetaAuthSuccess,
  hasSeenIntro,
  onOAuthPopupClosed,
  onOnboardingComplete,
  onConnectPlatform,
  onInviteAccepted,
}: AppRoutesProps) => {
  const location = useLocation()

  return (
    <Suspense fallback={<LazyLoadSpinner />}>
      <Routes location={location}>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <IntroPage
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

        {/* Auth Routes - require authentication */}
        <Route
          path="/login"
          element={
            <ProtectedRoute>
              <AccountSelectionPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/login/meta"
          element={
            <ProtectedRoute requireMetaAuth>
              <MetaAccountSelectionPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - require authentication and account */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute requireAccount>
              <OnboardingPage
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

        {/* Legacy main view - accessible at /dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireAccount>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/integrations"
          element={
            <ProtectedRoute>
              <IntegrationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <HelpPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/workspace"
          element={
            <ProtectedRoute requireAccount requireWorkspace>
              <WorkspaceSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Insights Routes */}
        <Route
          path="/insights/grow"
          element={
            <ProtectedRoute requireAccount>
              <InsightsGrowPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights/optimize"
          element={
            <ProtectedRoute requireAccount>
              <InsightsOptimizePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights/protect"
          element={
            <ProtectedRoute requireAccount>
              <InsightsProtectPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights/summary"
          element={
            <ProtectedRoute requireAccount>
              <InsightsSummaryPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
