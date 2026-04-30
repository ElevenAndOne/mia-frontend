import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../contexts/session-context'
import { TopBar } from '../../components/top-bar'
import { Spinner } from '../../components/spinner'
import { apiFetch } from '../../utils/api'
import { clearTrackerCache } from '../campaign/services/campaign-tracker-service'

// ── Campaign detail cache (module-level + sessionStorage, 23h TTL) ─────────
// Keyed by campaignId so multiple campaigns can be cached per tenant.
const CACHE_TTL_MS = 23 * 60 * 60 * 1000
const SS_KEY_PREFIX = 'campaigns_detail_'
interface CachedDetail {
  data: CampaignDetail
  ts: number
}
const detailCache = new Map<string, CachedDetail>()

function getCachedDetail(campaignId: string): CampaignDetail | undefined {
  const key = SS_KEY_PREFIX + campaignId
  const mem = detailCache.get(campaignId)
  if (mem && Date.now() - mem.ts < CACHE_TTL_MS) return mem.data
  try {
    const raw = sessionStorage.getItem(key)
    if (raw) {
      const entry: CachedDetail = JSON.parse(raw)
      if (Date.now() - entry.ts < CACHE_TTL_MS) {
        detailCache.set(campaignId, entry)
        return entry.data
      }
    }
  } catch {
    /* ignore */
  }
  return undefined
}

function setCachedDetail(campaignId: string, data: CampaignDetail) {
  const entry: CachedDetail = { data, ts: Date.now() }
  detailCache.set(campaignId, entry)
  try {
    sessionStorage.setItem(SS_KEY_PREFIX + campaignId, JSON.stringify(entry))
  } catch {
    /* ignore */
  }
}

function bustCachedDetail(campaignId: string) {
  detailCache.delete(campaignId)
  try { sessionStorage.removeItem(SS_KEY_PREFIX + campaignId) } catch { /* ignore */ }
}

// ── Types ──────────────────────────────────────────────────────────────────

interface KPI {
  kpi_id?: number
  kpi_name: string
  target_value: string | null
  target_numeric: number | null
  unit: string | null
  hubspot_list_name?: string | null
}

