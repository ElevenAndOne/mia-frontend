import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserProfile } from '../types'
import { authService } from '../services/auth-service'
import { storage } from '../utils/storage'

interface AuthContextValue {
  // State
  isAuthenticated: boolean
  isMetaAuthenticated: boolean
  user: UserProfile | null
  sessionId: string | null
  isLoading: boolean
  hasSeenIntro: boolean

  // Actions
  login: () => Promise<boolean>
  loginMeta: () => Promise<boolean>
  logout: () => Promise<void>
  checkExistingAuth: () => Promise<boolean>
  setHasSeenIntro: (seen: boolean) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isMetaAuthenticated, setIsMetaAuthenticated] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasSeenIntro, setHasSeenIntro] = useState(false)

  // Check existing session on mount
  useEffect(() => {
    checkExistingAuth()
  }, [])

  const checkExistingAuth = async (): Promise<boolean> => {
    setIsLoading(true)

    try {
      const session = await authService.checkExistingSession()

      if (session) {
        setSessionId(session.session_id)
        setUser(session.user)
        setIsAuthenticated(true)
        storage.setSessionId(session.session_id)
        return true
      }

      return false
    } catch (error) {
      console.error('Auth check failed:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (): Promise<boolean> => {
    return await authService.loginWithGoogle()
  }

  const loginMeta = async (): Promise<boolean> => {
    return await authService.loginWithMeta()
  }

  const logout = async (): Promise<void> => {
    await authService.logout()
    setIsAuthenticated(false)
    setIsMetaAuthenticated(false)
    setUser(null)
    setSessionId(null)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isMetaAuthenticated,
        user,
        sessionId,
        isLoading,
        hasSeenIntro,
        login,
        loginMeta,
        logout,
        checkExistingAuth,
        setHasSeenIntro
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
