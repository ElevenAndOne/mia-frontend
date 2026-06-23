import { useNavigate } from 'react-router-dom'
import { EditableText } from '../../../../components/editable-text'
import { StatusBadge } from '../status-badge'
import { ViewSwitcher } from '../view-switcher'
import { CampaignSwitcher } from './campaign-switcher'
import { BudgetReadout } from './budget-readout'
import { useCampaignMutations } from '../../hooks/use-campaign-mutations'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import { channelLabel } from '../../utils/channel-colors'

interface Guide { id: string; filename: string; campaign_name: string | null }
const dateCls = 'paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none cursor-pointer'
const numCls = 'w-20 paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none cw-mono [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden'

export const BuilderHeader = ({ guides, onBuildNew }: { guides: Guide[]; onBuildNew: () => void }) => {
  const { campaign } = useCampaignWorkspace()
  const { patchCampaign, cycleStatus, linkGuide, removeCampaign } = useCampaignMutations()
  const navigate = useNavigate()
  const initials = (campaign.client_name || campaign.campaign_name).slice(0, 2).toUpperCase()

  const onDelete = async () => {
    if (!confirm(`Delete "${campaign.campaign_name}"? This cannot be undone.`)) return
    if (await removeCampaign()) navigate('/campaigns')
  }

  return (
    <div className="bg-secondary rounded-2xl border border-secondary p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#df6a1f] flex items-center justify-center text-xs font-bold text-white shrink-0">{initials}</div>
          <div className="min-w-0">
            <CampaignSwitcher view="builder" onRename={(name) => patchCampaign({ campaign_name: name })} onBuildNew={onBuildNew} />
            <EditableText value={campaign.client_name ?? ''} onSave={(v) => patchCampaign({ client_name: v.trim() || null })} className="paragraph-sm text-tertiary mt-0.5" placeholder="Client name" />
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={cycleStatus} title="Click to change status"><StatusBadge status={campaign.status} pulse /></button>
          <button onClick={onDelete} title="Delete campaign" className="p-1 text-quaternary hover:text-utility-error-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <ViewSwitcher campaignId={campaign.campaign_id} current="builder" />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <input type="date" key={`sd-${campaign.start_date ?? ''}`} defaultValue={campaign.start_date ?? ''} onChange={(e) => { if (e.target.value && e.target.value !== (campaign.start_date ?? '')) patchCampaign({ start_date: e.target.value }) }} className={dateCls} />
            <span className="paragraph-xs text-quaternary">→</span>
            <input type="date" key={`ed-${campaign.end_date ?? ''}`} defaultValue={campaign.end_date ?? ''} onChange={(e) => { if (e.target.value && e.target.value !== (campaign.end_date ?? '')) patchCampaign({ end_date: e.target.value }) }} className={dateCls} />
          </div>
          <div className="flex items-center gap-1">
            <select value={campaign.budget_currency ?? 'ZAR'} onChange={(e) => patchCampaign({ budget_currency: e.target.value })} className="paragraph-xs text-tertiary bg-transparent border-b border-tertiary outline-none cursor-pointer">
              {['ZAR', 'USD', 'GBP', 'EUR'].map((c) => <option key={c}>{c}</option>)}
            </select>
            <span className="paragraph-xs text-quaternary">Monthly:</span>
            <input type="number" key={`bm-${campaign.budget_monthly ?? ''}`} defaultValue={campaign.budget_monthly ?? ''} onBlur={(e) => patchCampaign({ budget_monthly: e.target.value ? Number(e.target.value) : null })} placeholder="—" className={numCls} />
            <span className="paragraph-xs text-quaternary">· Total:</span>
            <input type="number" key={`bt-${campaign.budget_total ?? ''}`} defaultValue={campaign.budget_total ?? ''} onBlur={(e) => patchCampaign({ budget_total: e.target.value ? Number(e.target.value) : null })} placeholder="—" className={numCls} />
          </div>
        </div>
        <BudgetReadout campaign={campaign} />
      </div>

      {campaign.channels && campaign.channels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {campaign.channels.map((ch) => (
            <span key={ch} className="px-2 py-0.5 rounded-full bg-primary border border-secondary label-xs text-secondary">{channelLabel(ch)}</span>
          ))}
        </div>
      )}

      {guides.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="label-xs text-quaternary shrink-0">Campaign guide:</span>
          <select value={campaign.campaign_guide_id ?? ''} onChange={(e) => linkGuide(e.target.value || null)} className="paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none cursor-pointer max-w-[240px]">
            <option value="">— None —</option>
            {guides.map((g) => <option key={g.id} value={g.id}>{g.campaign_name ?? g.filename}</option>)}
          </select>
          {campaign.campaign_guide_id && <span className="label-xs px-1.5 py-0.5 rounded bg-utility-brand-100 text-utility-brand-700 shrink-0">linked</span>}
        </div>
      )}
    </div>
  )
}
