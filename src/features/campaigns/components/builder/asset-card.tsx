import { EditableText } from '../../../../components/editable-text'
import { EditableTextarea } from '../../../../components/editable-textarea'
import type { Asset } from '../../types'

const ASSET_TYPES = [
  'static', 'carousel', 'reel', 'animation', 'email', 'video', 'post_series',
  'single_image', 'story', 'search_ad', 'responsive_search_ad', 'display_ad',
  'pmax', 'pdf', 'text_ad',
]

const inputCls =
  'w-full px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-secondary-subtle text-secondary outline-none focus:border-utility-brand-400'
const numCls = `${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden`
const fieldLabel = 'text-[9.5px] font-semibold text-quaternary uppercase tracking-[0.12em] mb-1 block'

interface AssetCardProps {
  asset: Asset
  onPatch: (fields: Partial<Asset>) => void
  onDelete: () => void
}

// One creative deliverable. Asset-level budget + flight roll up to the channel
// total (see budget-math). Presentational — edits delegate to the channel editor.
export const AssetCard = ({ asset, onPatch, onDelete }: AssetCardProps) => {
  const details = (asset.details as Record<string, unknown>) ?? {}
  const launch = String(details.launch_date ?? '')
  const bestTime = String(details.optimal_post_time ?? '')

  const patchDetails = (key: string, value: string) =>
    onPatch({ details: { ...details, [key]: value || undefined } })

  return (
    <div className="rounded-xl border border-secondary bg-primary p-3.5 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <EditableText
            value={asset.asset_name}
            onSave={(v) => onPatch({ asset_name: v })}
            className="paragraph-sm text-primary font-semibold"
          />
        </div>
        <select
          value={asset.asset_type ?? ''}
          onChange={(e) => onPatch({ asset_type: e.target.value || null })}
          className="text-xs border border-tertiary rounded-md px-1.5 py-0.5 bg-secondary-subtle text-tertiary capitalize"
        >
          <option value="">type</option>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button onClick={onDelete} className="p-0.5 text-quaternary hover:text-utility-error-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <EditableTextarea
        value={asset.key_message ?? ''}
        onSave={(v) => onPatch({ key_message: v || null })}
        placeholder="Asset copy…"
        rows={2}
        className="paragraph-xs text-secondary"
      />
      <EditableTextarea
        value={asset.cta ?? ''}
        onSave={(v) => onPatch({ cta: v || null })}
        placeholder="Caption…"
        rows={2}
        className="paragraph-xs text-tertiary"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className={fieldLabel}>Budget</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              key={`${asset.asset_id}-b-${asset.budget ?? ''}`}
              defaultValue={asset.budget ?? ''}
              onBlur={(e) => {
                const v = e.target.value ? parseFloat(e.target.value) : null
                if (v !== asset.budget) {
                  onPatch(v != null && !asset.budget_period ? { budget: v, budget_period: 'monthly' } : { budget: v })
                }
              }}
              placeholder="—"
              className={numCls}
            />
            <select
              value={asset.budget_period ?? 'monthly'}
              onChange={(e) => onPatch({ budget_period: e.target.value })}
              className="shrink-0 px-1 py-1.5 border border-tertiary rounded-md text-xs bg-secondary-subtle text-secondary outline-none"
            >
              <option value="monthly">/mo</option>
              <option value="total">total</option>
            </select>
          </div>
        </div>
        <div>
          <span className={fieldLabel}>Flight</span>
          <div className="space-y-1">
            <input type="date" key={`${asset.asset_id}-sd-${asset.start_date ?? ''}`} defaultValue={asset.start_date ?? ''}
              onChange={(e) => { if (e.target.value !== (asset.start_date ?? '')) onPatch({ start_date: e.target.value || null }) }}
              className={inputCls} />
            <input type="date" key={`${asset.asset_id}-ed-${asset.end_date ?? ''}`} defaultValue={asset.end_date ?? ''}
              onChange={(e) => { if (e.target.value !== (asset.end_date ?? '')) onPatch({ end_date: e.target.value || null }) }}
              className={inputCls} />
          </div>
        </div>
        <div>
          <span className={fieldLabel}>Launch</span>
          <input type="date" defaultValue={launch} onBlur={(e) => patchDetails('launch_date', e.target.value)} className={inputCls} />
        </div>
        <div>
          <span className={fieldLabel}>Best time to post</span>
          <input type="text" defaultValue={bestTime} onBlur={(e) => patchDetails('optimal_post_time', e.target.value)}
            placeholder="e.g. Tuesday 09:30" className={inputCls} />
        </div>
      </div>
    </div>
  )
}
