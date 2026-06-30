import { useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { fetchMetaPreview, type MetaPreview, type PendingAction } from '../services/chat-service'
import { CampaignActionEditor } from './campaign-action-editor'

interface ActionConfirmCardProps {
  action: PendingAction
  status: 'pending' | 'confirmed' | 'running' | 'completed' | 'failed'
  result?: Record<string, unknown>
  onConfirm: (overrideParams?: Record<string, unknown>) => void
  onCancel: () => void
}

const platformIcons: Record<string, string> = {
  brevo: '/icons/brevo.jpeg',
  hubspot: '/icons/hubspot.svg',
  linkedin: '/icons/linkedin.svg',
  meta: '/icons/meta-color.svg',
  google: '/icons/google-ads.svg',
  smartlead: '/icons/smartlead.svg',
  campaign: '/icons/settings.svg',
}

const CHANNEL_LABELS: Record<string, string> = {
  organic_social: 'Organic Social',
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  linkedin_ads: 'LinkedIn Ads',
  email: 'Email',
  website: 'Website',
  offline_event: 'Offline Event',
  packaging: 'Packaging',
  point_of_sale: 'Point of Sale',
  printing: 'Printing',
}

function CampaignActionPreview({ params }: { params: Record<string, unknown> }) {
  const phaseName = params.phase_name as string | undefined
  const channelActions = (params.channel_actions as Array<Record<string, unknown>>) || []

  const items = channelActions.map((ca) => {
    const channel = ca.channel as string
    const budget = ca.budget as number | undefined
    const budgetPeriod = (ca.budget_period as string | undefined) || 'total'
    const startDate = ca.start_date as string | undefined
    const endDate = ca.end_date as string | undefined
    const assets = ((ca.assets as Array<Record<string, unknown>>) || []).map((a) => ({
      name: a.asset_name as string,
      type: a.asset_type as string | undefined,
      launchDate: (a.details as Record<string, string> | undefined)?.launch_date,
      bestTime: (a.details as Record<string, string> | undefined)?.optimal_post_time,
    }))
    return { channel, budget, budgetPeriod, startDate, endDate, assets }
  })

  return (
    <div className="bg-primary/50 rounded-lg p-3 mb-3 space-y-2">
      {phaseName && (
        <div className="flex items-center gap-1.5">
          <span className="label-xs text-quaternary">Phase:</span>
          <span className="label-xs text-secondary font-semibold">{phaseName}</span>
        </div>
      )}
      {items.length > 0 && (
        <div className="space-y-2">
          <span className="label-xs text-quaternary">Adding to campaign:</span>
          {items.map((item, i) => (
            <div key={i} className="flex flex-col gap-0.5 pl-2 border-l-2 border-tertiary">
              <span className="paragraph-xs text-primary font-medium">
                {i + 1}. {item.assets[0]?.name || CHANNEL_LABELS[item.channel] || item.channel}
                {item.assets[0]?.type && (
                  <span className="text-quaternary font-normal"> ({item.assets[0].type})</span>
                )}
              </span>
              <span className="label-xs text-quaternary">
                {CHANNEL_LABELS[item.channel] || item.channel}
              </span>
              {/* Paid channel: budget + flight dates */}
              {(item.budget || item.startDate) && (
                <div className="flex gap-3">
                  {item.budget && (
                    <span className="label-xs text-tertiary">
                      Budget: R{item.budget.toLocaleString()} ({item.budgetPeriod})
                    </span>
                  )}
                  {item.startDate && item.endDate && (
                    <span className="label-xs text-tertiary">
                      {item.startDate} → {item.endDate}
                    </span>
                  )}
                </div>
              )}
              {/* Organic post: launch date + best time */}
              {item.assets[0]?.launchDate && (
                <div className="flex gap-3">
                  <span className="label-xs text-tertiary">Launch: {item.assets[0].launchDate}</span>
                  {item.assets[0].bestTime && (
                    <span className="label-xs text-tertiary">
                      Best time: {item.assets[0].bestTime}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function fmtMoney(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null
  return `R${v.toLocaleString()}`
}

/**
 * Before→after diff for a proposed Meta write. Fetches live current state from
 * /api/actions/meta/preview and shows only the fields that change. Best-effort:
 * if the preview isn't available it renders nothing (the text summary stays).
 */
function MetaActionPreview({ action }: { action: PendingAction }) {
  const { sessionId } = useSession()
  const [preview, setPreview] = useState<MetaPreview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!sessionId) {
      setLoading(false)
      return
    }
    fetchMetaPreview(sessionId, action)
      .then((p) => active && setPreview(p))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [sessionId, action])

  if (loading) {
    return (
      <div className="bg-primary/50 rounded-lg p-3 mb-3 flex items-center gap-2 text-quaternary">
        <div className="w-3 h-3 border-2 border-quaternary border-t-transparent rounded-full animate-spin" />
        <span className="label-xs">Checking current state…</span>
      </div>
    )
  }

  if (!preview?.available || !preview.before || !preview.after) return null

  const { before, after } = preview
  const rows: Array<{ label: string; from: string; to: string }> = []
  if (before.status !== after.status && (before.status || after.status)) {
    rows.push({ label: 'Status', from: before.status || '—', to: after.status || '—' })
  }
  if (before.daily_budget !== after.daily_budget) {
    rows.push({
      label: 'Daily budget',
      from: fmtMoney(before.daily_budget) || '—',
      to: fmtMoney(after.daily_budget) || '—',
    })
  }
  if (before.lifetime_budget !== after.lifetime_budget) {
    rows.push({
      label: 'Lifetime budget',
      from: fmtMoney(before.lifetime_budget) || '—',
      to: fmtMoney(after.lifetime_budget) || '—',
    })
  }
  if (before.name !== after.name && (before.name || after.name)) {
    rows.push({ label: 'Name', from: before.name || '—', to: after.name || '—' })
  }
  if (before.start_time !== after.start_time && (before.start_time || after.start_time)) {
    rows.push({ label: 'Start', from: before.start_time || '—', to: after.start_time || '—' })
  }
  if (before.end_time !== after.end_time && (before.end_time || after.end_time)) {
    rows.push({ label: 'End', from: before.end_time || '—', to: after.end_time || '—' })
  }

  return (
    <div className="bg-primary/50 rounded-lg p-3 mb-3 space-y-1.5">
      {(after.name || before.name) && (
        <div className="paragraph-xs text-primary font-medium truncate">
          {before.name || after.name}
          {preview.level && <span className="text-quaternary font-normal"> ({preview.level})</span>}
        </div>
      )}
      {rows.length > 0 ? (
        rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="label-xs text-quaternary w-24 flex-shrink-0">{r.label}</span>
            <span className="label-xs text-tertiary line-through">{r.from}</span>
            <span className="text-quaternary">→</span>
            <span className="label-xs text-primary font-semibold">{r.to}</span>
          </div>
        ))
      ) : (
        <span className="label-xs text-quaternary">No change detected from current state.</span>
      )}
    </div>
  )
}

const statusConfig = {
  pending: {
    label: 'Review Action',
    color: 'bg-utility-warning-100 border-utility-warning-300',
    textColor: 'text-utility-warning-700',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-50 border-blue-300',
    textColor: 'text-blue-700',
  },
  running: {
    label: 'Executing...',
    color: 'bg-blue-50 border-blue-300',
    textColor: 'text-blue-700',
  },
  completed: {
    label: 'Completed',
    color: 'bg-success-secondary border-success',
    textColor: 'text-success',
  },
  failed: { label: 'Failed', color: 'bg-error-secondary border-error', textColor: 'text-error' },
}

export const ActionConfirmCard = ({
  action,
  status,
  result,
  onConfirm,
  onCancel,
}: ActionConfirmCardProps) => {
  const config = statusConfig[status]
  const isCampaignAction = action.platform === 'campaign'
  // Editable copy of the proposed params — campaign actions can be tweaked
  // (phase, budget, dates, launch/best-time) before Confirm; the edited params
  // are what gets sent. Other action types pass through unchanged.
  const [editedParams, setEditedParams] = useState<Record<string, unknown>>(action.params)
  const icon = isCampaignAction ? null : (platformIcons[action.platform] || null)
  const platformLabel = isCampaignAction ? 'Campaign' : action.platform
  // Block confirming a campaign action the user has emptied out (all channels removed).
  const emptyCampaign = isCampaignAction
    && ((editedParams.channel_actions as unknown[] | undefined)?.length ?? 0) === 0

  return (
    <div className={`mt-3 rounded-xl border-2 p-4 ${config.color}`}>
      <div className="flex items-start gap-3">
        {icon
          ? <img src={icon} alt={platformLabel} className="w-8 h-8 mt-0.5 flex-shrink-0" />
          : (
            <div className="w-8 h-8 mt-0.5 flex-shrink-0 rounded-lg bg-brand-solid/20 flex items-center justify-center">
              <span className="text-sm">✦</span>
            </div>
          )
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${config.textColor} ${config.color}`}
            >
              {config.label}
            </span>
            <span className="text-xs text-quaternary truncate">{platformLabel}</span>
          </div>

          <p className="paragraph-sm text-primary font-medium mb-2">{action.summary}</p>

          {/* Meta writes: live before→after diff */}
          {status === 'pending' && action.action_type?.startsWith('meta_') && (
            <MetaActionPreview action={action} />
          )}

          {/* Show params preview (non-Meta) */}
          {status === 'pending'
            && !action.action_type?.startsWith('meta_')
            && action.params && Object.keys(action.params).length > 0 && (
            action.action_type === 'campaign_add_channel_action'
              ? <CampaignActionEditor params={editedParams} onChange={setEditedParams} />
              : (
                <div className="bg-primary/50 rounded-lg p-2 mb-3 text-xs font-mono text-tertiary">
                  {Object.entries(action.params).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-quaternary">{key}:</span>{' '}
                      <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              )
          )}

          {/* Post-confirm read-only summary of a campaign write */}
          {status !== 'pending' && isCampaignAction
            && action.params && Object.keys(action.params).length > 0 && (
            <CampaignActionPreview params={editedParams} />
          )}

          {/* Action buttons — only when pending */}
          {status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => onConfirm(isCampaignAction ? editedParams : undefined)}
                disabled={emptyCampaign}
                className="px-4 py-1.5 rounded-lg subheading-sm bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-solid"
              >
                Confirm
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-1.5 rounded-lg subheading-sm bg-secondary text-secondary hover:bg-tertiary transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Running spinner */}
          {status === 'running' && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Executing action...</span>
            </div>
          )}

          {/* Completed result */}
          {status === 'completed' && result && (
            <p className="text-sm text-success">
              {((result as Record<string, unknown>).message as string) ||
                'Action completed successfully.'}
            </p>
          )}

          {/* Failed result */}
          {status === 'failed' && (
            <p className="text-sm text-error">
              {result
                ? ((result as Record<string, unknown>).error as string) || 'Action failed.'
                : 'Action failed. Please try again.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActionConfirmCard
