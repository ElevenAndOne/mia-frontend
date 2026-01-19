import { useState, useEffect, lazy, Suspense } from 'react'
// Note: react-router-dom may be needed for future routing features
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from './contexts/SessionContext'

// Critical path components - load immediately
import VideoIntroView from './components/VideoIntroView'
import CombinedAccountSelection from './components/CombinedAccountSelection'
import MetaAccountSelectionPage from './components/MetaAccountSelectionPage'
import LoadingScreen from './components/LoadingScreen'
import CreateWorkspaceModal from './components/CreateWorkspaceModal'

// Lazy load all other pages - only downloaded when needed
const MainViewCopy = lazy(() => import('./components/MainViewCopy'))
const IntegrationsPage = lazy(() => import('./components/IntegrationsPage'))
const GrowInsightsStreaming = lazy(() => import('./components/GrowInsightsStreaming'))
const OptimizeInsightsStreaming = lazy(() => import('./components/OptimizeInsightsStreaming'))
const ProtectInsightsStreaming = lazy(() => import('./components/ProtectInsightsStreaming'))
const SummaryInsights = lazy(() => import('./components/SummaryInsights'))
const InsightsDatePickerModal = lazy(() => import('./components/InsightsDatePickerModal'))
const OnboardingChat = lazy(() => import('./components/OnboardingChatV2'))
const InviteLandingPage = lazy(() => import('./components/InviteLandingPage'))
const WorkspaceSettingsPage = lazy(() => import('./components/WorkspaceSettingsPage'))

// Loading spinner for lazy-loaded components
const LazyLoadSpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
  </div>
)

type AppState = 'video-intro' | 'account-selection' | 'meta-account-selection' | 'onboarding-chat' | 'main' | 'integrations' | 'grow-quick' | 'optimize-quick' | 'protect-quick' | 'summary-quick' | 'invite' | 'workspace-settings'

