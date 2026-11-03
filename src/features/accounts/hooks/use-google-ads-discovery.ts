/**
 * Shared Google Ads account discovery — used by the Integrations account picker and the
 * onboarding in-chat picker. Fetches the USER-level account list (all accounts across all
 * MCCs the Google login can reach, including accounts managed THROUGH an MCC the user has
 * no direct access to, tagged `via_mcc`) and provides grouping + search helpers.
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { apiFetch } from '../../../utils/api'
import { withWorkspace } from '../../integrations/utils/with-workspace'
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
  /** Accounts Google wouldn't let this login read (cancelled, suspended, no MCC route). */
  unreadable_accounts?: Array<{ customer_id: string; descriptive_name?: string; error?: string }>
  /** Manager accounts whose client list Google didn't return this time. */
  mcc_errors?: Array<{ mcc_id: string; name: string; message?: string }>
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
  /** Things the person should know about the list (missing MCC clients, unreadable ids). */
  notes: string[]
  /** Why discovery failed, in words (e.g. the Google login expired). */
  errorDetail: string | null
}

export const useGoogleAdsDiscovery = (
  enabled: boolean,
  googleUserId: string | undefined | null,
  // The workspace on screen: discovery then uses the WORKSPACE's Google login when it
  // differs from yours (an agency connecting a client's own Google login).
  tenantId?: string | null
): GoogleAdsDiscovery => {
  const [status, setStatus] = useState<DiscoveryStatus>('idle')
  const [accounts, setAccounts] = useState<DiscoveredGoogleAccount[]>([])
  const [mccs, setMccs] = useState<DiscoveredMcc[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  // The workspace the latest request is for. A response for an earlier workspace (the
  // user switched mid-fetch) is dropped instead of filling this workspace's picker.
  const tenantRef = useRef(tenantId)
  tenantRef.current = tenantId

  const runDiscovery = useCallback(async () => {
    if (!googleUserId) return
    const forTenant = tenantId
    const stale = () => tenantRef.current !== forTenant
    setStatus('loading')
    try {
      const response = await apiFetch(
        withWorkspace(
          `/api/oauth/google/ad-accounts?user_id=${encodeURIComponent(googleUserId)}`,
          tenantId
        )
      )
      if (stale()) return
      if (!response.ok) {
        const detail = await response
          .json()
          .then((b: { detail?: string }) => b?.detail)
          .catch(() => undefined)
        if (stale()) return
        setErrorDetail(
          typeof detail === 'string' && detail.includes(':') && detail.startsWith('google_')
            ? detail.slice(detail.indexOf(':') + 1).trim()
            : null
        )
        throw new Error(`Discovery failed: ${response.status}`)
      }
      setErrorDetail(null)
      const data: DiscoveredAccountsResponse = await response.json()
      if (stale()) return
      const newNotes: string[] = []
      for (const m of data.mcc_errors || []) {
        newNotes.push(
          `Google didn't return the client accounts under ${m.name} just now, so some may be missing. Try again shortly.`
        )
      }
      const unreadable = data.unreadable_accounts || []
      if (unreadable.length) {
        newNotes.push(
          `${unreadable.length} account${unreadable.length === 1 ? '' : 's'} (${unreadable
            .map((a) => a.customer_id)
            .slice(0, 3)
            .join(
              ', '
            )}${unreadable.length > 3 ? '…' : ''}) can't be read by this Google login, so ${unreadable.length === 1 ? "it isn't" : "they aren't"} shown. Usually cancelled or suspended, or managed through an MCC this login can't reach.`
        )
      }
      setNotes(newNotes)
      // regular_accounts is the SELECTABLE set (standalone + direct sub-accounts +
      // via_mcc). Fall back to filtering ad_accounts for older backend responses.
      const regular: DiscoveredGoogleAccount[] =
        data.regular_accounts || (data.ad_accounts || []).filter((a) => !a.manager)
      setAccounts(regular)
      setMccs(data.mcc_accounts || [])
      setStatus('ready')
      logger.log(`[GOOGLE-DISCOVERY] ${regular.length} selectable accounts`)
    } catch (err) {
      if (stale()) return
      logger.error('[GOOGLE-DISCOVERY] Fetch failed:', err)
      setStatus('error')
    }
  }, [googleUserId, tenantId])

  // A workspace switch in this tab: the list belongs to the previous workspace's Google
  // login. Drop it so the next open re-discovers (picking from it would point this
  // workspace at an account its own grant may not reach).
  useEffect(() => {
    setAccounts([])
    setMccs([])
    setNotes([])
    setErrorDetail(null)
    setStatus('idle')
  }, [tenantId])

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

  return { status, accounts, mccs, mccName, retry, notes, errorDetail }
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
