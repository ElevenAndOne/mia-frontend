/**
 * Session validation API service
 */
import { apiFetch, createSessionHeaders } from '../../../utils/api'

/**
 * Session validation response from /api/session/validate
 * Based on API documentation
 */
export interface SessionValidationResponse {
  valid: boolean
  session_id?: string
  user?: {
    user_id: string
    name: string
    email: string
    picture_url?: string
    has_seen_intro?: boolean
    onboarding_completed?: boolean
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
  /** Distinguishes user authentication from platform connection */
  user_authenticated?: {
    google: boolean
    meta: boolean
  }
  /** Platform connection status for IntegrationsPage */
  platforms?: {
    google: boolean
    meta: boolean
    brevo: boolean
    hubspot: boolean
    mailchimp?: boolean
  }
  expires_at?: string
}

/**
 * Validate an existing session
 */
export const validateSession = async (sessionId: string): Promise<SessionValidationResponse> => {
  const response = await apiFetch('/api/session/validate', {
    headers: createSessionHeaders(sessionId)
  })

  if (!response.ok) {
    throw new Error(`Session validation failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Handle mobile OAuth redirect completion
 */
export const handleMobileOAuthRedirect = async (
  sessionId: string,
  userId?: string | null
): Promise<boolean> => {
  try {
    const completeUrl = userId
      ? `/api/oauth/google/complete?user_id=${userId}`
      : '/api/oauth/google/complete'

    const response = await apiFetch(completeUrl, {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId
      }
    })

    return response.ok
  } catch (error) {
    console.error('[SESSION] Mobile OAuth complete error:', error)
    return false
  }
}
