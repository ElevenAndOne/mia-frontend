import { Icon } from '../../../components/icon'
import { Spinner } from '../../../components/spinner'
import { SegmentedControl } from '../../../components/segmented-control'
import { useBudgetTracker } from '../hooks/use-budget-tracker'
import { BudgetSummaryCards } from '../components/budget-summary-cards'
import { BudgetPlatformBreakdown } from '../components/budget-platform-breakdown'
import { BudgetIntelligencePanel } from '../components/budget-intelligence-panel'

interface Props {
  onBack: () => void
}

const MODE_OPTIONS = [
  { label: 'Monthly', value: 'monthly' as const },
  { label: 'Whole campaign', value: 'campaign' as const },
]

export const BudgetTrackerView = ({ onBack }: Props) => {
  const { campaigns, campaignId, setCampaignId, mode, setMode, snapshot, loading, error } =
    useBudgetTracker()

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-tertiary hover:text-primary transition-colors">
            <Icon.arrow_left size={20} />
          </button>
          <h1 className="text-xl font-semibold text-primary">Budget Tracker</h1>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {campaigns.length > 0 && (
            <select
              value={campaignId ?? ''}
              onChange={(e) => setCampaignId(e.target.value)}
              className="paragraph-sm text-primary bg-secondary border border-tertiary rounded-lg px-3 py-2 outline-none cursor-pointer max-w-[260px]"
              style={{ appearance: 'auto' }}
            >
              {campaigns.map((c) => (
                <option key={c.campaign_id} value={c.campaign_id}>
                  {c.is_primary ? '★ ' : ''}
                  {c.campaign_name}
                </option>
              ))}
            </select>
          )}
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
          {snapshot && (
            <span className="paragraph-xs text-tertiary ml-auto">
              {snapshot.window.label} · {snapshot.window.start} → {snapshot.window.end}
            </span>
          )}
        </div>

        {/* Body */}
        {loading && !snapshot ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" variant="primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-tertiary bg-secondary/40 p-8 text-center">
            <p className="paragraph-sm text-secondary">{error}</p>
          </div>
        ) : snapshot ? (
          <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <BudgetSummaryCards snapshot={snapshot} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <BudgetPlatformBreakdown snapshot={snapshot} />
              </div>
              <div className="lg:col-span-1">
                <BudgetIntelligencePanel snapshot={snapshot} />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-tertiary bg-secondary/40 p-8 text-center">
            <p className="paragraph-sm text-secondary">No campaigns found for this workspace.</p>
          </div>
        )}
      </div>
    </div>
  )
}
