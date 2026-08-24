import type { Asset } from '../../types'

const inputCls =
  'w-full px-2 py-1 rounded-lg bg-primary border border-tertiary paragraph-xs text-primary outline-none focus:border-utility-brand-400'

// The two fixes that aren't a single field: Google's ad copy (headlines and
// descriptions, validated together) and picking which draft ads are approved.
// Split from launch-check-fix-form.tsx for the component size limit.

export const RsaCopyInput = ({
  headlines,
  setHeadlines,
  descriptions,
  setDescriptions,
}: {
  headlines: string
  setHeadlines: (v: string) => void
  descriptions: string
  setDescriptions: (v: string) => void
}) => (
  <div className="space-y-1.5">
    <div>
      <span className="paragraph-xs text-quaternary">Headlines (3-15, ≤30 chars)</span>
      <textarea
        autoFocus
        rows={4}
        value={headlines}
        onChange={(e) => setHeadlines(e.target.value)}
        placeholder={'Fresh apples delivered\nWholesale fruit supplier'}
        className={inputCls}
      />
    </div>
    <div>
      <span className="paragraph-xs text-quaternary">Descriptions (2-4, ≤90 chars)</span>
      <textarea
        rows={3}
        value={descriptions}
        onChange={(e) => setDescriptions(e.target.value)}
        placeholder={'Order by 3pm for next-day delivery across the Cape.'}
        className={inputCls}
      />
    </div>
    <p className="paragraph-xs text-quaternary">
      {headlines.split('\n').filter((l) => l.trim()).length} headlines ·{' '}
      {descriptions.split('\n').filter((l) => l.trim()).length} descriptions
    </p>
  </div>
)

export const ReadyAdsInput = ({
  notReady,
  readyIds,
  setReadyIds,
}: {
  notReady: Asset[]
  readyIds: string[]
  setReadyIds: (fn: (prev: string[]) => string[]) => void
}) => (
  <div className="space-y-1">
    {notReady.map((a) => (
      <label
        key={a.asset_id}
        className="flex items-center gap-2 paragraph-xs text-secondary cursor-pointer"
      >
        <input
          type="checkbox"
          checked={readyIds.includes(a.asset_id)}
          onChange={(e) =>
            setReadyIds((prev) =>
              e.target.checked ? [...prev, a.asset_id] : prev.filter((id) => id !== a.asset_id),
            )
          }
        />
        <span className="truncate">{a.asset_name}</span>
        <span className="text-quaternary shrink-0">({a.status})</span>
      </label>
    ))}
  </div>
)

// Suggest / Save / Cancel. That order on purpose: get a draft, edit it, keep it.
export const FixActions = ({
  saveLabel,
  saveDisabled,
  busy,
  onSave,
  onCancel,
  onSuggest,
}: {
  saveLabel: string
  saveDisabled: boolean
  busy: boolean
  onSave: () => void
  onCancel: () => void
  onSuggest?: () => Promise<void>
}) => (
  <div className="flex items-center gap-2">
    {onSuggest && (
      <button
        onClick={() => void onSuggest()}
        disabled={busy}
        className="label-xs px-2.5 py-1 rounded-lg border border-utility-brand-400 text-utility-brand-700 hover:bg-tertiary disabled:opacity-50"
      >
        {busy ? 'Asking Mia…' : 'Suggest'}
      </button>
    )}
    <button
      onClick={onSave}
      disabled={saveDisabled}
      className="label-xs px-2.5 py-1 rounded-lg bg-utility-brand-600 text-white hover:bg-utility-brand-700 disabled:opacity-50"
    >
      {saveLabel}
    </button>
    <button
      onClick={onCancel}
      className="label-xs px-2 py-1 rounded-lg border border-tertiary text-secondary hover:bg-tertiary"
    >
      Cancel
    </button>
  </div>
)