interface ChannelAction {
  action_id: string
  channel: string
  objective: string | null
  strategy: string | null
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
  airtable: 'Airtable',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatBudget(amount: number | null, currency: string | null): string {
  if (!amount) return '—'
  const symbol = currency === 'ZAR' ? 'R' : currency || ''
  return `${symbol}${amount.toLocaleString()}`
}

/** Returns index of best default phase to show — prefers explicit date match, else first. */
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

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    live: {
      label: 'Live',
      className:
        'bg-utility-success-100 text-utility-success-700 border border-utility-success-200',
    },
    draft: { label: 'Draft', className: 'bg-secondary text-tertiary border border-tertiary' },
    paused: {
      label: 'Paused',
      className:
        'bg-utility-warning-100 text-utility-warning-700 border border-utility-warning-200',
    },
    completed: {
      label: 'Completed',
      className: 'bg-utility-info-100 text-utility-info-700 border border-utility-info-200',
    },
  }
  const config = configs[status] ?? configs.draft
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full label-xs ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function PhaseTabs({
  phases,
  selectedId,
  onSelect,
}: {
  phases: Phase[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex rounded-xl border border-tertiary overflow-hidden">
      {phases.map((phase) => {
        const isSelected = phase.phase_id === selectedId
        return (
          <button
            key={phase.phase_id}
            onClick={() => onSelect(phase.phase_id)}
            className={`flex-1 py-2.5 px-1 text-center transition-colors border-b-2 ${
              isSelected
                ? 'border-utility-brand-500 bg-secondary'
                : 'border-transparent hover:bg-secondary'
            }`}
          >
            <span
              className={`paragraph-xs font-medium ${isSelected ? 'text-primary' : 'text-tertiary'}`}
            >
              {phase.phase_name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PhaseDetail({
  phase,
  hubspotLists,
  hubspotListsMessage,
  savingKpiId,
  onLinkHubspotList,
}: {
  phase: Phase
  hubspotLists: { list_id: number; name: string; size: number }[]
  hubspotListsMessage: string | null
  savingKpiId: number | null
  onLinkHubspotList: (kpiId: number, listName: string | null) => void
}) {
  const [channelsExpanded, setChannelsExpanded] = useState(false)

  // Only show HubSpot list linking if this phase has hubspot as a channel
  const phaseHasHubspot = phase.channel_actions.some((ca) => ca.channel === 'hubspot')

  return (
    <div className="bg-secondary rounded-xl border border-tertiary p-4 space-y-4">
      {/* Phase header */}
      <div>
        <h3 className="label-md text-primary">{phase.phase_name} Phase</h3>
        {phase.objective && <p className="paragraph-sm text-secondary mt-0.5">{phase.objective}</p>}
      </div>

      {/* HubSpot not connected notice */}
      {phaseHasHubspot && hubspotLists.length === 0 && hubspotListsMessage && (
        <p className="paragraph-xs text-quaternary italic">{hubspotListsMessage}</p>
      )}

      {/* KPIs */}
      {phase.kpis.length > 0 && (
        <div>
          <p className="label-xs text-quaternary uppercase tracking-wide mb-2">KPI Targets</p>
          <div className="rounded-lg border border-tertiary overflow-hidden">
            {phase.kpis.map((kpi, i) => {
              // "Total leads" is computed as the sum of other lists — no dropdown needed
              const isTotalKpi = kpi.kpi_name.toLowerCase().startsWith('total')
              const showHubspotLink =
                phaseHasHubspot &&
                hubspotLists.length > 0 &&
                kpi.kpi_id !== undefined &&
                !isTotalKpi
              return (
                <div
                  key={kpi.kpi_id ?? i}
                  className={`px-3 py-2.5 space-y-1.5 ${
                    i < phase.kpis.length - 1 ? 'border-b border-tertiary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="paragraph-sm text-secondary">{kpi.kpi_name}</span>
                    <span className="label-sm text-primary font-medium shrink-0">{kpi.target_value ?? '—'}</span>
                  </div>
                  {showHubspotLink && (
                    <div className="flex items-center gap-2">
                      <select
                        value={kpi.hubspot_list_name ?? ''}
                        disabled={savingKpiId === kpi.kpi_id}
                        onChange={(e) => onLinkHubspotList(kpi.kpi_id!, e.target.value || null)}
                        className="flex-1 text-xs rounded border border-tertiary bg-primary text-tertiary px-2 py-1 focus:outline-none focus:border-utility-brand-400 disabled:opacity-50"
                      >
                        <option value="">— Link HubSpot list —</option>
                        {hubspotLists.map((lst) => (
                          <option key={lst.list_id} value={lst.name}>
                            {lst.name} ({lst.size.toLocaleString()})
                          </option>
                        ))}
                      </select>
                      {kpi.hubspot_list_name && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-utility-success-100 text-utility-success-700 label-xs">
                          linked
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Channel strategies */}
      {phase.channel_actions.length > 0 && (
        <div>
          <button
            onClick={() => setChannelsExpanded(!channelsExpanded)}
            className="flex items-center gap-2 label-xs text-quaternary uppercase tracking-wide hover:text-secondary transition-colors w-full text-left"
          >
            <span>Channel Focus ({phase.channel_actions.length})</span>
            <svg
              className={`w-3 h-3 transition-transform ${channelsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {channelsExpanded && (
            <div className="mt-2 space-y-2">
              {phase.channel_actions.map((ca) => (
                <div key={ca.action_id} className="rounded-lg border border-tertiary p-3">
                  <span className="label-xs text-utility-brand-700 bg-utility-brand-100 px-2 py-0.5 rounded-full">
                    {PLATFORM_LABELS[ca.channel] ?? ca.channel}
                  </span>
                  {ca.strategy && (
                    <p className="paragraph-xs text-tertiary mt-2 line-clamp-3">{ca.strategy}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main View ──────────────────────────────────────────────────────────────

interface CampaignsViewProps {
  onBack: () => void
}

export function CampaignsView({ onBack }: CampaignsViewProps) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [campaignList, setCampaignList] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingPrimary, setSettingPrimary] = useState(false)
  const [deletingCampaign, setDeletingCampaign] = useState(false)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)

  // HubSpot list state for KPI linking
  const [hubspotLists, setHubspotLists] = useState<{ list_id: number; name: string; size: number }[]>([])
  const [hubspotListsMessage, setHubspotListsMessage] = useState<string | null>(null)
  const [savingKpiId, setSavingKpiId] = useState<number | null>(null)

  const loadCampaignDetail = useCallback(async (
    campaignId: string,
    opts?: { bust?: boolean }
  ) => {
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
      const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}`, {
        headers: { 'X-Session-ID': sessionId },
      })
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
      setLoading(true)
      setError(null)
      try {
        const listRes = await apiFetch(`/api/tenants/${tenantId}/campaigns/`, {
          headers: { 'X-Session-ID': sessionId },
        })
        if (!listRes.ok) throw new Error('Failed to load campaigns')
        const list: CampaignSummary[] = await listRes.json()
        setCampaignList(list)

        const active =
          list.find((c) => c.is_primary) ??
          list.find((c) => c.status === 'live') ??
          list[0] ??
          null
        if (!active) {
          setCampaign(null)
          return
        }

        await loadCampaignDetail(active.campaign_id)

        // Fetch HubSpot lists in background
        apiFetch(`/api/tenants/${tenantId}/campaigns/hubspot-lists`, {
          headers: { 'X-Session-ID': sessionId },
        })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.lists?.length) {
              setHubspotLists(data.lists)
              setHubspotListsMessage(null)
            } else {
              setHubspotListsMessage(data?.message ?? 'HubSpot not connected')
            }
          })
          .catch(() => { setHubspotListsMessage('Could not load HubSpot lists') })
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
    await loadCampaignDetail(campaignId)
  }

  const handleSetPrimary = async () => {
    if (!sessionId || !tenantId || !campaign || settingPrimary) return
    setSettingPrimary(true)
    try {
      const res = await apiFetch(
        `/api/tenants/${tenantId}/campaigns/${campaign.campaign_id}/set-primary`,
        { method: 'PATCH', headers: { 'X-Session-ID': sessionId } }
      )
      if (res.ok) {
        setCampaign((prev) => prev ? { ...prev, is_primary: true } : prev)
        setCampaignList((prev) =>
          prev.map((c) => ({ ...c, is_primary: c.campaign_id === campaign.campaign_id }))
        )
        bustCachedDetail(campaign.campaign_id)
        clearTrackerCache()
      }
    } finally {
      setSettingPrimary(false)
    }
  }

  const handleDeleteCampaign = async () => {
    if (!sessionId || !tenantId || !campaign || deletingCampaign) return
    if (!confirm(`Delete "${campaign.campaign_name}"? This cannot be undone.`)) return
    setDeletingCampaign(true)
    try {
      const res = await apiFetch(
        `/api/tenants/${tenantId}/campaigns/${campaign.campaign_id}`,
        { method: 'DELETE', headers: { 'X-Session-ID': sessionId } }
      )
      if (res.ok) {
        bustCachedDetail(campaign.campaign_id)
        clearTrackerCache()
        const remaining = campaignList.filter((c) => c.campaign_id !== campaign.campaign_id)
        setCampaignList(remaining)
        if (remaining.length > 0) {
          await loadCampaignDetail(remaining[0].campaign_id)
        } else {
          setCampaign(null)
        }
      }
    } finally {
      setDeletingCampaign(false)
    }
  }

  const handleLinkHubspotList = async (kpiId: number, listName: string | null) => {
    if (!sessionId || !tenantId || !campaign) return
    setSavingKpiId(kpiId)
    try {
      const res = await apiFetch(
        `/api/tenants/${tenantId}/campaigns/${campaign.campaign_id}/kpis/${kpiId}`,
        {
          method: 'PATCH',
          headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
          body: JSON.stringify({ hubspot_list_name: listName }),
        }
      )
      if (res.ok) {
        setCampaign((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            phases: prev.phases.map((ph) => ({
              ...ph,
              kpis: ph.kpis.map((k) =>
                k.kpi_id === kpiId ? { ...k, hubspot_list_name: listName } : k
              ),
            })),
          }
        })
        bustCachedDetail(campaign.campaign_id)
      }
    } finally {
      setSavingKpiId(null)
    }
  }

  const sortedPhases = campaign
    ? [...campaign.phases].sort((a, b) => a.sort_order - b.sort_order)
    : []
  const selectedPhase =
    sortedPhases.find((p) => p.phase_id === selectedPhaseId) ?? sortedPhases[0] ?? null

  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar title="Campaigns" onBack={onBack} />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-5">
        {(loading || detailLoading) && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-utility-error-50 border border-utility-error-200 rounded-xl p-4">
            <p className="paragraph-sm text-utility-error-700">{error}</p>
          </div>
        )}

        {!loading && !detailLoading && !error && !campaign && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-quaternary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01"
                />
              </svg>
            </div>
            <p className="label-md text-primary mb-1">No active campaign</p>
            <p className="paragraph-sm text-tertiary mb-4">
              Upload a campaign brief to get started.
            </p>
            <a
              href="https://intent.miacreate.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover transition-colors"
            >
              Upload Campaign Brief →
            </a>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 border border-primary rounded-lg subheading-md text-secondary hover:bg-secondary transition-colors"
            >
              Refresh
            </button>
          </div>
        )}

        {!loading && !detailLoading && !error && campaign && (
          <>
            {/* Campaign header card */}
            <div className="bg-secondary rounded-xl border border-tertiary p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {campaignList.length > 1 ? (
                    <select
                      value={campaign.campaign_id}
                      onChange={(e) => handleSwitchCampaign(e.target.value)}
                      disabled={detailLoading}
                      className="w-full label-md text-primary bg-transparent border-none outline-none cursor-pointer truncate disabled:opacity-60 -ml-0.5 pr-6"
                      style={{ appearance: 'auto' }}
                    >
                      {campaignList.map((c) => (
                        <option key={c.campaign_id} value={c.campaign_id}>
                          {c.is_primary ? '★ ' : ''}{c.campaign_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <h2 className="label-md text-primary truncate">{campaign.campaign_name}</h2>
                  )}
                  {campaign.client_name && (
                    <p className="paragraph-sm text-tertiary">{campaign.client_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Set-primary star */}
                  <button
                    onClick={handleSetPrimary}
                    disabled={settingPrimary || campaign.is_primary}
                    title={campaign.is_primary ? 'Primary campaign' : 'Set as primary'}
                    className="transition-colors disabled:cursor-default"
                  >
                    {campaign.is_primary ? (
                      <svg className="w-4 h-4 text-utility-warning-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-quaternary hover:text-utility-warning-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                  </button>
                  <StatusBadge status={campaign.status} />
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

              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="paragraph-xs text-tertiary">
                  {formatDate(campaign.start_date)} – {formatDate(campaign.end_date)}
                </span>
                {campaign.budget_total && (
                  <span className="paragraph-xs text-tertiary">
                    {formatBudget(campaign.budget_total, campaign.budget_currency)} total
                    {campaign.budget_monthly
                      ? ` · ${formatBudget(campaign.budget_monthly, campaign.budget_currency)}/mo`
                      : ''}
                  </span>
                )}
              </div>

              {campaign.channels && campaign.channels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {campaign.channels.map((ch) => (
                    <span
                      key={ch}
                      className="px-2 py-0.5 rounded-full bg-primary border border-tertiary label-xs text-secondary"
                    >
                      {PLATFORM_LABELS[ch] ?? ch}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Objectives */}
            {campaign.objectives.length > 0 && (
              <div>
                <p className="label-xs text-quaternary uppercase tracking-wide mb-2">Objectives</p>
                <ul className="space-y-1.5">
                  {campaign.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-utility-brand-500 shrink-0" />
                      <span className="paragraph-sm text-secondary">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Phase tabs + detail */}
            {sortedPhases.length > 0 && selectedPhaseId && (
              <div className="space-y-3">
                <p className="label-xs text-quaternary uppercase tracking-wide">Campaign Phases</p>
                <PhaseTabs
                  phases={sortedPhases}
                  selectedId={selectedPhaseId}
                  onSelect={setSelectedPhaseId}
                />
                {selectedPhase && (
                  <PhaseDetail
                    phase={selectedPhase}
                    hubspotLists={hubspotLists}
                    hubspotListsMessage={hubspotListsMessage}
                    savingKpiId={savingKpiId}
                    onLinkHubspotList={handleLinkHubspotList}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
