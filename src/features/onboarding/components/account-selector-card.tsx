import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../../../contexts/session-context'
import * as accountService from '../../accounts/services/account-service'
import {
  useGoogleAdsDiscovery,
  useGroupedDiscovery,
  type DiscoveredGoogleAccount,
} from '../../accounts/hooks/use-google-ads-discovery'
import { logger } from '../../../utils/logger'
import { Check } from '../../../components/icon/check'

interface AccountSelectorCardProps {
  onAccountSelected: (accountId: string, displayName?: string) => void
}

/** Any platform already linked on a workspace account row? */
const hasLinkedPlatform = (a: {
  google_ads_id?: string
  ga4_property_id?: string
  meta_ads_id?: string
  facebook_page_id?: string
  hubspot_portal_id?: string
  brevo_api_key?: string
  mailchimp_id?: string
}) =>
  !!(
    a.google_ads_id ||
    a.ga4_property_id ||
    a.meta_ads_id ||
    a.facebook_page_id ||
    a.hubspot_portal_id ||
    a.brevo_api_key ||
    a.mailchimp_id
  )

export const AccountSelectorCard = ({ onAccountSelected }: AccountSelectorCardProps) => {
  const {
    availableAccounts,
    selectedAccount,
    selectAccount,
    isLoading,
    user,
    sessionId,
    refreshAccounts,
    refreshWorkspaces,
  } = useSession()
  const [selectedId, setSelectedId] = useState<string | null>(selectedAccount?.id || null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // ── Discovery mode (first-time onboarding) ────────────────────────────────────
  // Engage ONLY for the canonical fresh-workspace case: exactly ONE workspace account
  // row with NO platform linked yet, and a Google login to discover with. A workspace
  // that already has ANY platform (e.g. Meta-first) keeps the original tenant-accounts
  // list so those accounts stay selectable; multi-row (legacy) workspaces do too.
  const workspaceRow = availableAccounts.length === 1 ? availableAccounts[0] : null
  const discoveryMode = !!user?.google_user_id && !!workspaceRow && !hasLinkedPlatform(workspaceRow)

  const discovery = useGoogleAdsDiscovery(discoveryMode, user?.google_user_id)
  const { mccGroups, standalone } = useGroupedDiscovery(discovery.accounts, search)

  // ── Existing-accounts mode (re-entry / Meta-first / invited member) ───────────
  const { mccAccounts, standaloneAccounts } = useMemo(() => {
    const mcc: typeof availableAccounts = []
    const standaloneList: typeof availableAccounts = []
    availableAccounts.forEach((account) => {
      if (account.google_ads_account_type === 'mcc') {
        mcc.push(account)
      } else {
        standaloneList.push(account)
      }
    })
    return { mccAccounts: mcc, standaloneAccounts: standaloneList }
  }, [availableAccounts])

  // Select an account already attached to the workspace (original behavior).
  const handleSelect = async (accountId: string) => {
    if (isSelecting) return
    setSelectedId(accountId)
    setIsSelecting(true)
    setError(null)
    try {
      const success = await selectAccount(accountId)
      if (success) {
        onAccountSelected(accountId)
      } else {
        setError('Failed to select account — please try again.')
      }
    } catch (err) {
      logger.error('Failed to select account:', err)
      setError('Failed to select account — please try again.')
    } finally {
      setIsSelecting(false)
    }
  }

  // Select a DISCOVERED account. Order matters:
  //  1. select the workspace row (sets session.selected_account_id),
  //  2. THEN set-google-ads — the authoritative write of the account + managing MCC onto
  //     the workspace mapping + tenant creds (last so nothing can clobber it),
  //  3. refresh session state so the app reflects the link,
  //  4. continue the chat — the Bronze/30-day fetch now reads the right account.
  const handleDiscoveredSelect = async (account: DiscoveredGoogleAccount) => {
    if (isSelecting || !workspaceRow) return
    setSelectedId(account.customer_id)
    setIsSelecting(true)
    setError(null)
    try {
      const success = await selectAccount(workspaceRow.id)
      if (!success) {
        throw new Error('Failed to select account — please try again.')
      }

      await accountService.setGoogleAdsAccount(sessionId || '', {
        customer_id: account.customer_id,
        google_ads_account_type: account.parent_mcc_id ? 'mcc_subaccount' : 'standalone',
        ...(account.parent_mcc_id ? { google_ads_mcc_id: account.parent_mcc_id } : {}),
      })

      // Sync frontend state (linked-status, google_ads_id on the row) with the backend.
      await Promise.all([refreshAccounts(), refreshWorkspaces()])

      onAccountSelected(workspaceRow.id, account.descriptive_name)
    } catch (err) {
      logger.error('[ONBOARDING-SELECTOR] Discovered-account selection failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to select account')
    } finally {
      setIsSelecting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  const discoveryPending =
    discoveryMode && (discovery.status === 'idle' || discovery.status === 'loading')
  if ((isLoading && availableAccounts.length === 0) || discoveryPending) {
    return (
      <CardShell>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-utility-brand-600 rounded-full animate-spin" />
          <span className="paragraph-sm text-secondary">Loading your accounts...</span>
        </div>
      </CardShell>
    )
  }

  if (discoveryMode && discovery.status === 'error') {
    return (
      <CardShell>
        <p className="paragraph-sm text-secondary mb-2">
          Couldn&apos;t load your Google Ads accounts.
        </p>
        <button
          type="button"
          onClick={discovery.retry}
          className="paragraph-sm text-utility-brand-600 underline"
        >
          Try again
        </button>
      </CardShell>
    )
  }

  if (discoveryMode) {
    if (discovery.accounts.length === 0) {
      return (
        <CardShell>
          <p className="paragraph-sm text-secondary">
            No Google Ads accounts found for your Google login. You can connect platforms from
            the Integrations page instead.
          </p>
        </CardShell>
      )
    }

    const noMatches = mccGroups.length === 0 && standalone.length === 0

    return (
      <CardShell wide>
        {discovery.accounts.length > 5 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full mb-3 px-3 py-2 rounded-xl bg-tertiary text-primary paragraph-sm placeholder:text-placeholder-subtle focus:outline-none"
          />
        )}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {mccGroups.map(([mccId, accts]) => (
            <div key={mccId}>
              <p className="paragraph-xs text-tertiary mb-2 uppercase tracking-wide">
                {discovery.mccName(mccId)} ({accts.length})
              </p>
              {accts.map((account) => (
                <AccountItem
                  key={account.customer_id}
                  account={{
                    id: account.customer_id,
                    name: account.descriptive_name || `Account ${account.customer_id}`,
                    google_ads_id: account.customer_id,
                  }}
                  badge={account.via_mcc ? 'Via MCC' : undefined}
                  isSelected={selectedId === account.customer_id}
                  isSelecting={isSelecting && selectedId === account.customer_id}
                  onSelect={() => handleDiscoveredSelect(account)}
                  icon={<img src="/icons/google-ads.svg" alt="" className="w-5 h-5" />}
                />
              ))}
            </div>
          ))}
          {standalone.length > 0 && (
            <div>
              {mccGroups.length > 0 && (
                <p className="paragraph-xs text-tertiary mb-2 uppercase tracking-wide">
                  Standalone Accounts
                </p>
              )}
              {standalone.map((account) => (
                <AccountItem
                  key={account.customer_id}
                  account={{
                    id: account.customer_id,
                    name: account.descriptive_name || `Account ${account.customer_id}`,
                    google_ads_id: account.customer_id,
                  }}
                  isSelected={selectedId === account.customer_id}
                  isSelecting={isSelecting && selectedId === account.customer_id}
                  onSelect={() => handleDiscoveredSelect(account)}
                  icon={<img src="/icons/google-ads.svg" alt="" className="w-5 h-5" />}
                />
              ))}
            </div>
          )}
          {noMatches && (
            <p className="paragraph-sm text-quaternary text-center py-2">
              No accounts match “{search}”.
            </p>
          )}
        </div>
        {error && <p className="paragraph-xs text-error mt-2">{error}</p>}
      </CardShell>
    )
  }

  if (availableAccounts.length === 0) {
    return (
      <CardShell>
        <p className="paragraph-sm text-secondary">
          No accounts found. Please connect a platform first.
        </p>
      </CardShell>
    )
  }

  return (
    <CardShell wide>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {/* MCC Accounts */}
        {mccAccounts.length > 0 && (
          <div className="mb-3">
            <p className="paragraph-xs text-tertiary mb-2 uppercase tracking-wide">
              Manager Accounts
            </p>
            {mccAccounts.map((account) => (
              <AccountItem
                key={account.id}
                account={account}
                isSelected={selectedId === account.id}
                isSelecting={isSelecting && selectedId === account.id}
                onSelect={handleSelect}
                icon={<img src="/icons/google-ads.svg" alt="" className="w-5 h-5" />}
              />
            ))}
          </div>
        )}

        {/* Standalone Accounts */}
        {standaloneAccounts.length > 0 && (
          <div>
            {mccAccounts.length > 0 && (
              <p className="paragraph-xs text-tertiary mb-2 uppercase tracking-wide">Accounts</p>
            )}
            {standaloneAccounts.map((account) => (
              <AccountItem
                key={account.id}
                account={account}
                isSelected={selectedId === account.id}
                isSelecting={isSelecting && selectedId === account.id}
                onSelect={handleSelect}
                icon={<img src="/icons/google-ads.svg" alt="" className="w-5 h-5" />}
              />
            ))}
          </div>
        )}
      </div>
      {error && <p className="paragraph-xs text-error mt-2">{error}</p>}
    </CardShell>
  )
}

const CardShell = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-secondary rounded-2xl p-4 max-w-md ${wide ? 'w-full' : ''}`}
  >
    {children}
  </motion.div>
)

interface AccountItemProps {
  account: {
    id: string
    name: string
    google_ads_id?: string
  }
  isSelected: boolean
  isSelecting: boolean
  onSelect: (id: string) => void
  icon: React.ReactNode
  badge?: string
}

const AccountItem = ({
  account,
  isSelected,
  isSelecting,
  onSelect,
  icon,
  badge,
}: AccountItemProps) => (
  <button
    type="button"
    onClick={() => onSelect(account.id)}
    disabled={isSelecting}
    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
      isSelected
        ? 'bg-utility-brand-100 border-2 border-utility-brand-500'
        : 'bg-tertiary hover:bg-quaternary border-2 border-transparent'
    }`}
  >
    <div className="w-8 h-8 rounded-lg bg-utility-info-200 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0 text-left">
      <div className="flex items-center gap-2">
        <p className="subheading-sm text-primary truncate">{account.name}</p>
        {badge && (
          <span className="paragraph-xs px-2 py-0.5 rounded-full bg-tertiary text-tertiary shrink-0">
            {badge}
          </span>
        )}
      </div>
      {account.google_ads_id && (
        <p className="paragraph-xs text-tertiary">ID: {account.google_ads_id}</p>
      )}
    </div>
    {isSelecting ? (
      <div className="w-5 h-5 border-2 border-primary border-t-utility-brand-600 rounded-full animate-spin shrink-0" />
    ) : isSelected ? (
      <Check size={20} className="text-utility-brand-600 shrink-0" />
    ) : null}
  </button>
)
