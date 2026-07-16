/**
 * Shared Google Ads account discovery — used by the Integrations account picker and the
 * onboarding in-chat picker. Fetches the USER-level account list (all accounts across all
 * MCCs the Google login can reach, including accounts managed THROUGH an MCC the user has
 * no direct access to, tagged `via_mcc`) and provides grouping + search helpers.
 */
import { useState, useCallback, useEffect, useMemo } from 'react'
import { apiFetch } from '../../../utils/api'
import { logger } from '../../../utils/logger'
import type { SetGoogleAdsBody } from '../services/account-service'

export interface DiscoveredGoogleAccount {
  customer_id: string
  descriptive_name: string
  manager: boolean
  parent_mcc_id?: string | null
  /** Managed through an MCC the user has no direct access to (agency flow). */
  via_mcc?: boolean
  currency_code?: string
}

export interface DiscoveredMcc {
  customer_id: string
  descriptive_name: string
  account_count?: number
}

/** Response shape of GET /api/oauth/google/ad-accounts. */
interface DiscoveredAccountsResponse {
  success?: boolean
  regular_accounts?: DiscoveredGoogleAccount[]
  mcc_accounts?: DiscoveredMcc[]
  /** Legacy combined list (older backend responses). */
  ad_accounts?: DiscoveredGoogleAccount[]
}

/** Build the /api/accounts/set-google-ads payload for a discovered account — the single
 *  source of the "has a parent MCC ⇒ mcc_subaccount + route via that MCC" rule. */
export const setGoogleAdsBodyFor = (account: DiscoveredGoogleAccount): SetGoogleAdsBody => ({
  customer_id: account.customer_id,
  google_ads_account_type: account.parent_mcc_id ? 'mcc_subaccount' : 'standalone',
  ...(account.parent_mcc_id ? { google_ads_mcc_id: account.parent_mcc_id } : {}),
})

export type DiscoveryStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface GoogleAdsDiscovery {
  status: DiscoveryStatus
  accounts: DiscoveredGoogleAccount[]
  mccs: DiscoveredMcc[]
  /** Display name for an MCC id (falls back to `Manager <id>`). */
  mccName: (mccId: string) => string
  /** Re-run the fetch after an error. */
  retry: () => void
}

export const useGoogleAdsDiscovery = (
  enabled: boolean,
  googleUserId: string | undefined | null
): GoogleAdsDiscovery => {
  const [status, setStatus] = useState<DiscoveryStatus>('idle')
  const [accounts, setAccounts] = useState<DiscoveredGoogleAccount[]>([])
  const [mccs, setMccs] = useState<DiscoveredMcc[]>([])

  const runDiscovery = useCallback(async () => {
    if (!googleUserId) return
    setStatus('loading')
    try {
      const response = await apiFetch(
        `/api/oauth/google/ad-accounts?user_id=${encodeURIComponent(googleUserId)}`
      )
      if (!response.ok) throw new Error(`Discovery failed: ${response.status}`)
      const data: DiscoveredAccountsResponse = await response.json()
      // regular_accounts is the SELECTABLE set (standalone + direct sub-accounts +
      // via_mcc). Fall back to filtering ad_accounts for older backend responses.
      const regular: DiscoveredGoogleAccount[] =
        data.regular_accounts || (data.ad_accounts || []).filter((a) => !a.manager)
      setAccounts(regular)
      setMccs(data.mcc_accounts || [])
      setStatus('ready')
      logger.log(`[GOOGLE-DISCOVERY] ${regular.length} selectable accounts`)
    } catch (err) {
      logger.error('[GOOGLE-DISCOVERY] Fetch failed:', err)
      setStatus('error')
    }
  }, [googleUserId])

  useEffect(() => {
    if (enabled && status === 'idle' && googleUserId) {
      void runDiscovery()
    }
  }, [enabled, status, googleUserId, runDiscovery])

  const mccName = useCallback(
    (mccId: string) =>
      mccs.find((m) => m.customer_id === mccId)?.descriptive_name || `Manager ${mccId}`,
    [mccs]
  )

  const retry = useCallback(() => {
    void runDiscovery()
  }, [runDiscovery])

  return { status, accounts, mccs, mccName, retry }
}

/** Filter by search text, then group by managing MCC (standalone accounts separate). */
export const useGroupedDiscovery = (accounts: DiscoveredGoogleAccount[], search: string) =>
  useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? accounts.filter(
          (a) =>
            (a.descriptive_name || '').toLowerCase().includes(q) ||
            a.customer_id.toLowerCase().includes(q)
        )
      : accounts
    const byMcc = new Map<string, DiscoveredGoogleAccount[]>()
    const standalone: DiscoveredGoogleAccount[] = []
    for (const a of filtered) {
      if (a.parent_mcc_id) {
        const arr = byMcc.get(a.parent_mcc_id) || []
        arr.push(a)
        byMcc.set(a.parent_mcc_id, arr)
      } else {
        standalone.push(a)
      }
    }
    return { mccGroups: [...byMcc.entries()], standalone }
  }, [accounts, search])
