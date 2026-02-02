import { apiFetch } from '../../../utils/api'
import type { GoogleAccount } from '../types'

interface GoogleAuthStatusResponse {
  authenticated?: boolean
  user_info?: { id?: string }
  user_id?: string
}

export const fetchGoogleAuthStatus = async (sessionId: string): Promise<GoogleAuthStatusResponse | null> => {
  const response = await apiFetch('/api/oauth/google/status', {
    headers: { 'X-Session-ID': sessionId },
  })

  if (!response.ok) return null
  return response.json()
}

export const fetchGoogleAdAccounts = async (
  sessionId: string,
  userId: string,
): Promise<GoogleAccount[]> => {
  const response = await apiFetch(`/api/oauth/google/ad-accounts?user_id=${userId}`, {
    headers: { 'X-Session-ID': sessionId },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Google Ads accounts')
  }

  const data = await response.json()
  if (!data.success || !data.ad_accounts) {
    throw new Error('No Google Ads accounts found')
  }

  return data.ad_accounts
}

export const linkGoogleAdsAccount = async (payload: {
  sessionId: string
  targetAccountId: string | number
  googleAdsCustomerId: string
  loginCustomerId?: string
}) => {
  const response = await apiFetch('/api/accounts/link-google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': payload.sessionId,
    },
    body: JSON.stringify({
      google_ads_customer_id: payload.googleAdsCustomerId,
      login_customer_id: payload.loginCustomerId,
      target_account_id: payload.targetAccountId,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || 'Failed to link Google Ads account')
  }
}
