import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../contexts/session-context'
import { TopBar } from '../../components/top-bar'
import { Spinner } from '../../components/spinner'
import { apiFetch } from '../../utils/api'
import { clearTrackerCache } from '../campaign/services/campaign-tracker-service'
import { usePlugins } from '../plugins/hooks/use-plugins'
import { sendChatMessage } from '../chat/services/chat-service'
import { ChatMarkdown } from '../../components/chat-markdown'

// ── Campaign detail cache ──────────────────────────────────────────────────
const detailCache = new Map<string, CampaignDetail>()
function getCachedDetail(id: string) { return detailCache.get(id) }
function setCachedDetail(id: string, d: CampaignDetail) { detailCache.set(id, d) }
function bustCachedDetail(id: string) {
  detailCache.delete(id)
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith('campaigns_detail_')) sessionStorage.removeItem(k)
    }
  } catch { /* ignore */ }
}

// ── Types ──────────────────────────────────────────────────────────────────

interface KPI {
  kpi_id: number
  kpi_name: string
  target_value: string | null
  target_numeric: number | null
  unit: string | null
  hubspot_list_name?: string | null
  sort_order?: number
}

interface Asset {
  asset_id: string
  asset_name: string
  asset_type: string | null
  key_message: string | null
  cta: string | null
  details: Record<string, unknown> | null
  sort_order: number
}

interface ChannelAction {
  action_id: string
  channel: string
  objective: string | null
  strategy: string | null
  action_notes: string | null
  budget: number | null
  budget_period: string | null
  start_date: string | null
  end_date: string | null
  assets: Asset[]
}

interface Phase {
  phase_id: string
  phase_name: string
  sort_order: number
  objective: string | null
  strategy: string | null
  start_date: string | null
  end_date: string | null
  kpis: KPI[]
  channel_actions: ChannelAction[]
}

interface CampaignDetail {
  campaign_id: string
  campaign_name: string
  client_name: string | null
  status: string
  is_primary: boolean
  start_date: string | null
  end_date: string | null
  budget_total: number | null
  budget_monthly: number | null
  budget_currency: string | null
  channels: string[] | null
  utm_campaign: string | null
  platform_filter: string | null
  google_ads_filter: string | null
  meta_filter: string | null
  brevo_filter: string | null
  clickup_list_id: string | null
  objectives: string[]
  phases: Phase[]
}

