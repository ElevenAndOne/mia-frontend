import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { ErrorBoundary } from '../components/error-boundary'
import { Spinner } from '../components/spinner'

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
const NotFoundPage = lazy(() => import('../pages/not-found-page'))

const LazyLoadSpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-secondary">
    <Spinner size="md" />
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

        {/* Onboarding - requires auth only (account selection happens during onboarding) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
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
              <ErrorBoundary>
                <ChatPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Legacy main view - accessible at /dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireAccount>
              <ErrorBoundary>
                <DashboardPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/integrations"
          element={
            <ProtectedRoute requireAccount>
              <ErrorBoundary>
                <IntegrationsPage />
              </ErrorBoundary>
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
              <ErrorBoundary>
                <WorkspaceSettingsPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Insights Routes */}
        <Route
          path="/insights/grow"
          element={
            <ProtectedRoute requireAccount>
              <ErrorBoundary>
                <InsightsGrowPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights/optimize"
          element={
            <ProtectedRoute requireAccount>
              <ErrorBoundary>
                <InsightsOptimizePage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights/protect"
          element={
            <ProtectedRoute requireAccount>
              <ErrorBoundary>
                <InsightsProtectPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/insights/summary"
          element={
            <ProtectedRoute requireAccount>
              <ErrorBoundary>
                <InsightsSummaryPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* 404 Not Found - catch-all route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
