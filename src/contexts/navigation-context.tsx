import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from './session-context'

interface NavigateHomeOptions {
  newChat?: boolean
}

interface NavigateInsightOptions {
  platforms?: string[]
  showDatePicker?: boolean
}

export interface NavigationContextType {
  navigateHome: (options?: NavigateHomeOptions) => void
  navigateIntegrations: () => void
  navigateHelp: () => void
  navigateWorkspaceSettings: () => void
  navigateInsight: (
    type: 'grow' | 'optimize' | 'protect' | 'summary',
    options?: NavigateInsightOptions
  ) => void
  navigateBack: () => void
  handleLogout: () => Promise<void>
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

interface NavigationProviderProps {
  children: ReactNode
}

export const NavigationProvider = ({ children }: NavigationProviderProps) => {
  const navigate = useNavigate()
  const { logout } = useSession()

  const navigateHome = useCallback((options?: NavigateHomeOptions) => {
    if (options?.newChat) {
      navigate('/home', { state: { newChat: true } })
    } else {
      navigate('/home')
    }
  }, [navigate])

  const navigateIntegrations = useCallback(() => {
    navigate('/integrations')
  }, [navigate])

  const navigateHelp = useCallback(() => {
    navigate('/help')
  }, [navigate])

  const navigateWorkspaceSettings = useCallback(() => {
    navigate('/settings/workspace')
  }, [navigate])

  const navigateInsight = useCallback((
    type: 'grow' | 'optimize' | 'protect' | 'summary',
    options?: NavigateInsightOptions
  ) => {
    const params = new URLSearchParams()
    if (options?.platforms?.length) {
      params.set('platforms', options.platforms.join(','))
    }

    const queryString = params.toString()
    const path = `/insights/${type}${queryString ? `?${queryString}` : ''}`

    navigate(path, {
      state: options?.showDatePicker ? { showDatePicker: true } : undefined
    })
  }, [navigate])

  const navigateBack = useCallback(() => {
    navigate('/home')
  }, [navigate])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/')
  }, [logout, navigate])

  const contextValue: NavigationContextType = {
    navigateHome,
    navigateIntegrations,
    navigateHelp,
    navigateWorkspaceSettings,
    navigateInsight,
    navigateBack,
    handleLogout
  }

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  )
}
