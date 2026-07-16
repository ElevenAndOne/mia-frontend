/**
 * State + orchestration for the onboarding in-chat account picker.
 *
 * Two modes:
 * - DISCOVERY (first-time Google user, fresh workspace): list the user's real Google Ads
 *   accounts (across all MCCs, incl. via_mcc) and ATTACH the chosen one to the workspace.
 * - TENANT (everything else — Meta-first, re-entry, invited member, multi-row, discovery
 *   empty or failed): the original workspace-accounts list. This mode is ALWAYS reachable
 *   so the onboarding chat can never dead-end on Google discovery.
 */
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSession } from '../../../contexts/session-context'
import * as accountService from '../../accounts/services/account-service'
import {
  useGoogleAdsDiscovery,
  useGroupedDiscovery,
  setGoogleAdsBodyFor,
  type DiscoveredGoogleAccount,
} from '../../accounts/hooks/use-google-ads-discovery'
import { hasLinkedPlatform, type AccountMapping } from '../../accounts/types'
import { logger } from '../../../utils/logger'

export type OnboardingSelectorView = 'loading' | 'completed' | 'discovery' | 'tenant'

export const useOnboardingAccountSelection = (
  onAccountSelected: (accountId: string, displayName?: string) => void
) => {
  const {
    availableAccounts,
    selectedAccount,
    selectAccount,
    isLoading,
    isAuthenticated,
    user,
    sessionId,
    refreshAccounts,
    refreshWorkspaces,
  } = useSession()

  const [selectedId, setSelectedId] = useState<string | null>(selectedAccount?.id || null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  // Once a selection has gone through, freeze the card (it stays in the chat transcript —
  // it must not flip modes or accept a second selection after state refreshes).
  const [completedName, setCompletedName] = useState<string | null>(null)

  // Discovery only for the canonical fresh-workspace case, gated on ACTUAL Google auth —
  // isAuthenticated is the Google-specific flag; user.google_user_id alone is unreliable
  // (Meta-first logins store the Meta id there).
  const workspaceRow = availableAccounts.length === 1 ? availableAccounts[0] : null
  const discoveryEnabled =
    isAuthenticated && !!user?.google_user_id && !!workspaceRow && !hasLinkedPlatform(workspaceRow)

  const discovery = useGoogleAdsDiscovery(discoveryEnabled, user?.google_user_id)
  const { mccGroups, standalone } = useGroupedDiscovery(discovery.accounts, search)

  // Once discovery has resolved once (ready OR error), a subsequent 'loading' is a RETRY —
  // it must NOT blank the whole card back to the spinner (which would hide the always-
  // selectable tenant fallback). The full loading view is only for the very first attempt.
  const [discoverySettled, setDiscoverySettled] = useState(false)
  useEffect(() => {
    if (discovery.status === 'ready' || discovery.status === 'error') {
      setDiscoverySettled(true)
    }
  }, [discovery.status])

  // Tenant-mode grouping (original behavior).
  const { mccAccounts, standaloneAccounts } = useMemo(() => {
    const mcc: AccountMapping[] = []
    const standaloneList: AccountMapping[] = []
    availableAccounts.forEach((account) => {
      if (account.google_ads_account_type === 'mcc') {
        mcc.push(account)
      } else {
        standaloneList.push(account)
      }
    })
    return { mccAccounts: mcc, standaloneAccounts: standaloneList }
  }, [availableAccounts])

  // Which view to render. Tenant is the universal fallback: discovery that is empty or
  // errored falls through to it (with a notice) so the chat always offers something
  // selectable — the workspace row itself in the worst case.
  const view: OnboardingSelectorView = completedName
    ? 'completed'
    : (isLoading && availableAccounts.length === 0) ||
        (discoveryEnabled &&
          !discoverySettled &&
          (discovery.status === 'idle' || discovery.status === 'loading'))
      ? 'loading'
      : discoveryEnabled && discovery.status === 'ready' && discovery.accounts.length > 0
        ? 'discovery'
        : 'tenant'

  // Shown ON the tenant fallback so the user knows why they're seeing the workspace list.
  const discoveryNotice =
    view === 'tenant' && discoveryEnabled && discovery.status === 'error'
      ? "Couldn't load your Google Ads accounts — you can retry, or continue with your workspace."
      : view === 'tenant' && discoveryEnabled && discovery.status === 'ready'
        ? 'No Google Ads accounts found for your Google login — you can continue and connect platforms later.'
        : null
  // Retry affordance keyed off the actual status, not notice prose. On a retry the card
  // stays on the tenant fallback (discoverySettled guard above) with this inline hint.
  const canRetryDiscovery = discoveryEnabled && discovery.status === 'error'
  const discoveryRetrying = discoveryEnabled && discoverySettled && discovery.status === 'loading'

  // Select an account already attached to the workspace (original behavior).
  const handleSelect = useCallback(
    async (accountId: string) => {
      if (isSelecting) return
      setSelectedId(accountId)
      setIsSelecting(true)
      setError(null)
      try {
        const success = await selectAccount(accountId)
        if (success) {
          const name = availableAccounts.find((a) => a.id === accountId)?.name
          setCompletedName(name || 'Selected account')
          onAccountSelected(accountId)
        } else {
          setError('Failed to select account — please try again.')
        }
      } catch (err) {
        logger.error('[ONBOARDING-SELECTOR] Account selection failed:', err)
        setError('Failed to select account — please try again.')
      } finally {
        setIsSelecting(false)
      }
    },
    [isSelecting, selectAccount, availableAccounts, onAccountSelected]
  )

  // Select a DISCOVERED account. Order matters: select the workspace row first (session
  // points at it), then set-google-ads LAST as the authoritative write of the account +
  // managing MCC, then refresh so the app reflects the link before the chat continues.
  const handleDiscoveredSelect = useCallback(
    async (account: DiscoveredGoogleAccount) => {
      if (isSelecting || !workspaceRow) return
      setSelectedId(account.customer_id)
      setIsSelecting(true)
      setError(null)
      try {
        const success = await selectAccount(workspaceRow.id)
        if (!success) {
          throw new Error('Failed to select account — please try again.')
        }
        await accountService.setGoogleAdsAccount(sessionId || '', setGoogleAdsBodyFor(account))
        // Freeze the card to the 'completed' view BEFORE refreshing: refreshAccounts commits
        // availableAccounts (the row now has google_ads_id → discoveryEnabled flips false),
        // which would otherwise re-derive the view to a re-selectable list for a frame or two.
        // completedName takes precedence in the view derivation, so set it first.
        setCompletedName(account.descriptive_name || account.customer_id)
        onAccountSelected(workspaceRow.id, account.descriptive_name)
        await Promise.all([refreshAccounts(), refreshWorkspaces()]).catch((err) => {
          // Non-fatal: the link itself succeeded; state re-syncs on next session validate.
          logger.error('[ONBOARDING-SELECTOR] Post-link refresh failed:', err)
        })
      } catch (err) {
        logger.error('[ONBOARDING-SELECTOR] Discovered-account selection failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to select account')
      } finally {
        setIsSelecting(false)
      }
    },
    [
      isSelecting,
      workspaceRow,
      selectAccount,
      sessionId,
      refreshAccounts,
      refreshWorkspaces,
      onAccountSelected,
    ]
  )

  return {
    view,
    completedName,
    discoveryNotice,
    canRetryDiscovery,
    discoveryRetrying,
    retryDiscovery: discovery.retry,
    mccName: discovery.mccName,
    discoveredTotal: discovery.accounts.length,
    mccGroups,
    standalone,
    mccAccounts,
    standaloneAccounts,
    search,
    setSearch,
    selectedId,
    isSelecting,
    error,
    handleSelect,
    handleDiscoveredSelect,
  }
}
