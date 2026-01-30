/**
 * Session validation API service
 */
import { apiFetch } from '../../../utils/api'

export interface SessionValidationResponse {
  valid: boolean
  user?: {
    name: string
    email: string
    picture_url?: string
    user_id: string
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
  }
  user_authenticated?: {
    google: boolean
    meta: boolean
  }
  platforms?: {
    google: boolean
    meta: boolean
  }
}

/**
 * Validate an existing session
 */
export const validateSession = async (sessionId: string): Promise<SessionValidationResponse> => {
  const response = await apiFetch(`/api/session/validate?session_id=${sessionId}`)

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
