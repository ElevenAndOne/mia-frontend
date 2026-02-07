import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSession } from './contexts/session-context'
import { AppRoutes } from './routes'
import { useAppShellEffects } from './hooks/use-app-shell-effects'
import { useSessionRouting } from './hooks/use-session-routing'

// Critical path components
import LoadingScreen from './components/loading-screen'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isAuthenticated,
    isMetaAuthenticated,
    nextAction,
    requiresAccountSelection,
    inviteContext,
    selectedAccount,
    isLoading,
    hasSeenIntro,
    switchWorkspace,
    connectingPlatform
  } = useSession()

  // OAuth loading state
  const [oauthLoadingPlatform, setOauthLoadingPlatform] = useState<'google' | 'meta' | null>(null)

  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated
  const isMetaFirstFlow = isMetaAuthenticated && !isAuthenticated

  useAppShellEffects({ pathname: location.pathname })
  useSessionRouting({
    navigate,
    pathname: location.pathname,
    isAnyAuthenticated,
    nextAction,
    requiresAccountSelection,
    inviteContext,
    isLoading
  })

  const handleAuthSuccess = () => {
    // Navigate FIRST, then clear loading platform
    // This prevents the video from flashing during the brief moment between clearing loading and navigation
    navigate(selectedAccount ? '/home' : '/onboarding')
    // Clear loading platform after navigation is initiated
    setOauthLoadingPlatform(null)
  }

  const handleMetaAuthSuccess = () => {
    // Navigate FIRST, then clear loading platform
    navigate('/onboarding')
    setOauthLoadingPlatform(null)
  }

  const handleAccountSelected = () => {
    if (nextAction === 'ONBOARDING') {
      navigate('/onboarding')
    } else {
      navigate('/home')
    }
  }

  const handleOnboardingComplete = () => {
    navigate('/home')
  }

  const handleInviteAccepted = async (tenantId: string, skipAccountSelection?: boolean) => {
    window.history.replaceState({}, '', '/')
    await switchWorkspace(tenantId)

    if (skipAccountSelection && isAnyAuthenticated) {
      navigate('/home')
    } else if (isAnyAuthenticated && selectedAccount) {
      navigate('/home')
    } else if (isAnyAuthenticated) {
      navigate('/accounts')
    } else {
      navigate('/')
    }
  }

  // Show OAuth loading screen
  if (oauthLoadingPlatform) {
    return <LoadingScreen platform={oauthLoadingPlatform} />
  }

  // Don't show loading screen if we're connecting a second platform during onboarding
  // This prevents OnboardingChat from unmounting when adding Meta as second platform
  const isConnectingSecondPlatform = connectingPlatform && isAnyAuthenticated && selectedAccount

  // Show loading when OAuth is in progress (connectingPlatform set) on the intro page
  // This prevents the video from flashing while we're completing auth and navigating away
  if (location.pathname === '/' && connectingPlatform) {
    return <LoadingScreen platform={connectingPlatform} />
  }

  // Show loading on intro page when authenticated but haven't navigated yet
  // This handles the brief moment between auth completion and navigation
  if (location.pathname === '/' && isAnyAuthenticated && isLoading) {
    const loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : 'google')
    return <LoadingScreen platform={loadingPlatform} />
  }

  // Show loading for protected routes (but not when connecting second platform)
  if (isLoading && !isConnectingSecondPlatform && location.pathname !== '/' && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/accounts') && location.pathname !== '/onboarding') {
    // Use connectingPlatform if set (explicit), otherwise infer from auth state
    const loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : isAuthenticated ? 'google' : null)
    return <LoadingScreen platform={loadingPlatform} />
  }

  // Show loading for onboarding if session not ready (but not when connecting second platform)
  if (location.pathname === '/onboarding' && !isAnyAuthenticated && !isConnectingSecondPlatform) {
    const loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : 'google')
    return <LoadingScreen platform={loadingPlatform} />
  }

  return (
    <div className="w-screen h-dvh">
      <div className="w-full h-full">
        <AppRoutes
          onAuthSuccess={handleAuthSuccess}
          onMetaAuthSuccess={handleMetaAuthSuccess}
          hasSeenIntro={hasSeenIntro}
          onOAuthPopupClosed={setOauthLoadingPlatform}
          onOnboardingComplete={handleOnboardingComplete}
          onInviteAccepted={handleInviteAccepted}
          onAccountSelected={handleAccountSelected}
        />
      </div>
    </div>
  )
}

export default App