interface CampaignSummary {
  campaign_id: string
  campaign_name: string
  client_name: string | null
  status: string
  is_primary: boolean
  channels: string[] | null
  budget_total: number | null
  budget_currency: string | null
  start_date: string | null
  end_date: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  ga4: 'Google Analytics 4',
  organic_social: 'Organic Social',
  facebook_organic: 'Facebook Organic',
  linkedin_ads: 'LinkedIn Ads',
  linkedin_organic: 'LinkedIn Organic',
  tiktok_ads: 'TikTok Ads',
  email: 'Email',
  hubspot: 'HubSpot',
  brevo: 'Brevo',
  mailchimp: 'Mailchimp',
  seo: 'SEO',
  display: 'Display',
  airtable: 'Airtable',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatBudget(amount: number | null, currency: string | null): string {
  if (!amount) return '—'
  const symbol = currency === 'ZAR' ? 'R' : (currency || '')
  return `${symbol}${amount.toLocaleString()}`
}

function getDefaultPhaseIndex(campaign: CampaignDetail): number {
  const today = new Date()
  const phases = [...campaign.phases].sort((a, b) => a.sort_order - b.sort_order)
  for (let i = 0; i < phases.length; i++) {
    const { start_date, end_date } = phases[i]
    if (start_date && end_date) {
      if (today >= new Date(start_date) && today <= new Date(end_date)) return i
    }
  }
  return 0
}

// ── Inline edit primitives ─────────────────────────────────────────────────

function EditableText({
  value, onSave, className = '', placeholder = 'Click to edit',
}: {
  value: string; onSave: (v: string) => void; className?: string; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) { setDraft(value); setTimeout(() => { ref.current?.focus(); ref.current?.select() }, 0) }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => { setEditing(false); if (draft.trim() !== value) onSave(draft.trim()) }

  if (editing) {
    return (
      <input
        ref={ref} value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className={`border-b border-utility-brand-400 outline-none bg-transparent w-full ${className}`}
      />
    )
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:opacity-70 ${!value ? 'text-quaternary italic' : ''} ${className}`}
    >
      {value || placeholder}
    </span>
  )
}

function EditableTextarea({
  value, onSave, className = '', placeholder = 'Click to add text', rows = 3,
}: {
  value: string; onSave: (v: string) => void; className?: string; placeholder?: string; rows?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) { setDraft(value); setTimeout(() => ref.current?.focus(), 0) }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => { setEditing(false); if (draft !== value) onSave(draft) }

  if (editing) {
    return (
      <textarea
        ref={ref} value={draft} rows={rows}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setDraft(value) } }}
        className={`w-full border border-utility-brand-300 rounded-lg outline-none bg-primary px-2 py-1.5 resize-y ${className}`}
      />
    )
  }
  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:opacity-70 whitespace-pre-wrap ${!value ? 'text-quaternary italic' : ''} ${className}`}
    >
      {value || placeholder}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    live: { label: 'Live', className: 'bg-utility-success-100 text-utility-success-700 border border-utility-success-200' },
    draft: { label: 'Draft', className: 'bg-secondary text-tertiary border border-tertiary' },
    paused: { label: 'Paused', className: 'bg-utility-warning-100 text-utility-warning-700 border border-utility-warning-200' },
    completed: { label: 'Completed', className: 'bg-utility-info-100 text-utility-info-700 border border-utility-info-200' },
  }
  const config = configs[status] ?? configs.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full label-xs ${config.className}`}>
      {config.label}
    </span>
  )
}

function PhaseTabs({ phases, selectedId, onSelect }: { phases: Phase[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex rounded-xl border border-tertiary overflow-hidden">
      {phases.map((phase) => {
        const isSelected = phase.phase_id === selectedId
        return (
          <button
            key={phase.phase_id}
            onClick={() => onSelect(phase.phase_id)}
            className={`flex-1 py-2.5 px-1 text-center transition-colors border-b-2 ${isSelected ? 'border-utility-brand-500 bg-secondary' : 'border-transparent hover:bg-secondary'}`}
          >
            <span className={`paragraph-xs font-medium ${isSelected ? 'text-primary' : 'text-tertiary'}`}>
              {phase.phase_name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ChannelActionCard({
  action, campaignId, tenantId, sessionId, onUpdate, onDelete,
}: {
  action: ChannelAction
  campaignId: string
  tenantId: string
  sessionId: string
  onUpdate: (updated: ChannelAction) => void
  onDelete: (actionId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [assetsExpanded, setAssetsExpanded] = useState(false)

  const patch = async (fields: Record<string, unknown>) => {
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/channel_actions/${action.action_id}`, {
      method: 'PATCH',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) onUpdate({ ...action, ...fields } as ChannelAction)
  }

  const patchAsset = async (assetId: string, fields: Record<string, unknown>) => {
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      onUpdate({ ...action, assets: action.assets.map((a) => a.asset_id === assetId ? { ...a, ...fields } as Asset : a) })
    }
  }

  const deleteAsset = async (assetId: string) => {
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/assets/${assetId}`, {
      method: 'DELETE', headers: { 'X-Session-ID': sessionId },
    })
    if (res.ok) onUpdate({ ...action, assets: action.assets.filter((a) => a.asset_id !== assetId) })
  }

  const addAsset = async () => {
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/channel_actions/${action.action_id}/assets`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_name: 'New asset', asset_type: 'static' }),
    })
    if (res.ok) {
      const d = await res.json()
      onUpdate({
        ...action,
        assets: [...action.assets, { asset_id: d.asset_id, asset_name: d.asset_name, asset_type: 'static', key_message: null, cta: null, details: {}, sort_order: action.assets.length }],
      })
      setAssetsExpanded(true)
    }
  }

  const label = PLATFORM_LABELS[action.channel] ?? action.channel

  return (
    <div className="rounded-lg border border-tertiary overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="label-xs text-utility-brand-700 bg-utility-brand-100 px-2 py-0.5 rounded-full shrink-0">{label}</span>
        {action.budget != null && (
          <span className="paragraph-xs text-tertiary shrink-0">
            {formatBudget(action.budget, 'R')}{action.budget_period === 'monthly' ? '/mo' : ' total'}
          </span>
        )}
        {(action.start_date || action.end_date) && (
          <span className="paragraph-xs text-tertiary shrink-0">
            {formatDate(action.start_date)} – {formatDate(action.end_date)}
          </span>
        )}
        <div className="flex-1" />
        <svg className={`w-3.5 h-3.5 text-quaternary transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="p-3 space-y-3 border-t border-tertiary" onClick={(e) => e.stopPropagation()}>
          {/* OSA sections */}
          {(['objective', 'strategy', 'action_notes'] as const).map((field) => {
            const labels: Record<string, string> = { objective: 'Objective', strategy: 'Strategy', action_notes: 'Action' }
            const placeholders: Record<string, string> = {
              objective: 'Add objective...',
              strategy: 'Add strategy...',
              action_notes: 'Add tactical actions, posting schedule, content mix...',
            }
            return (
              <div key={field}>
                <p className="label-xs text-quaternary uppercase tracking-wide mb-1">{labels[field]}</p>
                <EditableTextarea
                  value={action[field] ?? ''}
                  onSave={(v) => patch({ [field]: v || null })}
                  placeholder={placeholders[field]}
                  rows={field === 'action_notes' ? 3 : 2}
                  className="paragraph-sm text-secondary"
                />
              </div>
            )
          })}

          {/* Budget + dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="label-xs text-quaternary uppercase tracking-wide mb-1">Budget</p>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  key={action.action_id + '-budget'}
                  defaultValue={action.budget ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value ? parseFloat(e.target.value) : null
                    if (v !== action.budget) patch({ budget: v })
                  }}
                  placeholder="Optional"
                  className="w-full px-2 py-1 border border-tertiary rounded text-xs bg-primary text-secondary outline-none focus:border-utility-brand-400"
                />
                <select
                  value={action.budget_period ?? 'monthly'}
                  onChange={(e) => patch({ budget_period: e.target.value })}
                  className="shrink-0 px-1.5 py-1 border border-tertiary rounded text-xs bg-primary text-secondary outline-none"
                >
                  <option value="monthly">/mo</option>
                  <option value="total">total</option>
                </select>
              </div>
            </div>
            <div>
              <p className="label-xs text-quaternary uppercase tracking-wide mb-1">Active dates</p>
              <div className="space-y-1">
                <input
                  type="date" key={action.action_id + '-sd'}
                  defaultValue={action.start_date ?? ''}
                  onBlur={(e) => { if (e.target.value !== (action.start_date ?? '')) patch({ start_date: e.target.value || null }) }}
                  className="w-full px-2 py-1 border border-tertiary rounded text-xs bg-primary text-secondary outline-none focus:border-utility-brand-400"
                />
                <input
                  type="date" key={action.action_id + '-ed'}
                  defaultValue={action.end_date ?? ''}
                  onBlur={(e) => { if (e.target.value !== (action.end_date ?? '')) patch({ end_date: e.target.value || null }) }}
                  className="w-full px-2 py-1 border border-tertiary rounded text-xs bg-primary text-secondary outline-none focus:border-utility-brand-400"
                />
              </div>
            </div>
          </div>

          {/* Assets */}
          <div>
            <button
              onClick={() => setAssetsExpanded(!assetsExpanded)}
              className="flex items-center gap-1.5 label-xs text-quaternary uppercase tracking-wide hover:text-secondary w-full text-left"
            >
              <span>Assets ({action.assets.length})</span>
              <svg className={`w-3 h-3 transition-transform ${assetsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {assetsExpanded && (
              <div className="mt-2 space-y-2">
                {action.assets.map((asset) => (
                  <div key={asset.asset_id} className="rounded-lg border border-tertiary p-2.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <EditableText
                          value={asset.asset_name}
                          onSave={(v) => patchAsset(asset.asset_id, { asset_name: v })}
                          className="paragraph-sm text-primary font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={asset.asset_type ?? ''}
                          onChange={(e) => patchAsset(asset.asset_id, { asset_type: e.target.value || null })}
                          className="text-xs border border-tertiary rounded px-1.5 py-0.5 bg-primary text-tertiary"
                        >
                          <option value="">type</option>
                          {['static','carousel','reel','animation','email','search_ad','post_series','video'].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button onClick={() => deleteAsset(asset.asset_id)} className="p-0.5 text-quaternary hover:text-utility-error-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <EditableTextarea
                      value={asset.key_message ?? ''}
                      onSave={(v) => patchAsset(asset.asset_id, { key_message: v || null })}
                      placeholder="Key message..."
                      rows={2}
                      className="paragraph-xs text-secondary"
                    />
                    <EditableText
                      value={asset.cta ?? ''}
                      onSave={(v) => patchAsset(asset.asset_id, { cta: v || null })}
                      placeholder="CTA..."
                      className="paragraph-xs text-tertiary"
                    />
                    {typeof (asset.details as Record<string, unknown>)?.launch_date === 'string' && (
                      <div className="flex items-center gap-1.5">
                        <span className="label-xs text-quaternary">Launch:</span>
                        <input
                          type="date"
                          defaultValue={String((asset.details as Record<string, unknown>).launch_date ?? '')}
                          onBlur={(e) => patchAsset(asset.asset_id, { details: { ...(asset.details ?? {}), launch_date: e.target.value || undefined } })}
                          className="text-xs border border-tertiary rounded px-1.5 py-0.5 bg-primary text-secondary"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={addAsset}
                  className="w-full py-1.5 border border-dashed border-tertiary rounded-lg label-xs text-quaternary hover:text-secondary hover:border-secondary transition-colors"
                >
                  + Add asset
                </button>
              </div>
            )}
          </div>

          {/* Delete channel */}
          <div className="flex justify-end pt-1 border-t border-tertiary">
            <button
              onClick={() => onDelete(action.action_id)}
              className="label-xs text-quaternary hover:text-utility-error-500 transition-colors"
            >
              Remove channel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PhaseDetail({
  phase, campaignId, tenantId, sessionId,
  hubspotLists, hubspotListsMessage, savingKpiId,
  onLinkHubspotList, onPhaseUpdate,
}: {
  phase: Phase
  campaignId: string
  tenantId: string
  sessionId: string
  hubspotLists: { list_id: number; name: string; size: number }[]
  hubspotListsMessage: string | null
  savingKpiId: number | null
  onLinkHubspotList: (kpiId: number, listName: string | null) => void
  onPhaseUpdate: (updated: Phase) => void
}) {
  const [addingKpi, setAddingKpi] = useState(false)
  const [newKpiName, setNewKpiName] = useState('')
  const [newKpiTarget, setNewKpiTarget] = useState('')
  const [addingChannel, setAddingChannel] = useState(false)
  const [newChannel, setNewChannel] = useState('')

  const phaseHasHubspot = phase.channel_actions.some((ca) => ca.channel === 'hubspot')

  const patchPhase = async (fields: Partial<Phase>) => {
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/phases/${phase.phase_id}`, {
      method: 'PATCH',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) onPhaseUpdate({ ...phase, ...fields })
  }

  const patchKpi = async (kpiId: number, fields: Partial<KPI>) => {
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/kpis/${kpiId}`, {
      method: 'PATCH',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) onPhaseUpdate({ ...phase, kpis: phase.kpis.map((k) => k.kpi_id === kpiId ? { ...k, ...fields } : k) })
  }

  const deleteKpi = async (kpiId: number) => {
    if (!confirm('Delete this KPI?')) return
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/kpis/${kpiId}`, {
      method: 'DELETE', headers: { 'X-Session-ID': sessionId },
    })
    if (res.ok) onPhaseUpdate({ ...phase, kpis: phase.kpis.filter((k) => k.kpi_id !== kpiId) })
  }

  const addKpi = async () => {
    if (!newKpiName.trim()) return
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/phases/${phase.phase_id}/kpis`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kpi_name: newKpiName.trim(), target_value: newKpiTarget.trim() || undefined }),
    })
    if (res.ok) {
      const d = await res.json()
      onPhaseUpdate({
        ...phase,
        kpis: [...phase.kpis, { kpi_id: d.kpi_id, kpi_name: d.kpi_name, target_value: newKpiTarget.trim() || null, target_numeric: null, unit: null }],
      })
      setNewKpiName(''); setNewKpiTarget(''); setAddingKpi(false)
    }
  }

  const addChannel = async () => {
    if (!newChannel) return
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/phases/${phase.phase_id}/channel_actions`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: newChannel }),
    })
    if (res.ok) {
      const d = await res.json()
      onPhaseUpdate({
        ...phase,
        channel_actions: [...phase.channel_actions, { action_id: d.action_id, channel: d.channel, objective: null, strategy: null, action_notes: null, budget: null, budget_period: null, start_date: null, end_date: null, assets: [] }],
      })
      setNewChannel(''); setAddingChannel(false)
    }
  }

  const handleActionUpdate = (updated: ChannelAction) => {
    onPhaseUpdate({ ...phase, channel_actions: phase.channel_actions.map((ca) => ca.action_id === updated.action_id ? updated : ca) })
  }

  const handleActionDelete = async (actionId: string) => {
    if (!confirm('Remove this channel?')) return
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/channel_actions/${actionId}`, {
      method: 'DELETE', headers: { 'X-Session-ID': sessionId },
    })
    if (res.ok) onPhaseUpdate({ ...phase, channel_actions: phase.channel_actions.filter((ca) => ca.action_id !== actionId) })
  }

  return (
    <div className="bg-secondary rounded-xl border border-tertiary p-4 space-y-4">
      {/* Phase objective + strategy */}
      <div className="space-y-3">
        <h3 className="label-md text-primary">{phase.phase_name} Phase</h3>
        <div>
          <p className="label-xs text-quaternary uppercase tracking-wide mb-1">Objective</p>
          <EditableTextarea value={phase.objective ?? ''} onSave={(v) => patchPhase({ objective: v || null })} placeholder="Add phase objective..." rows={2} className="paragraph-sm text-secondary" />
        </div>
        <div>
          <p className="label-xs text-quaternary uppercase tracking-wide mb-1">Strategy</p>
          <EditableTextarea value={phase.strategy ?? ''} onSave={(v) => patchPhase({ strategy: v || null })} placeholder="Add phase strategy..." rows={2} className="paragraph-sm text-secondary" />
        </div>
      </div>

      {phaseHasHubspot && hubspotLists.length === 0 && hubspotListsMessage && (
        <p className="paragraph-xs text-quaternary italic">{hubspotListsMessage}</p>
      )}

      {/* KPIs */}
      <div>
        <p className="label-xs text-quaternary uppercase tracking-wide mb-2">KPI Targets</p>
        {phase.kpis.length > 0 && (
          <div className="rounded-lg border border-tertiary overflow-hidden mb-2">
            {phase.kpis.map((kpi, i) => {
              const isTotalKpi = kpi.kpi_name.toLowerCase().startsWith('total')
              const showHubspotLink = phaseHasHubspot && hubspotLists.length > 0 && !isTotalKpi
              return (
                <div key={kpi.kpi_id} className={`px-3 py-2.5 space-y-1.5 ${i < phase.kpis.length - 1 ? 'border-b border-tertiary' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <EditableText value={kpi.kpi_name} onSave={(v) => patchKpi(kpi.kpi_id, { kpi_name: v })} className="paragraph-sm text-secondary" />
                    </div>
                    <EditableText value={kpi.target_value ?? '—'} onSave={(v) => patchKpi(kpi.kpi_id, { target_value: v })} className="label-sm text-primary font-medium shrink-0" />
                    <button onClick={() => deleteKpi(kpi.kpi_id)} className="p-0.5 text-quaternary hover:text-utility-error-500 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {showHubspotLink && (
                    <div className="flex items-center gap-2">
                      <select
                        value={kpi.hubspot_list_name ?? ''}
                        disabled={savingKpiId === kpi.kpi_id}
                        onChange={(e) => onLinkHubspotList(kpi.kpi_id, e.target.value || null)}
                        className="flex-1 text-xs rounded border border-tertiary bg-primary text-tertiary px-2 py-1 focus:outline-none focus:border-utility-brand-400 disabled:opacity-50"
                      >
                        <option value="">— Link HubSpot list —</option>
                        {hubspotLists.map((lst) => (
                          <option key={lst.list_id} value={lst.name}>{lst.name} ({lst.size.toLocaleString()})</option>
                        ))}
                      </select>
                      {kpi.hubspot_list_name && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-utility-success-100 text-utility-success-700 label-xs">linked</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {addingKpi ? (
          <div className="flex items-center gap-2">
            <input value={newKpiName} onChange={(e) => setNewKpiName(e.target.value)} placeholder="KPI name" autoFocus
              className="flex-1 px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-primary text-secondary outline-none focus:border-utility-brand-400" />
            <input value={newKpiTarget} onChange={(e) => setNewKpiTarget(e.target.value)} placeholder="Target"
              className="w-24 px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-primary text-secondary outline-none focus:border-utility-brand-400" />
            <button onClick={addKpi} className="label-xs text-utility-brand-600 hover:text-utility-brand-700 shrink-0">Add</button>
            <button onClick={() => { setAddingKpi(false); setNewKpiName(''); setNewKpiTarget('') }} className="label-xs text-quaternary shrink-0">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAddingKpi(true)} className="label-xs text-quaternary hover:text-secondary">+ Add KPI</button>
        )}
      </div>

      {/* Channel actions */}
      <div>
        <p className="label-xs text-quaternary uppercase tracking-wide mb-2">
          Channels ({phase.channel_actions.length})
        </p>
        <div className="space-y-2">
          {phase.channel_actions.map((ca) => (
            <ChannelActionCard
              key={ca.action_id}
              action={ca}
              campaignId={campaignId}
              tenantId={tenantId}
              sessionId={sessionId}
              onUpdate={handleActionUpdate}
              onDelete={handleActionDelete}
            />
          ))}
        </div>
        {addingChannel ? (
          <div className="flex items-center gap-2 mt-2">
            <select value={newChannel} onChange={(e) => setNewChannel(e.target.value)} autoFocus
              className="flex-1 px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-primary text-secondary outline-none">
              <option value="">Select channel...</option>
              {Object.entries(PLATFORM_LABELS).filter(([k]) => !['ga4','airtable'].includes(k)).map(([key, lbl]) => (
                <option key={key} value={key}>{lbl}</option>
              ))}
            </select>
            <button onClick={addChannel} className="label-xs text-utility-brand-600 hover:text-utility-brand-700 shrink-0">Add</button>
            <button onClick={() => { setAddingChannel(false); setNewChannel('') }} className="label-xs text-quaternary shrink-0">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAddingChannel(true)} className="mt-2 label-xs text-quaternary hover:text-secondary">+ Add channel</button>
        )}
      </div>
    </div>
  )
}

// ── Main View ──────────────────────────────────────────────────────────────

interface CampaignsViewProps { onBack: () => void }

export function CampaignsView({ onBack }: CampaignsViewProps) {
  const { sessionId, activeWorkspace, user } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const { isEnabled: isPluginEnabled } = usePlugins()

  // Inline chat (empty state)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [campaignList, setCampaignList] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingPrimary, setSettingPrimary] = useState(false)
  const [deletingCampaign, setDeletingCampaign] = useState(false)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Objectives editing
  const [editingObjectives, setEditingObjectives] = useState(false)
  const [draftObjectives, setDraftObjectives] = useState<string[]>([])

  // HubSpot
  const [hubspotLists, setHubspotLists] = useState<{ list_id: number; name: string; size: number }[]>([])
  const [hubspotListsMessage, setHubspotListsMessage] = useState<string | null>(null)
  const [savingKpiId, setSavingKpiId] = useState<number | null>(null)

  // ClickUp
  const [showClickUpModal, setShowClickUpModal] = useState(false)
  const [pushingToClickUp, setPushingToClickUp] = useState(false)
  const [clickUpResult, setClickUpResult] = useState<{ action: string; tasks_created?: number; comments_posted?: number; tasks?: { task_id?: string; task_url?: string }[] } | null>(null)
  const [clickUpError, setClickUpError] = useState('')
  const [cuSpaces, setCuSpaces] = useState<{ id: string; name: string }[]>([])
  const [cuFolders, setCuFolders] = useState<{ id: string; name: string }[]>([])
  const [cuLists, setCuLists] = useState<{ id: string; name: string }[]>([])
  const [cuSpaceId, setCuSpaceId] = useState('')
  const [cuFolderId, setCuFolderId] = useState('')
  const [cuListId, setCuListId] = useState('')
  const [cuLoadingSpaces, setCuLoadingSpaces] = useState(false)
  const [cuLoadingFolders, setCuLoadingFolders] = useState(false)
  const [cuLoadingLists, setCuLoadingLists] = useState(false)

  // Close campaign dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const loadCampaignDetail = useCallback(async (campaignId: string, opts?: { bust?: boolean }) => {
    if (!sessionId || !tenantId) return
    if (!opts?.bust) {
      const cached = getCachedDetail(campaignId)
      if (cached) {
        setCampaign(cached)
        const sorted = [...cached.phases].sort((a, b) => a.sort_order - b.sort_order)
        setSelectedPhaseId(sorted[getDefaultPhaseIndex(cached)]?.phase_id ?? null)
        return
      }
    }
    setDetailLoading(true)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}`, { headers: { 'X-Session-ID': sessionId } })
      if (!res.ok) throw new Error('Failed to load campaign detail')
      const detail: CampaignDetail = await res.json()
      setCachedDetail(campaignId, detail)
      setCampaign(detail)
      const sorted = [...detail.phases].sort((a, b) => a.sort_order - b.sort_order)
      setSelectedPhaseId(sorted[getDefaultPhaseIndex(detail)]?.phase_id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setDetailLoading(false)
    }
  }, [sessionId, tenantId])

  useEffect(() => {
    if (!tenantId || !sessionId) return
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const listRes = await apiFetch(`/api/tenants/${tenantId}/campaigns/`, { headers: { 'X-Session-ID': sessionId } })
        if (!listRes.ok) throw new Error('Failed to load campaigns')
        const list: CampaignSummary[] = await listRes.json()
        setCampaignList(list)
        const active = list.find((c) => c.is_primary) ?? list.find((c) => c.status === 'live') ?? list[0] ?? null
        if (!active) { setCampaign(null); return }
        await loadCampaignDetail(active.campaign_id)
        apiFetch(`/api/tenants/${tenantId}/campaigns/hubspot-lists`, { headers: { 'X-Session-ID': sessionId } })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.lists?.length) { setHubspotLists(data.lists); setHubspotListsMessage(null) }
            else setHubspotListsMessage(data?.message ?? 'HubSpot not connected')
          })
          .catch(() => setHubspotListsMessage('Could not load HubSpot lists'))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId, sessionId, loadCampaignDetail])

  const handleSwitchCampaign = async (campaignId: string) => {
    if (!campaign || campaignId === campaign.campaign_id) return
    setDropdownOpen(false)
    await loadCampaignDetail(campaignId)
  }

  const handlePatchCampaign = useCallback(async (fields: Record<string, unknown>) => {
    if (!sessionId || !tenantId || !campaign) return
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaign.campaign_id}`, {
      method: 'PUT',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      const updated = { ...campaign, ...fields } as CampaignDetail
      setCampaign(updated)
      setCachedDetail(campaign.campaign_id, updated)
      clearTrackerCache()
      if ('status' in fields || 'is_primary' in fields || 'campaign_name' in fields) {
        setCampaignList((prev) => prev.map((c) => c.campaign_id === campaign.campaign_id ? { ...c, ...fields } as CampaignSummary : c))
      }
    }
  }, [sessionId, tenantId, campaign])

  const handlePhaseUpdate = useCallback((updatedPhase: Phase) => {
    setCampaign((prev) => {
      if (!prev) return prev
      const updated = { ...prev, phases: prev.phases.map((p) => p.phase_id === updatedPhase.phase_id ? updatedPhase : p) }
      setCachedDetail(prev.campaign_id, updated)
      return updated
    })
  }, [])

  const handleSetPrimary = async () => {
    if (!sessionId || !tenantId || !campaign || settingPrimary) return
    setSettingPrimary(true)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaign.campaign_id}/set-primary`, {
        method: 'PATCH', headers: { 'X-Session-ID': sessionId },
      })
      if (res.ok) {
        setCampaign((prev) => prev ? { ...prev, is_primary: true } : prev)
        setCampaignList((prev) => prev.map((c) => ({ ...c, is_primary: c.campaign_id === campaign.campaign_id })))
        campaignList.forEach((c) => bustCachedDetail(c.campaign_id))
        clearTrackerCache()
      }
    } finally { setSettingPrimary(false) }
  }

  const handleDeleteCampaign = async () => {
    if (!sessionId || !tenantId || !campaign || deletingCampaign) return
    if (!confirm(`Delete "${campaign.campaign_name}"? This cannot be undone.`)) return
    setDeletingCampaign(true)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaign.campaign_id}`, {
        method: 'DELETE', headers: { 'X-Session-ID': sessionId },
      })
      if (res.ok) {
        bustCachedDetail(campaign.campaign_id)
        clearTrackerCache()
        const remaining = campaignList.filter((c) => c.campaign_id !== campaign.campaign_id)
        setCampaignList(remaining)
        if (remaining.length > 0) await loadCampaignDetail(remaining[0].campaign_id)
        else setCampaign(null)
      }
    } finally { setDeletingCampaign(false) }
  }

  const handleLinkHubspotList = async (kpiId: number, listName: string | null) => {
    if (!sessionId || !tenantId || !campaign) return
    setSavingKpiId(kpiId)
    try {
      const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaign.campaign_id}/kpis/${kpiId}`, {
        method: 'PATCH',
        headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubspot_list_name: listName }),
      })
      if (res.ok) {
        setCampaign((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            phases: prev.phases.map((ph) => ({
              ...ph,
              kpis: ph.kpis.map((k) => k.kpi_id === kpiId ? { ...k, hubspot_list_name: listName } : k),
            })),
          }
        })
        bustCachedDetail(campaign.campaign_id)
      }
    } finally { setSavingKpiId(null) }
  }

  const handleSaveObjectives = async () => {
    if (!sessionId || !tenantId || !campaign) return
    const filtered = draftObjectives.filter((o) => o.trim())
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaign.campaign_id}/objectives`, {
      method: 'PUT',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectives: filtered }),
    })
    if (res.ok) {
      const updated = { ...campaign, objectives: filtered }
      setCampaign(updated)
      setCachedDetail(campaign.campaign_id, updated)
      setEditingObjectives(false)
    }
  }

  const handleChatSend = useCallback(async (message?: string) => {
    const text = (message ?? chatInput).trim()
    if (!text || chatLoading || !sessionId) return
    setChatInput('')
    const userMsg = { role: 'user' as const, content: text }
    setChatMessages((prev) => [...prev, userMsg])
    setChatLoading(true)
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    try {
      const history = [...chatMessages, userMsg]
      const result = await sendChatMessage({
        message: text,
        session_id: sessionId,
        user_id: user?.google_user_id ?? '',
        date_range: '30_days',
        conversation_history: history.slice(-10),
      })
      const reply = result.claude_response ?? 'Something went wrong. Try again.'
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      // After Mia responds, poll to see if a campaign was just saved
      if (tenantId) {
        setTimeout(async () => {
          const r = await apiFetch(`/api/tenants/${tenantId}/campaigns/`, { headers: { 'X-Session-ID': sessionId } })
          if (r.ok) {
            const list = await r.json()
            if (list.length > 0) {
              setCampaignList(list)
              await loadCampaignDetail(list[0].campaign_id)
            }
          }
        }, 1000)
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading, chatMessages, sessionId, tenantId, user])

  // ClickUp helpers
  const invokeClickUp = async (action: string, data: Record<string, string> = {}) => {
    const res = await apiFetch(`/api/tenants/${tenantId}/plugins/clickup/invoke/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId! },
      body: JSON.stringify({ data }),
    })
    if (!res.ok) { const err = await res.json(); throw new Error(err.detail || `ClickUp ${action} failed`) }
    const body = await res.json(); return body.result
  }

  const loadClickUpSpaces = async () => {
    setCuLoadingSpaces(true); setClickUpError('')
    try {
      const result = await invokeClickUp('list_spaces')
      setCuSpaces((result.spaces ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })))
    } catch (err) { setClickUpError(err instanceof Error ? err.message : 'Failed to load spaces') }
    finally { setCuLoadingSpaces(false) }
  }

  const onCuSpaceChange = async (spaceId: string) => {
    setCuSpaceId(spaceId); setCuFolderId(''); setCuListId(''); setCuFolders([]); setCuLists([])
    if (!spaceId) return
    setCuLoadingFolders(true); setClickUpError('')
    try {
      const result = await invokeClickUp('list_folders', { space_id: spaceId })
      setCuFolders((result.folders ?? []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })))
    } catch (err) { setClickUpError(err instanceof Error ? err.message : 'Failed to load folders') }
    finally { setCuLoadingFolders(false) }
  }

  const onCuFolderChange = async (folderId: string) => {
    setCuFolderId(folderId); setCuListId(''); setCuLists([])
    if (!folderId) return
    setCuLoadingLists(true); setClickUpError('')
    try {
      const result = await invokeClickUp('list_folder_lists', { folder_id: folderId })
      setCuLists((result.lists ?? []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })))
    } catch (err) { setClickUpError(err instanceof Error ? err.message : 'Failed to load lists') }
    finally { setCuLoadingLists(false) }
  }

  const handleClickUpPush = async () => {
    if (!sessionId || !tenantId || !campaign) return
    const listId = cuListId || campaign.clickup_list_id || ''
    if (!listId) { setClickUpError('Please select a list first'); return }
    setPushingToClickUp(true); setClickUpError(''); setClickUpResult(null)
    try {
      const result = await invokeClickUp('push_campaign_summary', { campaign_id: campaign.campaign_id, list_id: listId })
      setClickUpResult(result)
    } catch (err) { setClickUpError(err instanceof Error ? err.message : 'Push to ClickUp failed') }
    finally { setPushingToClickUp(false) }
  }

  const sortedPhases = campaign ? [...campaign.phases].sort((a, b) => a.sort_order - b.sort_order) : []
  const selectedPhase = sortedPhases.find((p) => p.phase_id === selectedPhaseId) ?? sortedPhases[0] ?? null
  const currentIsPrimary = campaign
    ? (campaignList.find((c) => c.campaign_id === campaign.campaign_id)?.is_primary ?? campaign.is_primary)
    : false

  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden relative">
      <TopBar title="Campaigns" onBack={onBack} />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-5">
        {(loading || detailLoading) && (
          <div className="flex items-center justify-center py-20"><Spinner size="md" /></div>
        )}

        {!loading && error && (
          <div className="bg-utility-error-50 border border-utility-error-200 rounded-xl p-4">
            <p className="paragraph-sm text-utility-error-700">{error}</p>
          </div>
        )}

        {/* Empty state — inline Mia chat */}
        {!loading && !detailLoading && !error && !campaign && (
          <div className="flex flex-col h-full min-h-0">
            {/* Intro */}
            {chatMessages.length === 0 && (
              <div className="text-center pt-12 pb-6 px-6">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
                  </svg>
                </div>
                <p className="label-md text-primary mb-1">No campaigns yet</p>
                <p className="paragraph-sm text-tertiary mb-6">Ask Mia to build your first RACE campaign template.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['Build a campaign for Dutoit Shallots', 'Build a campaign for Onvlee', 'Build a new RACE template'].map((s) => (
                    <button key={s} onClick={() => handleChatSend(s)}
                      className="px-3 py-1.5 border border-primary rounded-full paragraph-sm text-secondary hover:bg-secondary transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {chatMessages.length > 0 && (
              <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-3">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl paragraph-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-brand-solid text-primary-onbrand'
                        : 'bg-secondary text-primary border border-tertiary'
                    }`}>
                      {m.role === 'user'
                        ? <span className="whitespace-pre-wrap">{m.content}</span>
                        : <ChatMarkdown content={m.content} />
                      }
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary border border-tertiary rounded-2xl px-4 py-3 flex gap-1">
                      <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* Input */}
            <div className="shrink-0 p-4 border-t border-tertiary bg-primary">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                  placeholder="Ask Mia to build a campaign for..."
                  className="flex-1 px-4 py-3 border border-primary rounded-full paragraph-sm focus:outline-none focus:ring-2 focus:ring-utility-info-500 focus:border-transparent bg-primary text-primary"
                  disabled={chatLoading}
                />
                <button
                  onClick={() => handleChatSend()}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-5 py-3 bg-brand-solid text-primary-onbrand rounded-full subheading-md hover:bg-brand-solid-hover transition-colors disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !detailLoading && !error && campaign && (
          <>
            {/* Draft banner */}
            {campaign.status === 'draft' && (
              <div className="bg-utility-warning-50 border border-utility-warning-200 rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-utility-warning-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="paragraph-sm text-utility-warning-700">This campaign is a DRAFT — activate it to start tracking actuals.</p>
                </div>
                <button
                  onClick={() => handlePatchCampaign({ status: 'live' })}
                  className="shrink-0 px-3 py-1.5 bg-utility-warning-600 text-white rounded-lg label-sm hover:bg-utility-warning-700 transition-colors"
                >
                  Set to Live
                </button>
              </div>
            )}

            {/* Campaign header card */}
            <div className="bg-secondary rounded-xl border border-tertiary p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                {/* Title + dropdown */}
                <div className="relative min-w-0 flex-1" ref={dropdownRef}>
                  <div className="flex items-center gap-1.5">
                    {currentIsPrimary && (
                      <svg className="w-3.5 h-3.5 text-utility-warning-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    <EditableText
                      value={campaign.campaign_name}
                      onSave={(v) => v.trim() && handlePatchCampaign({ campaign_name: v.trim() })}
                      className="label-md text-primary"
                    />
                    {campaignList.length > 1 && (
                      <button onClick={() => setDropdownOpen(!dropdownOpen)}>
                        <svg className={`w-3.5 h-3.5 text-tertiary shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <EditableText
                    value={campaign.client_name ?? ''}
                    onSave={(v) => handlePatchCampaign({ client_name: v.trim() || null })}
                    className="paragraph-sm text-tertiary mt-0.5"
                    placeholder="Client name"
                  />
                  {/* Dropdown */}
                  {dropdownOpen && campaignList.length > 1 && (
                    <div className="absolute top-full left-0 mt-1.5 bg-primary border border-tertiary rounded-xl shadow-lg z-20 min-w-52 max-w-72 overflow-hidden">
                      {campaignList.map((c) => (
                        <button
                          key={c.campaign_id}
                          onClick={() => handleSwitchCampaign(c.campaign_id)}
                          className={`w-full text-left px-3 py-2.5 paragraph-sm hover:bg-secondary transition-colors ${c.campaign_id === campaign.campaign_id ? 'text-primary font-medium bg-secondary' : 'text-secondary'}`}
                        >
                          {c.is_primary ? '★ ' : ''}{c.campaign_name}
                          {c.status === 'draft' && <span className="ml-1.5 text-quaternary label-xs">draft</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {isPluginEnabled('clickup') && (
                    <button
                      onClick={() => { setClickUpResult(null); setClickUpError(''); setCuSpaces([]); setCuFolders([]); setCuLists([]); setCuSpaceId(''); setCuFolderId(''); setCuListId(''); setShowClickUpModal(true); loadClickUpSpaces() }}
                      title="Push to ClickUp"
                      className="p-1 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M3 14.5L12 4l9 10.5" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 19.5L12 15l5 4.5" stroke="#00C4FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={handleSetPrimary}
                    disabled={settingPrimary || currentIsPrimary}
                    title={currentIsPrimary ? 'Primary campaign' : 'Set as primary'}
                    className="transition-colors disabled:cursor-default"
                  >
                    {currentIsPrimary ? (
                      <svg className="w-4 h-4 text-utility-warning-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-quaternary hover:text-utility-warning-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                  </button>
                  {/* Status — click to cycle */}
                  <button
                    onClick={() => {
                      const next: Record<string, string> = { draft: 'live', live: 'paused', paused: 'live', completed: 'live' }
                      handlePatchCampaign({ status: next[campaign.status] ?? 'live' })
                    }}
                    title="Click to change status"
                  >
                    <StatusBadge status={campaign.status} />
                  </button>
                  <button
                    onClick={handleDeleteCampaign}
                    disabled={deletingCampaign}
                    title="Delete campaign"
                    className="p-1 text-quaternary hover:text-utility-error-500 transition-colors disabled:opacity-40"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Editable dates row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    defaultValue={campaign.start_date ?? ''}
                    onBlur={(e) => e.target.value && handlePatchCampaign({ start_date: e.target.value })}
                    className="paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none cursor-pointer"
                  />
                  <span className="paragraph-xs text-quaternary">→</span>
                  <input
                    type="date"
                    defaultValue={campaign.end_date ?? ''}
                    onBlur={(e) => e.target.value && handlePatchCampaign({ end_date: e.target.value })}
                    className="paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={campaign.budget_currency ?? 'ZAR'}
                    onChange={(e) => handlePatchCampaign({ budget_currency: e.target.value })}
                    className="paragraph-xs text-tertiary bg-transparent border-b border-tertiary outline-none cursor-pointer"
                  >
                    {['ZAR', 'USD', 'GBP', 'EUR'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input
                    type="number"
                    defaultValue={campaign.budget_monthly ?? ''}
                    onBlur={(e) => handlePatchCampaign({ budget_monthly: e.target.value ? Number(e.target.value) : null })}
                    placeholder="monthly"
                    className="w-20 paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none"
                  />
                  <span className="paragraph-xs text-quaternary">/mo ·</span>
                  <input
                    type="number"
                    defaultValue={campaign.budget_total ?? ''}
                    onBlur={(e) => handlePatchCampaign({ budget_total: e.target.value ? Number(e.target.value) : null })}
                    placeholder="total"
                    className="w-20 paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none"
                  />
                  <span className="paragraph-xs text-quaternary">total</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="paragraph-xs text-quaternary">Filter:</span>
                  <EditableText
                    value={campaign.platform_filter ?? ''}
                    onSave={(v) => handlePatchCampaign({ platform_filter: v.trim() || null })}
                    className="paragraph-xs text-tertiary"
                    placeholder="not set"
                  />
                </div>
              </div>

              {campaign.channels && campaign.channels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {campaign.channels.map((ch) => (
                    <span key={ch} className="px-2 py-0.5 rounded-full bg-primary border border-tertiary label-xs text-secondary">
                      {PLATFORM_LABELS[ch] ?? ch}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Objectives */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="label-xs text-quaternary uppercase tracking-wide">Objectives</p>
                {!editingObjectives && (
                  <button
                    onClick={() => { setDraftObjectives([...campaign.objectives, '']); setEditingObjectives(true) }}
                    className="label-xs text-quaternary hover:text-secondary"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingObjectives ? (
                <div className="space-y-2">
                  {draftObjectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <input
                        value={obj}
                        onChange={(e) => setDraftObjectives((prev) => prev.map((o, j) => j === i ? e.target.value : o))}
                        placeholder={i === draftObjectives.length - 1 ? '+ Add objective' : 'Objective'}
                        className="flex-1 px-2 py-1.5 border border-tertiary rounded-lg paragraph-sm bg-primary text-secondary outline-none focus:border-utility-brand-400"
                        onFocus={() => { if (i === draftObjectives.length - 1) setDraftObjectives((p) => [...p, '']) }}
                      />
                      {obj.trim() && (
                        <button onClick={() => setDraftObjectives((p) => p.filter((_, j) => j !== i))} className="mt-2 text-quaternary hover:text-utility-error-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveObjectives} className="px-3 py-1.5 bg-brand-solid text-primary-onbrand rounded-lg label-sm hover:bg-brand-solid-hover">Save</button>
                    <button onClick={() => setEditingObjectives(false)} className="px-3 py-1.5 border border-tertiary rounded-lg label-sm text-secondary hover:bg-secondary">Cancel</button>
                  </div>
                </div>
              ) : campaign.objectives.length > 0 ? (
                <ul className="space-y-1.5">
                  {campaign.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-utility-brand-500 shrink-0" />
                      <span className="paragraph-sm text-secondary">{obj}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <button onClick={() => { setDraftObjectives(['']); setEditingObjectives(true) }} className="paragraph-sm text-quaternary italic hover:text-secondary">
                  + Add objectives
                </button>
              )}
            </div>

            {/* Phase tabs + detail */}
            {sortedPhases.length > 0 && selectedPhaseId && (
              <div className="space-y-3">
                <p className="label-xs text-quaternary uppercase tracking-wide">Campaign Phases</p>
                <PhaseTabs phases={sortedPhases} selectedId={selectedPhaseId} onSelect={setSelectedPhaseId} />
                {selectedPhase && tenantId && sessionId && (
                  <PhaseDetail
                    phase={selectedPhase}
                    campaignId={campaign.campaign_id}
                    tenantId={tenantId}
                    sessionId={sessionId}
                    hubspotLists={hubspotLists}
                    hubspotListsMessage={hubspotListsMessage}
                    savingKpiId={savingKpiId}
                    onLinkHubspotList={handleLinkHubspotList}
                    onPhaseUpdate={handlePhaseUpdate}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ClickUp Push Modal — unchanged */}
      {showClickUpModal && campaign && (
        <div className="fixed inset-0 bg-overlay/40 flex items-center justify-center z-50 px-4">
          <div className="bg-primary rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#7B68EE]/10 shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path d="M3 14.5L12 4l9 10.5" stroke="#7B68EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 19.5L12 15l5 4.5" stroke="#00C4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="title-h6 text-primary">Push to ClickUp</h2>
              </div>
              <p className="paragraph-sm text-tertiary">
                {clickUpResult
                  ? clickUpResult.action === 'tasks_created'
                    ? `${clickUpResult.tasks_created} tasks created in ClickUp — one per channel action.`
                    : `${clickUpResult.comments_posted} tasks updated with a new comment.`
                  : `Push channel actions for "${campaign.campaign_name}" to ClickUp as tasks.`}
              </p>
            </div>
            {clickUpResult && (
              <div className="mb-4 bg-success-primary border border-utility-success-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-success shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="subheading-md text-success">
                    {clickUpResult.action === 'tasks_created'
                      ? `${clickUpResult.tasks_created} task${(clickUpResult.tasks_created ?? 0) !== 1 ? 's' : ''} created`
                      : `${clickUpResult.comments_posted} task${(clickUpResult.comments_posted ?? 0) !== 1 ? 's' : ''} updated`}
                  </p>
                </div>
                {clickUpResult.tasks?.[0]?.task_url && (
                  <a href={clickUpResult.tasks[0].task_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 paragraph-xs text-utility-success-700 hover:underline">
                    Open first task in ClickUp
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            )}
            {!clickUpResult && (
              <>
                <div className="mb-3">
                  <label className="block subheading-md text-secondary mb-1">Space</label>
                  <select value={cuSpaceId} onChange={(e) => onCuSpaceChange(e.target.value)} disabled={cuLoadingSpaces || pushingToClickUp} className="w-full px-4 py-3 border border-primary rounded-lg paragraph-sm bg-primary text-primary">
                    <option value="">{cuLoadingSpaces ? 'Loading spaces…' : cuSpaces.length === 0 ? 'No spaces found' : 'Select a space'}</option>
                    {cuSpaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {cuSpaceId && (
                  <div className="mb-3">
                    <label className="block subheading-md text-secondary mb-1">Folder</label>
                    <select value={cuFolderId} onChange={(e) => onCuFolderChange(e.target.value)} disabled={cuLoadingFolders || pushingToClickUp} className="w-full px-4 py-3 border border-primary rounded-lg paragraph-sm bg-primary text-primary">
                      <option value="">{cuLoadingFolders ? 'Loading folders…' : cuFolders.length === 0 ? 'No folders found' : 'Select a folder'}</option>
                      {cuFolders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                )}
                {cuFolderId && (
                  <div className="mb-4">
                    <label className="block subheading-md text-secondary mb-1">List</label>
                    <select value={cuListId} onChange={(e) => setCuListId(e.target.value)} disabled={cuLoadingLists || pushingToClickUp} className="w-full px-4 py-3 border border-primary rounded-lg paragraph-sm bg-primary text-primary">
                      <option value="">{cuLoadingLists ? 'Loading lists…' : cuLists.length === 0 ? 'No lists found' : 'Select a list'}</option>
                      {cuLists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}
                {clickUpError && <p className="mb-3 paragraph-xs text-error">{clickUpError}</p>}
              </>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowClickUpModal(false); setClickUpResult(null); setClickUpError('') }} disabled={pushingToClickUp} className="flex-1 px-4 py-3 border border-primary rounded-lg subheading-md text-secondary hover:bg-secondary disabled:opacity-50">
                {clickUpResult ? 'Close' : 'Cancel'}
              </button>
              {!clickUpResult && (
                <button onClick={handleClickUpPush} disabled={pushingToClickUp || (!cuListId && !campaign?.clickup_list_id)} className="flex-1 px-4 py-3 bg-[#7B68EE] text-white rounded-lg subheading-md hover:bg-[#6A58DD] disabled:opacity-50 disabled:cursor-not-allowed">
                  {pushingToClickUp ? 'Pushing…' : 'Push to ClickUp'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
