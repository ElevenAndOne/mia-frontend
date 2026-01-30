/**
 * Google OAuth API service
 */
import { apiFetch } from '../../../utils/api'

export interface GoogleAuthUrlResponse {
  auth_url: string
}

export interface GoogleAuthStatusResponse {
  authenticated: boolean
  needs_session_creation?: boolean
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
  }
  name?: string
  email?: string
  picture?: string
  user_id?: string
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
 */
export const getGoogleAuthUrl = async (): Promise<GoogleAuthUrlResponse> => {
  const frontendOrigin = encodeURIComponent(window.location.origin)
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

/**
 * Open Google OAuth popup and handle the flow
 */
export const openGoogleOAuthPopup = (
  authUrl: string,
  onMessage: (userId: string | null) => void
): Window | null => {
  const popup = window.open(
    authUrl,
    'google-oauth',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  )

  if (popup) {
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'oauth_complete' && event.data?.provider === 'google') {
        onMessage(event.data.user_id || null)
        window.removeEventListener('message', messageHandler)
      }
    }
    window.addEventListener('message', messageHandler)
  }

  return popup
}
