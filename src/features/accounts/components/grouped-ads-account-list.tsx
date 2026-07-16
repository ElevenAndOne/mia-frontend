/**
 * Shared grouped Google Ads account list — search input (shown past a threshold), accounts
 * grouped under their managing MCC, a standalone section, and a no-matches message. Used by
 * the Integrations GoogleAccountSelector and the onboarding AccountSelectorCard; each
 * surface supplies its own row renderer + styling.
 */
import type { DiscoveredGoogleAccount } from '../hooks/use-google-ads-discovery'

interface GroupedAdsAccountListProps {
  mccGroups: [string, DiscoveredGoogleAccount[]][]
  standalone: DiscoveredGoogleAccount[]
  totalCount: number
  search: string
  onSearchChange: (value: string) => void
  mccName: (mccId: string) => string
  renderItem: (account: DiscoveredGoogleAccount) => React.ReactNode
  searchInputClassName: string
  groupHeaderClassName: string
  listClassName: string
  searchThreshold?: number
}

export const GroupedAdsAccountList = ({
  mccGroups,
  standalone,
  totalCount,
  search,
  onSearchChange,
  mccName,
  renderItem,
  searchInputClassName,
  groupHeaderClassName,
  listClassName,
  searchThreshold = 5,
}: GroupedAdsAccountListProps) => {
  const noMatches = totalCount > 0 && mccGroups.length === 0 && standalone.length === 0

  return (
    <>
      {totalCount > searchThreshold && (
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or ID…"
          className={searchInputClassName}
        />
      )}
      <div className={listClassName}>
        {mccGroups.map(([mccId, accounts]) => (
          <div key={mccId}>
            <p className={groupHeaderClassName}>
              {mccName(mccId)} <span className="text-quaternary">({accounts.length})</span>
            </p>
            <div className="space-y-2">{accounts.map(renderItem)}</div>
          </div>
        ))}
        {standalone.length > 0 && (
          <div>
            {mccGroups.length > 0 && <p className={groupHeaderClassName}>Standalone Accounts</p>}
            <div className="space-y-2">{standalone.map(renderItem)}</div>
          </div>
        )}
        {noMatches && (
          <p className="paragraph-sm text-quaternary text-center py-2">
            No accounts match “{search}”.
          </p>
        )}
      </div>
    </>
  )
}
