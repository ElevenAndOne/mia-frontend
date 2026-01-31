import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ProtectedRoute } from './protected-route'
import { useSession } from '../contexts/session-context'

// Critical path components - load immediately
import VideoIntroView from '../components/video-intro-view'
import CombinedAccountSelection from '../components/combined-account-selection'
import MetaAccountSelectionPage from '../components/meta-account-selection-page'
import { AppShell } from '../components/app-shell'

// Lazy load all other pages
const MainView = lazy(() => import('../components/main-view'))
const ChatView = lazy(() => import('../features/chat/components/chat-view'))
const IntegrationsPage = lazy(() => import('../features/integrations/integrations-page'))
const InsightPage = lazy(() => import('../features/insights/components/insight-page'))
const SummaryInsights = lazy(() => import('../features/insights/components/summary-insights'))
const OnboardingChat = lazy(() => import('../features/onboarding/components/onboarding-chat'))
const InviteLandingPage = lazy(() => import('../components/invite-landing-page'))
const WorkspaceSettingsPage = lazy(() => import('../components/workspace-settings-page'))

const LazyLoadSpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-secondary">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
  </div>
)

// Wrapper components that use hooks for navigation

const ChatViewWrapper = () => {
  const navigate = useNavigate()
  const { logout } = useSession()

  const handleNewChat = () => {
    // Trigger new chat by navigating to home with a state flag
    navigate('/home', { state: { newChat: true } })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <AppShell
      onNewChat={handleNewChat}
      onIntegrationsClick={() => navigate('/integrations')}
      onLogout={handleLogout}
      onWorkspaceSettings={() => navigate('/settings/workspace')}
    >
      <div className="w-full h-full">
        <ChatView
          onIntegrationsClick={() => navigate('/integrations')}
          onLogout={handleLogout}
          onWorkspaceSettings={() => navigate('/settings/workspace')}
        />
      </div>
    </AppShell>
  )
}

const MainViewWrapper = () => {
  const navigate = useNavigate()
  const { logout } = useSession()

  return (
    <div className="w-full h-full">
      <MainView
        onLogout={async () => {
          await logout()
          navigate('/')
        }}
        onIntegrationsClick={() => navigate('/integrations')}
        onWorkspaceSettingsClick={() => navigate('/settings/workspace')}
        onSummaryQuickClick={(platforms) => {
          const params = new URLSearchParams()
          if (platforms?.length) params.set('platforms', platforms.join(','))
          navigate(`/insights/summary?${params.toString()}`)
        }}
        onGrowQuickClick={(platforms) => {
          const params = new URLSearchParams()
          if (platforms?.length) params.set('platforms', platforms.join(','))
          navigate(`/insights/grow?${params.toString()}`, { state: { showDatePicker: true } })
        }}
        onOptimizeQuickClick={(platforms) => {
          const params = new URLSearchParams()
          if (platforms?.length) params.set('platforms', platforms.join(','))
          navigate(`/insights/optimize?${params.toString()}`, { state: { showDatePicker: true } })
        }}
        onProtectQuickClick={(platforms) => {
          const params = new URLSearchParams()
          if (platforms?.length) params.set('platforms', platforms.join(','))
          navigate(`/insights/protect?${params.toString()}`, { state: { showDatePicker: true } })
        }}
      />
    </div>
  )
}

const IntegrationsWrapper = () => {
  const navigate = useNavigate()
  const { logout } = useSession()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <AppShell
      onNewChat={() => navigate('/home', { state: { newChat: true } })}
      onIntegrationsClick={() => navigate('/integrations')}
      onLogout={handleLogout}
      onWorkspaceSettings={() => navigate('/settings/workspace')}
    >
      <div className="w-full h-full">
        <IntegrationsPage onBack={() => navigate('/home')} />
      </div>
    </AppShell>
  )
}

const WorkspaceSettingsWrapper = () => {
  const navigate = useNavigate()
  const { logout } = useSession()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <AppShell
      onNewChat={() => navigate('/home', { state: { newChat: true } })}
      onIntegrationsClick={() => navigate('/integrations')}
      onLogout={handleLogout}
      onWorkspaceSettings={() => navigate('/settings/workspace')}
    >
      <div className="w-full h-full">
        <WorkspaceSettingsPage onBack={() => navigate('/home')} />
      </div>
    </AppShell>
  )
}

const GrowInsightsWrapper = () => {
  const navigate = useNavigate()
  const { logout } = useSession()
  const [searchParams] = useSearchParams()
  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean)
  const dateRange = searchParams.get('range') || '30_days'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <AppShell
      onNewChat={() => navigate('/home', { state: { newChat: true } })}
      onIntegrationsClick={() => navigate('/integrations')}
      onLogout={handleLogout}
      onWorkspaceSettings={() => navigate('/settings/workspace')}
    >
      <div className="w-full h-full">
        <InsightPage
          insightType="grow"
          onBack={() => navigate('/home')}
          initialDateRange={dateRange}
          platforms={platforms}
        />
      </div>
    </AppShell>
  )
}

