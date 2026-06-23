import { useState } from 'react'
import { EditableTextarea } from '../../../../components/editable-textarea'
import { AssetCard } from './asset-card'
import { AskMiaButton } from '../ask-mia/ask-mia-button'
import { useChannelEditor } from '../../hooks/use-channel-editor'
import { channelLabel } from '../../utils/channel-colors'
import { formatBudget, formatDate } from '../../utils/campaign-dates'
import { channelDisplayBudget } from '../../utils/budget-math'
import type { ChannelAction, LinkedCampaign } from '../../types'

const PICKER_CHANNELS = new Set(['meta_ads', 'google_ads', 'brevo', 'email', 'linkedin_ads', 'hubspot'])
const OSA: Array<{ field: 'objective' | 'strategy' | 'action_notes'; label: string; ask: string; placeholder: string }> = [
  { field: 'objective', label: 'Objective', ask: 'channel objective', placeholder: 'Add objective…' },
  { field: 'strategy', label: 'Strategy', ask: 'channel strategy', placeholder: 'Add strategy…' },
  { field: 'action_notes', label: 'Action', ask: 'channel tactics / action plan', placeholder: 'Add tactical actions, posting schedule, content mix…' },
]
const inputCls = 'w-full px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-secondary-subtle text-secondary outline-none focus:border-utility-brand-400'

interface Props {
  phaseId: string
  phaseName?: string
  action: ChannelAction
  currency: string | null
  onRemove: () => void
  onOpenPicker: (actionId: string, channel: string, current: LinkedCampaign[]) => void
}

