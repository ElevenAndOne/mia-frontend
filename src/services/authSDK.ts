/**
 * Auth Service (SDK-based)
 * Maintains backward compatibility while using the new SDK
 */

import { getGlobalSDK } from '../sdk'
import { GoogleAdsAccount, GA4Account, CombinedAccount } from './accountService'

// Enhanced authentication service for MIA
export interface AuthUser {
  email: string
  isAuthenticated: boolean
  needsSetup?: boolean
}

export interface UserSession {
  user: AuthUser
  selectedAccount?: GoogleAdsAccount | GA4Account | CombinedAccount
  hasCompletedSetup: boolean
}

class AuthServiceSDK {
  private session: UserSession | null = null
  private sdk = getGlobalSDK()

  async login(): Promise<AuthUser | null> {
    try {
      // Use SDK for popup-based login
      const result = await this.sdk.auth.loginWithPopup()
      
      if (result.success) {
        // Check status to get user info
        const status = await this.sdk.auth.checkStatus()
        if (status.success && status.data?.authenticated && status.data.user_info) {
          return {
            email: status.data.user_info.email,
            isAuthenticated: true,
            needsSetup: !this.hasCompletedSetup()
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Login error:', error)
      return null
    }
  }

  async logout(): Promise<void> {
    try {
      await this.sdk.auth.logout()
      
      // Clear local session
      this.session = null
      localStorage.removeItem('mia_session')
    } catch (error) {
      console.error('Logout error:', error)
      // Always clear local session even on error
      this.session = null
      localStorage.removeItem('mia_session')
    }
  }

  async forceLogoutAndClearTokens(): Promise<void> {
    try {
      // Clear all local storage items related to auth
      localStorage.removeItem('mia_session')
      localStorage.removeItem('mia_oauth_pending')
      localStorage.removeItem('mia_return_url')
      
      // Clear session
      this.session = null
      
      // Use SDK force logout
      await this.sdk.auth.forceLogout()
    } catch (error) {
      console.error('Force logout error:', error)
      // Still clear local data on error
      localStorage.clear()
      this.session = null
    }
  }

  async checkAuthStatus(): Promise<AuthUser | null> {
    try {
      const result = await this.sdk.auth.checkStatus()
      
      if (!result.success || !result.data) {
        return null
      }
      
      if (result.data.authenticated && result.data.user_info) {
        const user: AuthUser = {
          email: result.data.user_info.email,
          isAuthenticated: true,
          needsSetup: !this.hasCompletedSetup()
        }
        
        return user
      }
      
      return null
    } catch (error) {
      console.error('Auth status check error:', error)
      return null
    }
  }

  // Session management
  saveSession(session: UserSession): void {
    this.session = session
    localStorage.setItem('mia_session', JSON.stringify({
      selectedAccount: session.selectedAccount,
      hasCompletedSetup: session.hasCompletedSetup,
      userEmail: session.user.email
    }))
  }

  getSession(): UserSession | null {
    if (this.session) return this.session
    
    // Try to restore from localStorage
    const stored = localStorage.getItem('mia_session')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        return {
          user: { 
            email: data.userEmail, 
            isAuthenticated: true,
            needsSetup: !data.hasCompletedSetup 
          },
          selectedAccount: data.selectedAccount,
          hasCompletedSetup: data.hasCompletedSetup
        }
      } catch {
        localStorage.removeItem('mia_session')
      }
    }
    
    return null
  }

  hasCompletedSetup(): boolean {
    const session = this.getSession()
    return session?.hasCompletedSetup || false
  }

  completeSetup(account: GoogleAdsAccount | GA4Account | CombinedAccount, user: AuthUser): void {
    const session: UserSession = {
      user,
      selectedAccount: account,
      hasCompletedSetup: true
    }
    this.saveSession(session)
  }

  updateSelectedAccount(account: GoogleAdsAccount | GA4Account | CombinedAccount): void {
    if (this.session) {
      this.session.selectedAccount = account
      this.saveSession(this.session)
    }
  }
}

export const authService = new AuthServiceSDK()
export default authService
