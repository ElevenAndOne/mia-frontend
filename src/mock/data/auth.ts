/**
 * Mock Authentication Data
 * Generates fake auth tokens and session data
 */

import { GoogleUserInfo, MetaUserInfo, AuthUrlResponse } from '../../sdk/types'
import { mockUsers, getMockUser } from './users'
import { mockAccounts, getMockAccountsForUser } from './accounts'

export interface MockAuthSession {
  session_id: string
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: number
  created_at: number
}

export interface MockOAuthResponse {
  success: boolean
  session_id: string
  access_token: string
  refresh_token: string
  user_info: GoogleUserInfo | MetaUserInfo
  message?: string
}

export const mockAuthUrls = {
  google: 'http://localhost:3001/mock/auth/google/callback?code=mock_google_code&state=mock_state',
  meta: 'http://localhost:3001/mock/auth/meta/callback?code=mock_meta_code&state=mock_state'
}

export const generateMockSession = (userId: string): MockAuthSession => {
  const now = Date.now()
  return {
    session_id: `session_${Math.random().toString(36).substr(2, 12)}`,
    user_id: userId,
    access_token: `mock_access_${Math.random().toString(36).substr(2, 20)}`,
    refresh_token: `mock_refresh_${Math.random().toString(36).substr(2, 20)}`,
    expires_at: now + (24 * 60 * 60 * 1000), // 24 hours
    created_at: now
  }
}

export const getMockGoogleAuthUrl = (): AuthUrlResponse => ({
  auth_url: mockAuthUrls.google
})

export const getMockMetaAuthUrl = (): AuthUrlResponse => ({
  auth_url: mockAuthUrls.meta
})

export const processMockGoogleAuth = (code: string): MockOAuthResponse => {
  const user = getMockUser()
  const session = generateMockSession(user.google_user_id)
  
  return {
    success: true,
    session_id: session.session_id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user_info: {
      id: user.google_user_id,
      email: user.email,
      name: user.name,
      picture: user.picture_url
    }
  }
}

export const processMockMetaAuth = (code: string): MockOAuthResponse => {
  const user = getMockUser()
  const session = generateMockSession(user.meta_user_id || 'meta_default')
  
  return {
    success: true,
    session_id: session.session_id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user_info: {
      id: user.meta_user_id || 'meta_default',
      name: user.name,
      email: user.email
    }
  }
}

export const getMockAuthStatus = (sessionId?: string) => {
  if (!sessionId) {
    return {
      authenticated: false,
      success: true,
      message: 'No active session'
    }
  }
  
  const user = getMockUser()
  const accounts = getMockAccountsForUser(user.google_user_id)
  
  return {
    authenticated: true,
    success: true,
    user_info: {
      id: user.google_user_id,
      email: user.email,
      name: user.name,
      picture: user.picture_url
    },
    selected_account: accounts[0] || null,
    available_accounts: accounts,
    needs_setup: accounts.length === 0
  }
}

export const getMockMetaAuthStatus = (sessionId?: string) => {
  if (!sessionId) {
    return {
      authenticated: false,
      success: true,
      message: 'No Meta session'
    }
  }
  
  const user = getMockUser()
  
  return {
    authenticated: true,
    success: true,
    user_info: {
      id: user.meta_user_id || 'meta_default',
      name: user.name,
      email: user.email
    }
  }
}

export const mockSessionStore = new Map<string, MockAuthSession>()