export const ChannelActionCard = ({ phaseId, phaseName, action, currency, onRemove, onOpenPicker }: Props) => {
  const [expanded, setExpanded] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const { patchAction, addAsset, patchAsset, deleteAsset } = useChannelEditor(phaseId, action.action_id)

  const label = channelLabel(action.channel)
  const hasPicker = PICKER_CHANNELS.has(action.channel)
  const linked = action.linked_platform_campaigns ?? []
  const budget = channelDisplayBudget(action)

  return (
    <div className="rounded-xl border border-secondary bg-secondary-subtle overflow-hidden">
      <div className="flex items-center">
        {hasPicker && (
          <button
            onClick={() => onOpenPicker(action.action_id, action.channel, linked)}
            className="flex items-center gap-1.5 pl-3 pr-2 py-2.5 shrink-0"
            title="Link platform campaigns for actuals tracking"
          >
            <span className="label-xs text-utility-brand-700 bg-utility-brand-100 px-2 py-0.5 rounded-full">{label}</span>
            <span className={`label-xs font-semibold ${linked.length ? 'text-utility-brand-600' : 'text-utility-brand-500'}`}>
              {linked.length ? `${linked.length} linked` : '+ Link'}
            </span>
          </button>
        )}
        <div className={`flex items-center gap-2 ${hasPicker ? 'pl-0' : 'pl-3'} pr-3 py-2.5 flex-1 cursor-pointer min-w-0`} onClick={() => setExpanded(!expanded)}>
          {!hasPicker && <span className="label-xs text-utility-brand-700 bg-utility-brand-100 px-2 py-0.5 rounded-full shrink-0">{label}</span>}
          {budget.amount != null && (
            <span className="paragraph-xs text-tertiary shrink-0 cw-mono">
              {formatBudget(budget.amount, currency)}{budget.period === 'total' ? ' total' : '/mo'}
            </span>
          )}
          {(action.start_date || action.end_date) && (
            <span className="paragraph-xs text-quaternary shrink-0">{formatDate(action.start_date)} – {formatDate(action.end_date)}</span>
          )}
          {linked.length > 0 && (
            <div className="flex flex-wrap gap-1 max-w-[40%]">
              {linked.slice(0, 2).map((c) => (
                <span key={c.id} className="paragraph-xs text-quaternary bg-tertiary px-1.5 py-0.5 rounded truncate max-w-[120px]" title={c.name}>{c.name}</span>
              ))}
              {linked.length > 2 && <span className="paragraph-xs text-quaternary">+{linked.length - 2}</span>}
            </div>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="p-1 mr-1 text-quaternary hover:text-utility-error-500 shrink-0" title="Remove channel">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="pr-3 py-2.5 cursor-pointer shrink-0" onClick={() => setExpanded(!expanded)}>
          <svg className={`w-3.5 h-3.5 text-quaternary transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-3 border-t border-tertiary">
          {OSA.map(({ field, label: lbl, ask, placeholder }) => (
            <div key={field}>
              <div className="flex items-center justify-between mb-1">
                <p className="label-xs text-quaternary uppercase tracking-wide">{lbl}</p>
                <AskMiaButton context={{ fieldLabel: ask, phaseName, channel: label }} currentValue={action[field] ?? ''} onInsert={(t) => patchAction({ [field]: t })} />
              </div>
              <EditableTextarea value={action[field] ?? ''} onSave={(v) => patchAction({ [field]: v || null })} placeholder={placeholder} rows={field === 'action_notes' ? 3 : 2} className="paragraph-sm text-secondary" />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="label-xs text-quaternary uppercase tracking-wide mb-1">Budget</p>
              {budget.derived ? (
                <div className="px-2 py-1.5 border border-tertiary rounded-lg bg-primary">
                  <span className="text-xs text-secondary font-medium cw-mono">{formatBudget(budget.amount, currency)} {budget.period === 'total' ? 'total' : '/mo'}</span>
                  <p className="paragraph-xs text-quaternary mt-0.5">Sum of {budget.assetCount} asset{budget.assetCount === 1 ? '' : 's'} · edit per asset below</p>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input type="number" key={`${action.action_id}-b-${action.budget ?? ''}`} defaultValue={action.budget ?? ''}
                    onBlur={(e) => { const v = e.target.value ? parseFloat(e.target.value) : null; if (v !== action.budget) patchAction(v != null && !action.budget_period ? { budget: v, budget_period: 'monthly' } : { budget: v }) }}
                    placeholder="Optional" className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden`} />
                  <select value={action.budget_period ?? 'monthly'} onChange={(e) => patchAction({ budget_period: e.target.value })} className="shrink-0 px-1.5 py-1.5 border border-tertiary rounded-lg text-xs bg-secondary-subtle text-secondary outline-none">
                    <option value="monthly">/mo</option>
                    <option value="total">total</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              <p className="label-xs text-quaternary uppercase tracking-wide mb-1">Active dates</p>
              <div className="space-y-1">
                <input type="date" key={`${action.action_id}-sd-${action.start_date ?? ''}`} defaultValue={action.start_date ?? ''}
                  onChange={(e) => { if (e.target.value !== (action.start_date ?? '')) patchAction({ start_date: e.target.value || null }) }} className={inputCls} />
                <input type="date" key={`${action.action_id}-ed-${action.end_date ?? ''}`} defaultValue={action.end_date ?? ''}
                  onChange={(e) => { if (e.target.value !== (action.end_date ?? '')) patchAction({ end_date: e.target.value || null }) }} className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <button onClick={() => setAssetsOpen(!assetsOpen)} className="flex items-center gap-1.5 label-xs text-quaternary uppercase tracking-wide hover:text-secondary w-full text-left">
              <span>Assets ({action.assets.length})</span>
              <svg className={`w-3 h-3 transition-transform ${assetsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {assetsOpen && (
              <div className="mt-2 space-y-2">
                {action.assets.map((asset) => (
                  <AssetCard key={asset.asset_id} asset={asset} channel={label} phaseName={phaseName} onPatch={(f) => patchAsset(asset.asset_id, f)} onDelete={() => deleteAsset(asset.asset_id)} />
                ))}
                <button onClick={addAsset} className="w-full py-2 border border-dashed border-secondary rounded-lg label-xs text-quaternary hover:text-secondary hover:border-tertiary transition-colors">+ Add asset</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
