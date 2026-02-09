/**
 * Google OAuth API service
 */
import { apiFetch } from '../../../utils/api'

export interface GoogleAuthUrlResponse {
  auth_url: string
}

/**
 * Google OAuth status response from /api/oauth/google/status
 * Based on API documentation
 */
export interface GoogleAuthStatusResponse {
  authenticated: boolean
  needs_session_creation?: boolean
  user_id?: string
  email?: string
  name?: string
  picture_url?: string
  /** Whether user has Google Ads access */
  has_google_ads?: boolean
  /** Whether user has GA4 access */
  has_ga4?: boolean
  /** Detailed user info object (alternative format) */
  user_info?: {
    id: string
    name: string
    email: string
    picture: string
    has_seen_intro?: boolean
  }
  selected_account?: {
    id: string
    name: string
    google_ads_id?: string
    ga4_property_id?: string
    meta_ads_id?: string
    business_type?: string
    selected_mcc_id?: string
  }
  /** Legacy fields for backward compatibility */
  picture?: string
}

export interface GoogleCompleteResponse {
  success: boolean
  session_id?: string
  user?: {
    id: string
    name: string
    email: string
  }
}

/**
 * Get Google OAuth authorization URL
 *
 * Note: Flow type (popup vs redirect) is determined by the backend using User-Agent detection.
 * Mobile devices -> redirect flow, Desktop browsers -> popup flow.
 */
export const getGoogleAuthUrl = async (returnUrl?: string): Promise<GoogleAuthUrlResponse> => {
  // Pass full URL (with path) so backend redirects back to the exact page after OAuth
  // This ensures invite pages, onboarding, etc. get the user back to the right place
  const frontendOrigin = encodeURIComponent(returnUrl || (window.location.origin + window.location.pathname))
  const response = await apiFetch(`/api/oauth/google/auth-url?frontend_origin=${frontendOrigin}`)

  if (!response.ok) {
    throw new Error('Failed to get auth URL')
  }

  return response.json()
}

/**
 * Complete Google OAuth flow (creates database session)
 */
export const completeGoogleAuth = async (
  sessionId: string,
  userId?: string | null
): Promise<GoogleCompleteResponse> => {
  const completeUrl = userId
    ? `/api/oauth/google/complete?user_id=${userId}`
    : '/api/oauth/google/complete'

  const response = await apiFetch(completeUrl, {
    method: 'POST',
    headers: {
      'X-Session-ID': sessionId
    }
  })

  if (!response.ok) {
    throw new Error(`OAuth complete failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Check Google OAuth authentication status
 */
export const getGoogleAuthStatus = async (
  sessionId: string
): Promise<GoogleAuthStatusResponse> => {
  const response = await apiFetch('/api/oauth/google/status', {
    headers: {
      'X-Session-ID': sessionId
    }
  })

  if (!response.ok) {
    throw new Error('Failed to verify authentication')
  }

  return response.json()
}

/**
 * Logout from Google OAuth
 */
export const logoutGoogle = async (sessionId: string): Promise<void> => {
  await apiFetch('/api/oauth/google/logout', {
    method: 'POST',
    headers: {
      'X-Session-ID': sessionId
    }
  })
}

export interface GoogleOAuthPopupResult {
  popup: Window | null
  cleanup: () => void
}

/**
 * Open Google OAuth popup and handle the flow
 * Returns popup reference and cleanup function to remove message listener
 */
export const openGoogleOAuthPopup = (
  authUrl: string,
  onMessage: (userId: string | null) => void
): GoogleOAuthPopupResult => {
  const popup = window.open(
    authUrl,
    'google-oauth',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  )

  let messageHandler: ((event: MessageEvent) => void) | null = null
  const expectedOrigin = window.location.origin

  if (popup) {
    messageHandler = (event: MessageEvent) => {
      if (event.source !== popup) return
      if (event.origin !== expectedOrigin) return
      if (event.data?.type === 'oauth_complete' && event.data?.provider === 'google') {
        onMessage(event.data.user_id || null)
        if (messageHandler) {
          window.removeEventListener('message', messageHandler)
          messageHandler = null
        }
      }
    }
    window.addEventListener('message', messageHandler)
  }

  return {
    popup,
    cleanup: () => {
      if (messageHandler) {
        window.removeEventListener('message', messageHandler)
        messageHandler = null
      }
    }
  }
}
