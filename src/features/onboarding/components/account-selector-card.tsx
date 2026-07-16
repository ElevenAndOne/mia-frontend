import { motion } from 'framer-motion'
import { GroupedAdsAccountList } from '../../accounts/components/grouped-ads-account-list'
import { useOnboardingAccountSelection } from '../hooks/use-onboarding-account-selection'
import type { AccountMapping } from '../../accounts/types'
import { Check } from '../../../components/icon/check'

interface AccountSelectorCardProps {
  onAccountSelected: (accountId: string, displayName?: string) => void
}

const GROUP_HEADER = 'paragraph-xs text-tertiary mb-2 uppercase tracking-wide'
const SEARCH_INPUT =
  'w-full mb-3 px-3 py-2 rounded-xl bg-tertiary text-primary paragraph-sm placeholder:text-placeholder-subtle focus:outline-none'

export const AccountSelectorCard = ({ onAccountSelected }: AccountSelectorCardProps) => {
  const s = useOnboardingAccountSelection(onAccountSelected)

  if (s.view === 'loading') {
    return (
      <CardShell>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-utility-brand-600 rounded-full animate-spin" />
          <span className="paragraph-sm text-secondary">Loading your accounts...</span>
        </div>
      </CardShell>
    )
  }

  if (s.view === 'completed') {
    return (
      <CardShell>
        <div className="flex items-center gap-2">
          <Check size={18} className="text-utility-brand-600 shrink-0" />
          <span className="paragraph-sm text-secondary">{s.completedName} connected</span>
        </div>
      </CardShell>
    )
  }

  if (s.view === 'discovery') {
    return (
      <CardShell wide>
        <GroupedAdsAccountList
          mccGroups={s.mccGroups}
          standalone={s.standalone}
          totalCount={s.discoveredTotal}
          search={s.search}
          onSearchChange={s.setSearch}
          mccName={s.mccName}
          searchInputClassName={SEARCH_INPUT}
          groupHeaderClassName={GROUP_HEADER}
          listClassName="space-y-3 max-h-64 overflow-y-auto"
          renderItem={(account) => (
            <AccountItem
              key={account.customer_id}
              account={{
                id: account.customer_id,
                name: account.descriptive_name || `Account ${account.customer_id}`,
                google_ads_id: account.customer_id,
              }}
              badge={account.via_mcc ? 'Via MCC' : undefined}
              isSelected={s.selectedId === account.customer_id}
              isSelecting={s.isSelecting && s.selectedId === account.customer_id}
              onSelect={() => s.handleDiscoveredSelect(account)}
            />
          )}
        />
        {s.error && <p className="paragraph-xs text-error mt-2">{s.error}</p>}
      </CardShell>
    )
  }

  // TENANT view — the universal fallback: workspace accounts are always selectable, so the
  // onboarding chat can never dead-end on Google discovery (Meta-first, zero Google Ads
  // accounts, persistent discovery errors all land here).
  const noAccounts = s.mccAccounts.length === 0 && s.standaloneAccounts.length === 0
  return (
    <CardShell wide={!noAccounts}>
      {s.discoveryNotice && (
        <p className="paragraph-xs text-tertiary mb-2">
          {s.discoveryNotice}{' '}
          {s.canRetryDiscovery && (
            <button
              type="button"
              onClick={s.retryDiscovery}
              className="text-utility-brand-600 underline"
            >
              Try again
            </button>
          )}
        </p>
      )}
      {s.discoveryRetrying && (
        <p className="paragraph-xs text-tertiary mb-2">Retrying your Google Ads accounts…</p>
      )}
      {noAccounts ? (
        <p className="paragraph-sm text-secondary">
          No accounts found. Please connect a platform first.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {s.mccAccounts.length > 0 && (
            <div className="mb-3">
              <p className={GROUP_HEADER}>Manager Accounts</p>
              {s.mccAccounts.map((account) => (
                <TenantAccountItem key={account.id} account={account} s={s} />
              ))}
            </div>
          )}
          {s.standaloneAccounts.length > 0 && (
            <div>
              {s.mccAccounts.length > 0 && <p className={GROUP_HEADER}>Accounts</p>}
              {s.standaloneAccounts.map((account) => (
                <TenantAccountItem key={account.id} account={account} s={s} />
              ))}
            </div>
          )}
        </div>
      )}
      {s.error && <p className="paragraph-xs text-error mt-2">{s.error}</p>}
    </CardShell>
  )
}

const TenantAccountItem = ({
  account,
  s,
}: {
  account: AccountMapping
  s: ReturnType<typeof useOnboardingAccountSelection>
}) => (
  <AccountItem
    account={account}
    isSelected={s.selectedId === account.id}
    isSelecting={s.isSelecting && s.selectedId === account.id}
    onSelect={s.handleSelect}
  />
)

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
  account: { id: string; name: string; google_ads_id?: string }
  isSelected: boolean
  isSelecting: boolean
  onSelect: (id: string) => void
  badge?: string
}

const AccountItem = ({ account, isSelected, isSelecting, onSelect, badge }: AccountItemProps) => (
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
      <img src="/icons/google-ads.svg" alt="" className="w-5 h-5" />
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