function App() {
  const { isAuthenticated, isMetaAuthenticated, selectedAccount, isLoading, sessionId, hasSeenIntro, activeWorkspace, availableWorkspaces } = useSession()

  // Persist appState to localStorage so page refresh keeps you on the same page
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('mia_app_state')
    // Only restore valid states (not video-intro or account-selection which need fresh auth check)
    if (saved && ['main', 'integrations', 'onboarding-chat', 'grow-quick', 'optimize-quick', 'protect-quick', 'summary-quick', 'workspace-settings'].includes(saved)) {
      return saved as AppState
    }
    return 'video-intro'
  })

  // Track OAuth loading state (shows LoadingScreen at App level when popup closes)
  const [oauthLoadingPlatform, setOauthLoadingPlatform] = useState<'google' | 'meta' | null>(null)

  // Workspace creation modal state (shown after account selection for new users)
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)

  // Invite page state (for /invite/{invite_id} URLs)
  const [inviteId, setInviteId] = useState<string | null>(null)

  // Track if user just accepted an invite (to skip onboarding)
  const [justAcceptedInvite, setJustAcceptedInvite] = useState(false)

  // Track if user is in Meta-first flow (authenticated via Meta, not Google)
  const isMetaFirstFlow = isMetaAuthenticated && !isAuthenticated

  // Save appState to localStorage when it changes
  useEffect(() => {
    console.log('[APP] appState changed to:', appState)
    localStorage.setItem('mia_app_state', appState)
  }, [appState])

  // Detect invite URL on mount (/invite/{invite_id})
  useEffect(() => {
    const path = window.location.pathname
    const inviteMatch = path.match(/^\/invite\/([a-zA-Z0-9_-]+)$/)
    if (inviteMatch) {
      const id = inviteMatch[1]
      console.log('[APP] Detected invite URL, invite_id:', id)
      setInviteId(id)
      setAppState('invite')
    }
  }, [])

  // Support both Google and Meta authentication
  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated

  // Date picker modal state
  const [showInsightsDatePicker, setShowInsightsDatePicker] = useState(false)
  const [pendingInsightType, setPendingInsightType] = useState<'grow' | 'optimize' | 'protect' | null>(null)
  const [selectedInsightDateRange, setSelectedInsightDateRange] = useState<string>('30_days')
  const [pendingPlatforms, setPendingPlatforms] = useState<string[]>([]) // Store selected platforms for insights

  // Preload critical images - simplified single strategy (link preload)
  // Browser handles caching automatically - no need for manual cache objects
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

  // Handle authentication state changes - but only after video intro
  useEffect(() => {
    console.log('[APP EFFECT] Running with:', {
      isLoading,
      appState,
      isAuthenticated,
      isMetaAuthenticated,
      isAnyAuthenticated,
      hasSelectedAccount: !!selectedAccount,
      hasSeenIntro
    })
    if (isLoading) return // Wait for session to initialize

    // Don't redirect if user is viewing an invite page
    if (appState === 'invite') {
      console.log('[APP EFFECT] On invite page, skipping redirects')
      return
    }

    // Check for pending invite after login
    // If user logged in and has a pending invite, redirect to invite page
    if (isAnyAuthenticated) {
      const pendingInvite = localStorage.getItem('mia_pending_invite')
      if (pendingInvite) {
        console.log('[APP EFFECT] Found pending invite after login:', pendingInvite)
        localStorage.removeItem('mia_pending_invite')
        setInviteId(pendingInvite)
        setAppState('invite')
        return
      }
    }

    // ✅ FIX: Allow returning users to skip intro video
    if (appState === 'video-intro') {
      // Priority 1: User has seen intro before + has valid session → Skip to main
      if (hasSeenIntro && isAnyAuthenticated && selectedAccount) {
        console.log('[APP] !!! REDIRECTING TO MAIN from video-intro - returning user with session')
        setAppState('main')
        return
      }

      // Priority 2: User has seen intro before + authenticated but no account → Skip to account selection
      if (hasSeenIntro && isAnyAuthenticated && !selectedAccount) {
        console.log('[APP] Returning user authenticated - skipping intro to account selection')
        setAppState('account-selection')
        return
      }

      // Priority 3: User has seen intro before + logged out → Stay on video-intro (shows login modal)
      if (hasSeenIntro && !isAnyAuthenticated) {
        console.log('[APP] Returning user logged out - staying on video intro (login modal visible)')
        // Stay on video-intro state - VideoIntroView will show login modal automatically
        return
      }

      // Priority 4: First time user → Watch video
      console.log('[APP] First time user - showing intro video')
      return
    }

    // If user is logged out, always reset to video-intro regardless of current state
    if (!isAnyAuthenticated && !selectedAccount) {
      if (appState !== 'video-intro') {
        console.log('[APP] User logged out - resetting to video intro')
        setAppState('video-intro')
      }
      return
    }

    // Don't auto-redirect if user is in onboarding chat - let the chat handle navigation
    if (appState === 'onboarding-chat') {
      console.log('[APP EFFECT] In onboarding-chat, returning early (no redirect)')
      return
    }

    // Check for account selection (works for both authenticated and bypass mode)
    if (selectedAccount && appState === 'account-selection') {
      // User has selected an account - check if workspace exists
      // New users need to create a workspace before proceeding to onboarding
      if (!activeWorkspace && availableWorkspaces.length === 0) {
        // No workspace exists - show create workspace modal
        console.log('[APP] No workspace found - showing create workspace modal')
        setShowCreateWorkspaceModal(true)
        // Don't advance to onboarding-chat yet - wait for workspace creation
      } else if (justAcceptedInvite) {
        // User just joined via invite - skip onboarding and go directly to main
        console.log('[APP] Invite accepted - skipping onboarding, going to main')
        setJustAcceptedInvite(false)
        setAppState('main')
      } else {
        // Workspace exists - proceed to onboarding (new user creating first workspace)
        console.log('[APP] Workspace exists - proceeding to onboarding-chat')
        setAppState('onboarding-chat')
      }
    } else if (isAnyAuthenticated && !selectedAccount && appState !== 'account-selection' && appState !== 'meta-account-selection') {
      // User is authenticated (Google OR Meta) but needs to select an account
      // Note: video-intro case already returned above, so no need to check
      // Note: Don't redirect if already on meta-account-selection (Meta-first flow)
      setAppState('account-selection')
    }
  }, [isAuthenticated, isMetaAuthenticated, selectedAccount, isLoading, appState, hasSeenIntro, activeWorkspace, availableWorkspaces])

  const handleAuthSuccess = () => {
    // This will be triggered by the FigmaLoginModal for Google auth
    // We need to manually transition since we disabled auto-transition on video-intro

    // Clear OAuth loading (CombinedAccountSelection has its own loading)
    setOauthLoadingPlatform(null)

    // Check if user already has a selected account (returning user via "Log in")
    if (selectedAccount) {
      // Returning user with saved account → go directly to main page
      setAppState('main')
    } else {
      // New user → go to account selection
      setAppState('account-selection')
    }
  }

  const handleMetaAuthSuccess = () => {
    // This will be triggered by the FigmaLoginModal for Meta auth (Meta-first flow)
    // Go to Meta account selection page
    console.log('[APP] Meta auth success, going to Meta account selection')

    // Clear OAuth loading
    setOauthLoadingPlatform(null)

    setAppState('meta-account-selection')
  }

  const { logout, loginMeta, refreshAccounts, refreshWorkspaces, switchWorkspace } = useSession()

  const handleInsightsDateGenerate = (dateRange: string) => {
    setSelectedInsightDateRange(dateRange)
    setShowInsightsDatePicker(false)

    // Navigate to the appropriate insights page
    if (pendingInsightType === 'grow') {
      setAppState('grow-quick')
    } else if (pendingInsightType === 'optimize') {
      setAppState('optimize-quick')
    } else if (pendingInsightType === 'protect') {
      setAppState('protect-quick')
    }

    setPendingInsightType(null)
  }

  // Show OAuth loading screen (triggered when popup closes)
  // This is rendered above everything to prevent video flash during transition
  if (oauthLoadingPlatform) {
    return <LoadingScreen platform={oauthLoadingPlatform} />
  }

  // Show loading screen when session is loading
  // Exception: video-intro doesn't need loading screen (user hasn't logged in yet)
  // Exception: account-selection pages have their own loading
  // Exception: onboarding-chat handles its own loading states (don't unmount it during refresh)
  if (isLoading && appState !== 'video-intro' && appState !== 'account-selection' && appState !== 'meta-account-selection' && appState !== 'onboarding-chat') {
    // Determine which platform we're loading for based on auth state
    const loadingPlatform = isMetaFirstFlow ? 'meta' : isAuthenticated ? 'google' : null
    return <LoadingScreen platform={loadingPlatform} />
  }

  // If we're in onboarding-chat but session data isn't ready, show loading
  if (appState === 'onboarding-chat' && (!isAnyAuthenticated || !selectedAccount)) {
    const loadingPlatform = isMetaFirstFlow ? 'meta' : 'google'
    return <LoadingScreen platform={loadingPlatform} />
  }

  return (
    <div className="w-full h-full relative">
      {/* Content */}
      <div className="w-full h-full">
        <Suspense fallback={<LazyLoadSpinner />}>
        <AnimatePresence mode="wait">
          {appState === 'video-intro' && (
            <motion.div
              key="video-intro"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <VideoIntroView
                onAuthSuccess={handleAuthSuccess}
                onMetaAuthSuccess={handleMetaAuthSuccess}
                hasSeenIntro={hasSeenIntro}
                onOAuthPopupClosed={setOauthLoadingPlatform}
              />
            </motion.div>
          )}

          {appState === 'account-selection' && (
            <motion.div
              key="account-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <CombinedAccountSelection
                onAccountSelected={() => {}}
                onBack={() => logout()}
              />
            </motion.div>
          )}

          {appState === 'meta-account-selection' && isMetaAuthenticated && (
            <motion.div
              key="meta-account-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <MetaAccountSelectionPage
                onAccountSelected={() => {
                  // After Meta account selection, go to onboarding chat
                  setAppState('onboarding-chat')
                }}
                onBack={() => logout()}
              />
            </motion.div>
          )}

          {appState === 'onboarding-chat' && isAnyAuthenticated && selectedAccount && (
            <motion.div
              key="onboarding-chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <OnboardingChat
                onComplete={() => setAppState('main')}
                onSkip={() => setAppState('main')}
                onConnectPlatform={async (platformId) => {
                  // Open OAuth popup inline - stay in onboarding
                  if (platformId === 'meta_ads' || platformId === 'meta' || platformId === 'facebook_organic') {
                    console.log('[ONBOARDING] Opening Meta OAuth popup...')
                    const success = await loginMeta()
                    if (success) {
                      console.log('[ONBOARDING] Meta connected successfully')
                      // Refresh accounts to get updated platform connections
                      await refreshAccounts()
                    }
                  } else {
                    // For other platforms, go to integrations (or implement their OAuth)
                    localStorage.setItem('pending_platform_connect', platformId)
                    setAppState('integrations')
                  }
                }}
              />
            </motion.div>
          )}

          {appState === 'main' && selectedAccount && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full h-full"
            >
              <MainViewCopy
                onLogout={async () => {
                  await logout()
                  // Reset app state to video intro after logout
                  setAppState('video-intro')
                }}
                onIntegrationsClick={() => setAppState('integrations')}
                onWorkspaceSettingsClick={() => setAppState('workspace-settings')}
                onSummaryQuickClick={(platforms) => {
                  setPendingPlatforms(platforms || [])
                  setAppState('summary-quick')
                }}
                onGrowQuickClick={(platforms) => {
                  setPendingPlatforms(platforms || [])
                  setPendingInsightType('grow')
                  setShowInsightsDatePicker(true)
                }}
                onOptimizeQuickClick={(platforms) => {
                  setPendingPlatforms(platforms || [])
                  setPendingInsightType('optimize')
                  setShowInsightsDatePicker(true)
                }}
                onProtectQuickClick={(platforms) => {
                  setPendingPlatforms(platforms || [])
                  setPendingInsightType('protect')
                  setShowInsightsDatePicker(true)
                }}
              />
            </motion.div>
          )}
          
          {appState === 'integrations' && isAnyAuthenticated && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <IntegrationsPage
                onBack={() => setAppState('main')}
              />
            </motion.div>
          )}

          {appState === 'grow-quick' && isAnyAuthenticated && (
            <motion.div
              key="grow-quick"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <GrowInsightsStreaming
                onBack={() => setAppState('main')}
                initialDateRange={selectedInsightDateRange}
                platforms={pendingPlatforms}
              />
            </motion.div>
          )}

          {appState === 'optimize-quick' && isAnyAuthenticated && (
            <motion.div
              key="optimize-quick"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <OptimizeInsightsStreaming
                onBack={() => setAppState('main')}
                initialDateRange={selectedInsightDateRange}
                platforms={pendingPlatforms}
              />
            </motion.div>
          )}

          {appState === 'protect-quick' && isAnyAuthenticated && (
            <motion.div
              key="protect-quick"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <ProtectInsightsStreaming
                onBack={() => setAppState('main')}
                initialDateRange={selectedInsightDateRange}
                platforms={pendingPlatforms}
              />
            </motion.div>
          )}

          {appState === 'summary-quick' && isAnyAuthenticated && (
            <motion.div
              key="summary-quick"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <SummaryInsights
                onBack={() => setAppState('main')}
              />
            </motion.div>
          )}

          {appState === 'invite' && inviteId && (
            <motion.div
              key="invite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <InviteLandingPage
                inviteId={inviteId}
                onAccepted={async (tenantId) => {
                  console.log('[APP] Invite accepted, joining workspace:', tenantId)
                  // Clear invite URL from browser
                  window.history.replaceState({}, '', '/')
                  setInviteId(null)
                  // Mark that user just accepted an invite (to skip onboarding)
                  setJustAcceptedInvite(true)
                  // Refresh workspaces to include the new one
                  await refreshWorkspaces()
                  // Switch to the new workspace
                  await switchWorkspace(tenantId)
                  // Go to main page (or account selection if not logged in)
                  if (isAnyAuthenticated && selectedAccount) {
                    setAppState('main')
                  } else if (isAnyAuthenticated) {
                    setAppState('account-selection')
                  } else {
                    setAppState('video-intro')
                  }
                }}
                onBack={() => {
                  // Clear invite URL and go to home
                  window.history.replaceState({}, '', '/')
                  setInviteId(null)
                  setAppState('video-intro')
                }}
              />
            </motion.div>
          )}

          {appState === 'workspace-settings' && isAnyAuthenticated && activeWorkspace && (
            <motion.div
              key="workspace-settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <WorkspaceSettingsPage
                onBack={() => setAppState('main')}
              />
            </motion.div>
          )}

        </AnimatePresence>
        </Suspense>
      </div>

      {/* Insights Date Picker Modal */}
      <Suspense fallback={null}>
      <InsightsDatePickerModal
        isOpen={showInsightsDatePicker}
        onClose={() => {
          setShowInsightsDatePicker(false)
          setPendingInsightType(null)
        }}
        onGenerate={handleInsightsDateGenerate}
        insightType={pendingInsightType || 'grow'}
      />
      </Suspense>

      {/* Create Workspace Modal - shown after account selection for new users */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspaceModal}
        required={true}
        onClose={() => {
          // For first-time users, don't allow closing without creating
          // They must create a workspace to proceed
          console.log('[APP] Create workspace modal close attempted - workspace required')
        }}
        onSuccess={(tenantId) => {
          console.log('[APP] Workspace created:', tenantId)
          setShowCreateWorkspaceModal(false)
          // Now proceed to onboarding
          setAppState('onboarding-chat')
        }}
      />
    </div>
  )
}

export default App