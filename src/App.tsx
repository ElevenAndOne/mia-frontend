import { useState, useEffect, lazy, Suspense } from 'react'
// Note: react-router-dom may be needed for future routing features
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from './contexts/SessionContext'

// Critical path components - load immediately
import VideoIntroView from './components/VideoIntroView'
import AccountSelectionPage from './components/AccountSelectionPage'

// Lazy load all other pages - only downloaded when needed
const MainViewCopy = lazy(() => import('./components/MainViewCopy'))
const IntegrationsPage = lazy(() => import('./components/IntegrationsPage'))
const GrowInsightsStreaming = lazy(() => import('./components/GrowInsightsStreaming'))
const OptimizeInsightsStreaming = lazy(() => import('./components/OptimizeInsightsStreaming'))
const ProtectInsightsStreaming = lazy(() => import('./components/ProtectInsightsStreaming'))
const SummaryInsights = lazy(() => import('./components/SummaryInsights'))
const InsightsDatePickerModal = lazy(() => import('./components/InsightsDatePickerModal'))

// Loading spinner for lazy-loaded components
const LazyLoadSpinner = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
  </div>
)

type AppState = 'video-intro' | 'account-selection' | 'main' | 'integrations' | 'grow-quick' | 'optimize-quick' | 'protect-quick' | 'summary-quick'

function App() {
  const { isAuthenticated, isMetaAuthenticated, selectedAccount, isLoading, sessionId, hasSeenIntro } = useSession()

  // Persist appState to localStorage so page refresh keeps you on the same page
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('mia_app_state')
    // Only restore valid states (not video-intro or account-selection which need fresh auth check)
    if (saved && ['main', 'integrations', 'grow-quick', 'optimize-quick', 'protect-quick', 'summary-quick'].includes(saved)) {
      return saved as AppState
    }
    return 'video-intro'
  })

  // Save appState to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('mia_app_state', appState)
  }, [appState])

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
    if (isLoading) return // Wait for session to initialize

    // ✅ FIX: Allow returning users to skip intro video
    if (appState === 'video-intro') {
      // Priority 1: User has seen intro before + has valid session → Skip to main
      if (hasSeenIntro && isAnyAuthenticated && selectedAccount) {
        console.log('[APP] Returning user with session - skipping intro video to main')
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

    // Check for account selection (works for both authenticated and bypass mode)
    if (selectedAccount && appState === 'account-selection') {
      // User has selected an account - navigate to integrations page
      setAppState('integrations')
    } else if (isAnyAuthenticated && !selectedAccount && appState !== 'video-intro' && appState !== 'account-selection') {
      // User is authenticated (Google OR Meta) but needs to select an account
      setAppState('account-selection')
    } else if (!isAnyAuthenticated && !selectedAccount && appState !== 'video-intro') {
      // User logged out - reset to video intro
      setAppState('video-intro')
    }
  }, [isAuthenticated, isMetaAuthenticated, selectedAccount, isLoading, appState, hasSeenIntro])

  const handleAuthSuccess = () => {
    // This will be triggered by the FigmaLoginModal
    // We need to manually transition since we disabled auto-transition on video-intro

    // Check if user already has a selected account (returning user via "Log in")
    if (selectedAccount) {
      // Returning user with saved account → go directly to main page
      setAppState('main')
    } else {
      // New user → go to account selection
      setAppState('account-selection')
    }
  }

  const { logout } = useSession()

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

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Fetching accounts...</p>
        </div>
      </div>
    )
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
              <VideoIntroView onAuthSuccess={handleAuthSuccess} hasSeenIntro={hasSeenIntro} />
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
              <AccountSelectionPage
                onAccountSelected={() => {}}
                onBack={() => logout()}
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
    </div>
  )
}

export default App