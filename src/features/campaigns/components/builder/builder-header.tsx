import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../../../utils/api'
import { StatusBadge } from '../status-badge'
import { ViewSwitcher } from '../view-switcher'
import { ClickUpActions } from '../clickup/clickup-actions'
import { CampaignSwitcher } from './campaign-switcher'
import { BudgetReadout } from './budget-readout'
import { useCampaignMutations } from '../../hooks/use-campaign-mutations'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import { channelLabel } from '../../utils/channel-colors'
import { formatBudget, formatShortDate } from '../../utils/campaign-dates'

interface Guide { id: string; filename: string; campaign_name: string | null }
const dateCls = 'paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none cursor-pointer'
const numCls = 'w-20 paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none cw-mono [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden'

interface GA4Option { property_id: string; display_name: string }

export const BuilderHeader = ({ guides, onBuildNew }: { guides: Guide[]; onBuildNew: () => void }) => {
  const { campaign, sessionId } = useCampaignWorkspace()
  const { patchCampaign, cycleStatus, linkGuide, removeCampaign } = useCampaignMutations()
  const navigate = useNavigate()

  // Per-campaign GA4 override — Website-visits KPIs read this property instead of
  // the workspace primary (multi-brand clients whose campaigns land on different
  // sites). Options load lazily on first hover/focus: /api/accounts/available does
  // real platform discovery, too heavy to call on every builder open.
  const [ga4Options, setGa4Options] = useState<GA4Option[] | null>(null)
  const [ga4Loading, setGa4Loading] = useState(false)
  const loadGa4Options = async () => {
    if (ga4Options || ga4Loading) return
    setGa4Loading(true)
    try {
      const res = await apiFetch('/api/accounts/available', { headers: { 'X-Session-ID': sessionId } })
      const data = await res.json()
      const props: GA4Option[] = (data.ga4_properties ?? []).sort((a: GA4Option, b: GA4Option) =>
        a.display_name.localeCompare(b.display_name),
      )
      setGa4Options(props)
    } catch {
      setGa4Options([]) // keeps the current value + default usable
    } finally {
      setGa4Loading(false)
    }
  }
  const setGa4Override = (propertyId: string) => {
    const id = propertyId || null
    const name = id ? (ga4Options?.find((p) => p.property_id === id)?.display_name ?? null) : null
    patchCampaign({ ga4_property_id: id, ga4_property_name: name })
  }
  const initials = (campaign.client_name || campaign.campaign_name).slice(0, 2).toUpperCase()
  const total = formatBudget(campaign.budget_total, campaign.budget_currency)

  const onDelete = async () => {
    if (!confirm(`Delete "${campaign.campaign_name}"? This cannot be undone.`)) return
    if (await removeCampaign()) navigate('/campaigns')
  }

  return (
    <div className="space-y-4">
      {/* Nav card — same compact shape as the Overview / Calendar header */}
      <div className="bg-secondary rounded-2xl border border-secondary p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#df6a1f] flex items-center justify-center text-xs font-bold text-white shrink-0">{initials}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <CampaignSwitcher view="builder" onRename={(name) => patchCampaign({ campaign_name: name })} onBuildNew={onBuildNew} />
                <button onClick={cycleStatus} title="Click to change status" className="shrink-0">
                  <StatusBadge status={campaign.status} pulse />
                </button>
              </div>
              <div className="paragraph-xs text-tertiary mt-0.5 truncate">
                {[campaign.client_name, `${formatShortDate(campaign.start_date)} → ${formatShortDate(campaign.end_date)}`, total !== '—' ? `${total} total` : null]
                  .filter(Boolean)
                  .join('  ·  ')}
              </div>
            </div>
          </div>
          <ViewSwitcher campaignId={campaign.campaign_id} current="builder" />
        </div>
      </div>

      {/* Controls card — status / dates / budget / channels / guide */}
      <div className="bg-secondary rounded-2xl border border-secondary p-4 sm:p-5 space-y-4">
      <div className="flex items-center flex-wrap gap-3">
        <ClickUpActions />
        <button onClick={onDelete} title="Delete campaign" className="p-1 text-quaternary hover:text-utility-error-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
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

      <div className="flex items-center gap-2" onPointerEnter={loadGa4Options}>
        <span className="label-xs text-quaternary shrink-0">GA4 property (website visits):</span>
        <select
          value={campaign.ga4_property_id ?? ''}
          onFocus={loadGa4Options}
          onChange={(e) => setGa4Override(e.target.value)}
          className="paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none cursor-pointer max-w-[260px]"
        >
          <option value="">Workspace default</option>
          {/* keep the stored override selectable before (or if) the option list loads */}
          {campaign.ga4_property_id && !ga4Options?.some((p) => p.property_id === campaign.ga4_property_id) && (
            <option value={campaign.ga4_property_id}>
              {campaign.ga4_property_name ?? campaign.ga4_property_id}
            </option>
          )}
          {ga4Options?.map((p) => (
            <option key={p.property_id} value={p.property_id}>
              {/* Google allows several properties with identical names (e.g. two
                  "Remax Bay - GA4") — show the ID when the name alone is ambiguous */}
              {ga4Options.filter((o) => o.display_name === p.display_name).length > 1
                ? `${p.display_name} · ${p.property_id}`
                : p.display_name}
            </option>
          ))}
        </select>
        {ga4Loading && <span className="label-xs text-quaternary shrink-0">loading properties…</span>}
        {campaign.ga4_property_id && (
          <span className="label-xs px-1.5 py-0.5 rounded bg-utility-brand-100 text-utility-brand-700 shrink-0">override</span>
        )}
      </div>

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
    </div>
  )
}
