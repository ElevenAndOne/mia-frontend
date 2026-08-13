import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { ErrorBoundary } from '../components/error-boundary'
import { Spinner } from '../components/spinner'

// Lazy like every other page — two of these import framer-motion, which kept
// the whole animation library in the entry chunk when they were eager.
const IntroPage = lazy(() => import('../pages/intro-page'))
const InvitePage = lazy(() => import('../pages/invite-page'))
const AccountSelectionPage = lazy(() => import('../pages/account-selection-page'))
const MetaAccountSelectionPage = lazy(() => import('../pages/meta-account-selection-page'))

// Layout route: mounts the sidebar once; child pages render into its <Outlet />.
// Lazy so the shell (sidebar + command palette graph) stays out of the entry chunk.
const AppShellLayout = lazy(() => import('../components/app-shell-layout'))

const ChatPage = lazy(() => import('../pages/chat-page'))
const IntegrationsPage = lazy(() => import('../pages/integrations-page'))
const InsightsGrowPage = lazy(() => import('../pages/insights-grow-page'))
const InsightsOptimizePage = lazy(() => import('../pages/insights-optimize-page'))
const InsightsProtectPage = lazy(() => import('../pages/insights-protect-page'))
const InsightsSummaryPage = lazy(() => import('../pages/insights-summary-page'))
const InsightsPredictPage = lazy(() => import('../pages/insights-predict-page'))
const OnboardingPage = lazy(() => import('../pages/onboarding-page'))
const HelpPage = lazy(() => import('../pages/help-page'))
const WorkspaceSettingsPage = lazy(() => import('../pages/workspace-settings-page'))
const CampaignsPage = lazy(() => import('../pages/campaigns-page'))
const NewCampaignPage = lazy(() => import('../pages/new-campaign-page'))
const CampaignWorkspacePage = lazy(() => import('../pages/campaign-workspace-page'))
const StrategisePage = lazy(() => import('../pages/strategise-page'))
const SchedulerPage = lazy(() => import('../pages/scheduler-page'))
const PostsPage = lazy(() => import('../pages/posts-page'))
const ReportsPage = lazy(() => import('../pages/reports-page'))
const ReportPrintPage = lazy(() => import('../features/reports/report-print-page'))
const BudgetTrackerPage = lazy(() => import('../pages/budget-tracker-page'))
const NotFoundPage = lazy(() => import('../pages/not-found-page'))
const CreativeStudioPage = lazy(() => import('../pages/creative-studio-page'))
const InternalPulsePage = lazy(() => import('../pages/internal-pulse-page'))

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

        <Route path="/invite/:inviteId" element={<InvitePage onAccepted={onInviteAccepted} />} />

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

        {/* Onboarding requires authentication + a WORKSPACE — but NOT a selected account.
            Account selection happens INSIDE the onboarding chat (the in-chat picker), so
            requiring an account here creates a catch-22 that strands first-time users on
            /login before onboarding renders (re-applies 471f321). requireWorkspace keeps
            workspace-less users on the /login → create-workspace flow, where the in-chat
            picker would otherwise dead-end (it needs a workspace row to attach the account
            to). use-auth-redirects has no /onboarding branch, so no redirect loop;
            OnboardingChat renders safely with a null selectedAccount. */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute requireWorkspace>
              <OnboardingPage
                onComplete={onOnboardingComplete}
                onConnectPlatform={onConnectPlatform}
              />
            </ProtectedRoute>
          }
        />

        {/* Legacy /dashboard route — redirects to /home */}
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        {/* backward-compat redirects */}
        <Route path="/strategise" element={<Navigate to="/predict" replace />} />
        <Route path="/insights/predict" element={<Navigate to="/insights/strategise" replace />} />

        {/* Main app — every page here shares one persistent AppShell (sidebar +
            command palette). Navigating between them only suspends the content
            pane, never the shell. */}
        <Route element={<AppShellLayout />}>
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

          <Route
            path="/campaigns"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <CampaignsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* Build a new campaign (chat / brief upload). Also where /campaigns
              redirects when the workspace has no campaigns yet. */}
          <Route
            path="/campaigns/new"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <NewCampaignPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* New multi-view campaign workspace (Overview / Calendar / Builder).
              Deep-linkable per campaign + view. */}
          <Route
            path="/campaigns/:campaignId/:view"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <CampaignWorkspacePage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/predict"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <StrategisePage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/scheduler"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <SchedulerPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/posts"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <PostsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <ReportsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/budget-tracker"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <BudgetTrackerPage />
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

          <Route
            path="/insights/strategise"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <InsightsPredictPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/creative-studio"
            element={
              <ProtectedRoute requireAccount>
                <ErrorBoundary>
                  <CreativeStudioPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Standalone print route for server-side (Playwright) PDF rendering.
            NOT protected — authenticates via the `sid` query param. */}
        <Route
          path="/report-print"
          element={
            <ErrorBoundary>
              <ReportPrintPage />
            </ErrorBoundary>
          }
        />

        {/* Internal-only beta-usage dashboard ("Mia Pulse"). Auth-gated here; the
            backend PULSE_ADMIN_EMAILS allowlist is the real access control. No account
            selection needed — it's a cross-tenant admin view. */}
        <Route
          path="/internal/pulse"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <InternalPulsePage />
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
