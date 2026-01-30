/**
 * Meta OAuth API service
 */
import { apiFetch } from '../../../utils/api'

export interface MetaAuthUrlResponse {
  auth_url: string
}

export interface MetaAuthStatusResponse {
  authenticated: boolean
  user_info?: {
    id: string
    name: string
    email?: string
    has_seen_intro?: boolean
  }
}

export interface MetaCompleteResponse {
  success: boolean
  user?: {
    id: string
    name: string
    email?: string
  }
}

/**
 * Get Meta OAuth authorization URL
 */
export const getMetaAuthUrl = async (sessionId: string): Promise<MetaAuthUrlResponse> => {
  const response = await apiFetch('/api/oauth/meta/auth-url', {
    headers: {
      'X-Session-ID': sessionId
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get Meta auth URL')
  }

  return response.json()
}

/**
 * Complete Meta OAuth flow (creates database session)
 */
export const completeMetaAuth = async (sessionId: string): Promise<MetaCompleteResponse> => {
  const response = await apiFetch('/api/oauth/meta/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId
    }
  })

  if (!response.ok) {
    throw new Error('Failed to complete Meta authentication')
  }

  return response.json()
}

/**
 * Check Meta OAuth authentication status
 */
export const getMetaAuthStatus = async (sessionId: string): Promise<MetaAuthStatusResponse> => {
  const response = await apiFetch('/api/oauth/meta/status', {
    headers: {
      'X-Session-ID': sessionId
    }
  })

  if (!response.ok) {
    throw new Error('Failed to verify Meta authentication')
  }

  return response.json()
}

/**
 * Logout from Meta OAuth
 */
export const logoutMeta = async (sessionId: string): Promise<void> => {
  await apiFetch('/api/oauth/meta/logout', {
    method: 'POST',
    headers: {
      'X-Session-ID': sessionId
    }
  })
}

/**
 * Open Meta OAuth popup
 */
export const openMetaOAuthPopup = (authUrl: string): Window | null => {
  return window.open(
    authUrl,
    'meta-oauth',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  )
}
