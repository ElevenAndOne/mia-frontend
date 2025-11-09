import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VideoIntroView from './components/VideoIntroView'
import AccountSelectionPage from './components/AccountSelectionPage'
import MainViewCopy from './components/MainViewCopy' // The main app after auth
import GrowthPage from './components/GrowthPage' // Blue growth page
import OptimizePage from './components/OptimizePage' // Optimize improvement page
import ProtectPage from './components/ProtectPage' // Protect/fixing page
import CreativePageFixed from './components/CreativePageFixed' // NEW: Creative-only analysis
import IntegrationsPage from './components/IntegrationsPage'
import GrowInsights from './components/GrowInsights' // BETA: Quick Insights - Grow
import OptimizeInsights from './components/OptimizeInsights' // BETA: Quick Insights - Optimize
import ProtectInsights from './components/ProtectInsights' // BETA: Quick Insights - Protect
import SummaryInsights from './components/SummaryInsights' // BETA: Quick Insights - Summary
import InsightsDatePickerModal from './components/InsightsDatePickerModal' // Date picker modal
import { useSession } from './contexts/SessionContext'

type AppState = 'video-intro' | 'account-selection' | 'main' | 'growth' | 'improve' | 'fix' | 'creative' | 'integrations' | 'grow-quick' | 'optimize-quick' | 'protect-quick' | 'summary-quick'

function App() {
  const { isAuthenticated, isMetaAuthenticated, selectedAccount, isLoading, sessionId } = useSession()
  const [appState, setAppState] = useState<AppState>('video-intro')

  // Support both Google and Meta authentication
  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated

  const [preloadedData, setPreloadedData] = useState<any>(null) // Store pre-fetched data

  // Date picker modal state
  const [showInsightsDatePicker, setShowInsightsDatePicker] = useState(false)
  const [pendingInsightType, setPendingInsightType] = useState<'grow' | 'optimize' | 'protect' | null>(null)
  const [selectedInsightDateRange, setSelectedInsightDateRange] = useState<string>('30_days')

  // Preload critical images - mobile-optimized approach
  useEffect(() => {
    const criticalImages = [
      '/icons/Vector.png',
      '/icons/Mia.png',
      '/images/Grow Nav.png',
      '/images/Optimise Nav.png', 
      '/images/Protect Nav.png'
    ]
    
    // Multiple preloading strategies for mobile compatibility
    criticalImages.forEach(src => {
      // Strategy 1: Link preload
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
      
      // Strategy 2: Image object with cache control
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = src
      
      // Strategy 3: Force immediate load
      img.onload = () => {
        // Store in a global cache object
        if (!(window as any).imageCache) (window as any).imageCache = {}
        ;(window as any).imageCache[src] = img
      }
    })
  }, [])

  // Handle authentication state changes - but only after video intro
  useEffect(() => {
    if (isLoading) return // Wait for session to initialize

    // Only auto-transition if we're not on video-intro
    // This prevents skipping the video on initial load
    if (appState === 'video-intro') return

    // Check for account selection (works for both authenticated and bypass mode)
    if (selectedAccount && appState === 'account-selection') {
      // User has selected an account - navigate to integrations page
      // Don't interfere with manual navigation from other states
      setAppState('integrations')
    } else if (isAnyAuthenticated && !selectedAccount && appState !== 'creative' && appState !== 'growth' && appState !== 'improve' && appState !== 'fix') {
      // User is authenticated (Google OR Meta) but needs to select an account
      setAppState('account-selection')
    } else if (!isAnyAuthenticated && !selectedAccount && appState !== 'video-intro') {
      // User logged out - reset to video intro
      setAppState('video-intro')
    }
  }, [isAuthenticated, isMetaAuthenticated, selectedAccount, isLoading, appState])

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

  const handleQuestionClick = (questionType: 'growth' | 'improve' | 'fix', data?: any) => {
    setPreloadedData(data) // Store the pre-fetched data
    if (questionType === 'growth') {
      setAppState('growth')
    } else if (questionType === 'improve') {
      setAppState('improve')
    } else if (questionType === 'fix') {
      setAppState('fix')
    }
  }

  const handleCreativeClick = () => {
    setAppState('creative')
  }

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
        <AnimatePresence mode="wait">
          {appState === 'video-intro' && (
            <motion.div
              key="video-intro"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <VideoIntroView onAuthSuccess={handleAuthSuccess} />
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
                onQuestionClick={handleQuestionClick}
                onCreativeClick={handleCreativeClick}
                onIntegrationsClick={() => setAppState('integrations')}
                onSummaryQuickClick={() => setAppState('summary-quick')}
                onGrowQuickClick={() => {
                  setPendingInsightType('grow')
                  setShowInsightsDatePicker(true)
                }}
                onOptimizeQuickClick={() => {
                  setPendingInsightType('optimize')
                  setShowInsightsDatePicker(true)
                }}
                onProtectQuickClick={() => {
                  setPendingInsightType('protect')
                  setShowInsightsDatePicker(true)
                }}
              />
            </motion.div>
          )}
          
          {appState === 'growth' && isAnyAuthenticated && (
            <motion.div
              key="growth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <GrowthPage 
                onBack={() => {
                  setAppState('main')
                  setPreloadedData(null) // Clear pre-loaded data when going back
                }} 
                data={preloadedData}
              />
            </motion.div>
          )}

          {appState === 'improve' && isAnyAuthenticated && (
            <motion.div
              key="improve"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <OptimizePage 
                onBack={() => {
                  setAppState('main')
                  setPreloadedData(null) // Clear pre-loaded data when going back
                }} 
                data={preloadedData}
              />
            </motion.div>
          )}

          {appState === 'fix' && isAnyAuthenticated && (
            <motion.div
              key="fix"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full"
            >
              <ProtectPage 
                onBack={() => {
                  setAppState('main')
                  setPreloadedData(null) // Clear pre-loaded data when going back
                }} 
                data={preloadedData}
              />
            </motion.div>
          )}

          {appState === 'creative' && isAnyAuthenticated && (
            <motion.div
              key="creative"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="w-full h-full"
              style={{ backgroundColor: '#290068' }}
            >
              <CreativePageFixed
                onBack={() => {
                  setAppState('main')
                  setPreloadedData(null) // Clear any preloaded data
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
              <GrowInsights
                onBack={() => setAppState('main')}
                initialDateRange={selectedInsightDateRange}
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
              <OptimizeInsights
                onBack={() => setAppState('main')}
                initialDateRange={selectedInsightDateRange}
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
              <ProtectInsights
                onBack={() => setAppState('main')}
                initialDateRange={selectedInsightDateRange}
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
      </div>

      {/* Insights Date Picker Modal */}
      <InsightsDatePickerModal
        isOpen={showInsightsDatePicker}
        onClose={() => {
          setShowInsightsDatePicker(false)
          setPendingInsightType(null)
        }}
        onGenerate={handleInsightsDateGenerate}
        insightType={pendingInsightType || 'grow'}
      />
    </div>
  )
}

export default App