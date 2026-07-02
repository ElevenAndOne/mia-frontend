/**
 * Session validation API service
 */
import { apiFetch, createSessionHeaders } from '../../../utils/api'
import { logger } from '../../../utils/logger'

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
  const response = await apiFetch(
    `/api/session/validate?session_id=${encodeURIComponent(sessionId)}`,
    {
      headers: createSessionHeaders(sessionId),
    }
  )

  if (!response.ok) {
    throw new Error(`Session validation failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Redeem a single-use OAuth login claim code for a server-minted session (Audit #4).
 *
 * The backend OAuth callback now mints the AuthSession server-side from the identity
 * proven by the code exchange, and hands the frontend only this short-lived, single-use
 * claim code — never a user_id. We exchange it for the session id + the same user-state
 * payload /validate returns. Replaces handleMobileOAuthRedirect, which POSTed a
 * client-supplied user_id to /complete to mint a session (the takeover vector).
 */
export const claimSession = async (
  claimCode: string
): Promise<SessionValidationResponse | null> => {
  try {
    const response = await apiFetch('/api/session/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_code: claimCode }),
    })

    if (!response.ok) {
      logger.error('[SESSION] Claim redemption failed:', response.status)
      return null
    }

    return (await response.json()) as SessionValidationResponse
  } catch (error) {
    logger.error('[SESSION] Claim redemption error:', error)
    return null
  }
}