const OptimizeInsightsWrapper = () => {
  const navigate = useNavigate()
  const { logout } = useSession()
  const [searchParams] = useSearchParams()
  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean)
  const dateRange = searchParams.get('range') || '30_days'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <AppShell
      onNewChat={() => navigate('/home', { state: { newChat: true } })}
      onIntegrationsClick={() => navigate('/integrations')}
      onLogout={handleLogout}
      onWorkspaceSettings={() => navigate('/settings/workspace')}
    >
      <div className="w-full h-full">
        <InsightPage
          insightType="optimize"
          onBack={() => navigate('/home')}
          initialDateRange={dateRange}
          platforms={platforms}
        />
      </div>
    </AppShell>
  )
}

const ProtectInsightsWrapper = () => {
  const navigate = useNavigate()
  const { logout } = useSession()
  const [searchParams] = useSearchParams()
  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean)
  const dateRange = searchParams.get('range') || '30_days'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <AppShell
      onNewChat={() => navigate('/home', { state: { newChat: true } })}
      onIntegrationsClick={() => navigate('/integrations')}
      onLogout={handleLogout}
      onWorkspaceSettings={() => navigate('/settings/workspace')}
    >
      <div className="w-full h-full">
        <InsightPage
          insightType="protect"
          onBack={() => navigate('/home')}
          initialDateRange={dateRange}
          platforms={platforms}
        />
      </div>
    </AppShell>
  )
}

const SummaryInsightsWrapper = () => {
  const navigate = useNavigate()
  const { logout } = useSession()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <AppShell
      onNewChat={() => navigate('/home', { state: { newChat: true } })}
      onIntegrationsClick={() => navigate('/integrations')}
      onLogout={handleLogout}
      onWorkspaceSettings={() => navigate('/settings/workspace')}
    >
      <div className="w-full h-full">
        <SummaryInsights onBack={() => navigate('/home')} />
      </div>
    </AppShell>
  )
}

const InviteWrapper = ({ onAccepted }: { onAccepted: (tenantId: string, skip?: boolean) => Promise<void> }) => {
  const navigate = useNavigate()
  const { inviteId } = useParams<{ inviteId: string }>()

  if (!inviteId) {
    navigate('/')
    return null
  }

  return (
    <div className="w-full h-full">
      <InviteLandingPage
        inviteId={inviteId}
        onAccepted={onAccepted}
        onBack={() => {
          window.history.replaceState({}, '', '/')
          navigate('/')
        }}
      />
    </div>
  )
}

interface AppRoutesProps {
  // Video intro handlers
  onAuthSuccess: () => void
  onMetaAuthSuccess: () => void
  hasSeenIntro: boolean
  onOAuthPopupClosed: (platform: 'google' | 'meta' | null) => void
  // Onboarding
  onOnboardingComplete: () => void
  onConnectPlatform: (platformId: string) => Promise<void>
  // Invite
  onInviteAccepted: (tenantId: string, skipAccountSelection?: boolean) => Promise<void>
}

export const AppRoutes = ({
  onAuthSuccess,
  onMetaAuthSuccess,
  hasSeenIntro,
  onOAuthPopupClosed,
  onOnboardingComplete,
  onConnectPlatform,
  onInviteAccepted
}: AppRoutesProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, activeWorkspace } = useSession()

  return (
    <Suspense fallback={<LazyLoadSpinner />}>
      <Routes location={location}>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <div className="w-full h-full">
                <VideoIntroView
                  onAuthSuccess={onAuthSuccess}
                  onMetaAuthSuccess={onMetaAuthSuccess}
                  hasSeenIntro={hasSeenIntro}
                  onOAuthPopupClosed={onOAuthPopupClosed}
                />
              </div>
            }
          />

          <Route
            path="/invite/:inviteId"
            element={<InviteWrapper onAccepted={onInviteAccepted} />}
          />

          {/* Auth Routes - require authentication */}
          <Route
            path="/login"
            element={
              <ProtectedRoute>
                <div className="w-full h-full">
                  <CombinedAccountSelection
                    onAccountSelected={() => {}}
                    onBack={() => {
                      if (activeWorkspace) {
                        navigate('/home')
                      } else {
                        logout()
                        navigate('/')
                      }
                    }}
                  />
                </div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/login/meta"
            element={
              <ProtectedRoute requireMetaAuth>
                <div className="w-full h-full">
                  <MetaAccountSelectionPage
                    onAccountSelected={() => navigate('/onboarding')}
                    onBack={() => {
                      logout()
                      navigate('/')
                    }}
                  />
                </div>
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - require authentication and account */}
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
                <ChatViewWrapper />
              </ProtectedRoute>
            }
          />

          {/* Legacy main view - accessible at /dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAccount>
                <MainViewWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/integrations"
            element={
              <ProtectedRoute>
                <IntegrationsWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings/workspace"
            element={
              <ProtectedRoute requireAccount requireWorkspace>
                <WorkspaceSettingsWrapper />
              </ProtectedRoute>
            }
          />

          {/* Insights Routes */}
          <Route
            path="/insights/grow"
            element={
              <ProtectedRoute requireAccount>
                <GrowInsightsWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/insights/optimize"
            element={
              <ProtectedRoute requireAccount>
                <OptimizeInsightsWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/insights/protect"
            element={
              <ProtectedRoute requireAccount>
                <ProtectInsightsWrapper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/insights/summary"
            element={
              <ProtectedRoute requireAccount>
                <SummaryInsightsWrapper />
              </ProtectedRoute>
            }
          />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
