import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSession } from './contexts/session-context'
import { AppRoutes } from './routes'

// Critical path components
import LoadingScreen from './components/loading-screen'
import CreateWorkspaceModal from './components/create-workspace-modal'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isAuthenticated,
    isMetaAuthenticated,
    selectedAccount,
    isLoading,
    hasSeenIntro,
    activeWorkspace,
    availableWorkspaces,
    user,
    loginMeta,
    refreshAccounts,
    refreshWorkspaces,
    switchWorkspace,
    connectingPlatform
  } = useSession()

  // OAuth loading state
  const [oauthLoadingPlatform, setOauthLoadingPlatform] = useState<'google' | 'meta' | null>(null)

  // Workspace creation modal
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)

  // Track if user just accepted an invite
  const [justAcceptedInvite, setJustAcceptedInvite] = useState(false)

  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated
  const isMetaFirstFlow = isMetaAuthenticated && !isAuthenticated

  // Handle full-bleed body class for video intro
  useEffect(() => {
    document.body.classList.toggle('full-bleed', location.pathname === '/')
    return () => {
      document.body.classList.remove('full-bleed')
    }
  }, [location.pathname])

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

  // Handle navigation based on auth state changes
  useEffect(() => {
    if (isLoading) return

    const path = location.pathname

    // Don't redirect if on invite page
    if (path.startsWith('/invite/')) return

    // Check for pending invite after login
    if (isAnyAuthenticated) {
      const pendingInvite = localStorage.getItem('mia_pending_invite')
      if (pendingInvite) {
        localStorage.removeItem('mia_pending_invite')
        navigate(`/invite/${pendingInvite}`)
        return
      }
    }

    // Handle returning users on home page
    if (path === '/') {
      if (hasSeenIntro && isAnyAuthenticated && selectedAccount) {
        navigate('/home')
        return
      }
      if (hasSeenIntro && isAnyAuthenticated && !selectedAccount) {
        navigate('/accounts')
        return
      }
    }

    // Redirect unauthenticated users to home (except public routes and login)
    if (!isAnyAuthenticated && !path.startsWith('/invite/') && path !== '/' && path !== '/login') {
      navigate('/')
      return
    }

    // Handle account selection completion - redirect away from accounts page if already selected
    if (path.startsWith('/accounts') && selectedAccount) {
      if (!activeWorkspace && availableWorkspaces.length === 0) {
        setShowCreateWorkspaceModal(true)
      } else if (justAcceptedInvite) {
        setJustAcceptedInvite(false)
        navigate('/home')
      } else if (user?.onboarding_completed) {
        navigate('/home')
      } else {
        navigate('/onboarding')
      }
    }
  }, [
    isAuthenticated,
    isMetaAuthenticated,
    selectedAccount,
    isLoading,
    location.pathname,
    hasSeenIntro,
    activeWorkspace,
    availableWorkspaces,
    isAnyAuthenticated,
    justAcceptedInvite,
    user?.onboarding_completed,
    navigate
  ])

  const handleAuthSuccess = () => {
    // Navigate FIRST, then clear loading platform
    // This prevents the video from flashing during the brief moment between clearing loading and navigation
    if (selectedAccount) {
      navigate('/home')
    } else {
      navigate('/accounts')
    }
    // Clear loading platform after navigation is initiated
    setOauthLoadingPlatform(null)
  }

  const handleMetaAuthSuccess = () => {
    // Navigate FIRST, then clear loading platform
    navigate('/accounts/meta')
    setOauthLoadingPlatform(null)
  }

  const handleAccountSelected = () => {
    // Account selection complete - navigate based on workspace/onboarding state
    if (!activeWorkspace && availableWorkspaces.length === 0) {
      setShowCreateWorkspaceModal(true)
    } else if (justAcceptedInvite) {
      setJustAcceptedInvite(false)
      navigate('/home')
    } else if (user?.onboarding_completed) {
      navigate('/home')
    } else {
      navigate('/onboarding')
    }
  }

  const handleOnboardingComplete = () => {
    navigate('/home')
  }

  const handleConnectPlatform = async (platformId: string) => {
    if (platformId === 'meta_ads' || platformId === 'meta' || platformId === 'facebook_organic') {
      const success = await loginMeta()
      if (success) {
        await refreshAccounts()
      }
    } else {
      localStorage.setItem('pending_platform_connect', platformId)
      navigate('/integrations')
    }
  }

  const handleInviteAccepted = async (tenantId: string, skipAccountSelection?: boolean) => {
    window.history.replaceState({}, '', '/')
    setJustAcceptedInvite(true)
    await refreshWorkspaces()
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
  if (location.pathname === '/onboarding' && (!isAnyAuthenticated || !selectedAccount) && !isConnectingSecondPlatform) {
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
          onConnectPlatform={handleConnectPlatform}
          onInviteAccepted={handleInviteAccepted}
          onAccountSelected={handleAccountSelected}
        />
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspaceModal}
        required={true}
        onClose={() => {
          console.log('[APP] Create workspace modal close attempted - workspace required')
        }}
        onSuccess={(tenantId) => {
          console.log('[APP] Workspace created:', tenantId)
          setShowCreateWorkspaceModal(false)
          navigate('/onboarding')
        }}
      />
    </div>
  )
}

export default App
