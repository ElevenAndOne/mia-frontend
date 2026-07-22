import { useState } from 'react'
import { pushChannelActionToMeta } from '../../services/campaign-api'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import type { Asset, MetaPushResult } from '../../types'

const META = '#0866FF'

interface Props {
  actionId: string
  assets: Asset[]
}

// "Push to Meta" for a Meta Ads channel action: creates a PAUSED campaign →
// ad set → one ad per READY asset. Confirmed via a modal (it creates real, if
// paused, objects), and refreshes the campaign on success so assets flip to
// Scheduled.
export const PushToMetaButton = ({ actionId, assets }: Props) => {
  const { tenantId, sessionId, campaign, reloadDetail } = useCampaignWorkspace()
  const [open, setOpen] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<MetaPushResult | null>(null)

  const readyCount = assets.filter((a) => a.status === 'ready').length

  const run = async () => {
    setPushing(true)
    setError('')
    setResult(null)
    try {
      const r = await pushChannelActionToMeta(sessionId, tenantId, campaign.campaign_id, actionId)
      setResult(r)
      if (r.success) await reloadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Push to Meta failed')
    } finally {
      setPushing(false)
    }
  }

  const close = () => {
    setOpen(false)
    setResult(null)
    setError('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={readyCount === 0}
        title={readyCount === 0 ? 'No assets marked Ready to launch' : 'Push ready ads to Meta (paused)'}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg label-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: META }}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        Push to Meta{readyCount > 0 ? ` (${readyCount} ready)` : ''}
      </button>

      {open && (
        <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={close}>
          <div className="bg-secondary rounded-2xl border border-secondary p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${META}26` }}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={META} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              </div>
              <h2 className="title-h6 text-primary">Push to Meta</h2>
            </div>

            {result ? (
              result.success ? (
                <div className="mb-4">
                  <div className="bg-utility-success-100 border border-utility-success-300 rounded-lg p-4 mb-2">
                    <p className="subheading-md text-utility-success-700">
                      Created a paused campaign with {result.ads_created ?? 0} ad{(result.ads_created ?? 0) === 1 ? '' : 's'}.
                    </p>
                    <p className="paragraph-xs text-utility-success-700 mt-1">Review and publish it in Meta Ads Manager — nothing is live yet.</p>
                  </div>
                  {result.ads?.some((a) => !a.success) && (
                    <ul className="space-y-1">
                      {result.ads.filter((a) => !a.success).map((a, i) => (
                        <li key={i} className="paragraph-xs text-utility-warning-700">Skipped an ad: {a.message || a.error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="mb-4 bg-utility-error-100 border border-utility-error-300 rounded-lg p-4">
                  <p className="subheading-md text-utility-error-700">Push failed at the {result.stage} step.</p>
                  <p className="paragraph-xs text-utility-error-700 mt-1">
                    {result[result.stage as 'campaign' | 'adset']?.error || result[result.stage as 'campaign' | 'adset']?.message}
                  </p>
                </div>
              )
            ) : (
              <p className="paragraph-sm text-tertiary mb-4">
                This creates a <strong>paused</strong> Meta campaign, one ad set, and one ad per Ready asset ({readyCount}).
                Nothing spends until someone publishes it in Ads Manager.
              </p>
            )}

            {error && <p className="mb-3 paragraph-xs text-utility-error-700">{error}</p>}

            <div className="flex gap-3">
              <button onClick={close} disabled={pushing} className="flex-1 px-4 py-3 border border-secondary rounded-lg subheading-md text-secondary hover:bg-tertiary disabled:opacity-50">
                {result ? 'Close' : 'Cancel'}
              </button>
              {!result && (
                <button
                  onClick={run}
                  disabled={pushing || readyCount === 0}
                  className="flex-1 px-4 py-3 text-white rounded-lg subheading-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: META }}
                >
                  {pushing ? 'Pushing… (continues even if you close)' : `Push ${readyCount} to Meta`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
