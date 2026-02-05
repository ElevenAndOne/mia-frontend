/**
 * Meta OAuth API service
 */
import { apiFetch } from '../../../utils/api'

/**
 * Meta OAuth auth URL response from /api/oauth/meta/auth-url
 * Based on API documentation
 */
export interface MetaAuthUrlResponse {
  auth_url: string
  /** State token for CSRF protection */
  state?: string
}

/**
 * Meta OAuth status response from /api/oauth/meta/status
 * Based on API documentation
 */
export interface MetaAuthStatusResponse {
  authenticated: boolean
  user_id?: string
  name?: string
  /** Whether user has Meta Ads access */
  has_meta_ads?: boolean
  user_info?: {
    id: string
    name: string
    email?: string
    has_seen_intro?: boolean
  }
}

/**
 * Meta OAuth complete response from /api/oauth/meta/complete
 */
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
export const getMetaAuthUrl = async (sessionId: string, frontendOrigin?: string, tenantId?: string): Promise<MetaAuthUrlResponse> => {
  const params = new URLSearchParams()
  if (frontendOrigin) {
    params.set('frontend_origin', frontendOrigin)
  }
  if (tenantId) {
    params.set('tenant_id', tenantId)
  }
  const queryString = params.toString()
  const url = `/api/oauth/meta/auth-url${queryString ? `?${queryString}` : ''}`

  const response = await apiFetch(url, {
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
