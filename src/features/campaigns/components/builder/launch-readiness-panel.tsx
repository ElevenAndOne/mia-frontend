import { useSession } from '../../../../contexts/session-context'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import { useToast } from '../../../../contexts/toast-context'
import { useLaunchReadiness } from '../../hooks/use-launch-readiness'
import { LaunchReadinessChannelCard } from './launch-readiness-channel'
import { Pill } from './launch-readiness-bits'
import type { FixHandlers } from './launch-check-row'
import type { Asset } from '../../types'

// Campaign-level launch readiness: one screen for every pushable channel, read from
// what was saved rather than re-derived on open. Replaces two per-channel pop-ups
// whose results vanished when they closed.
//
// The content is layout-agnostic so the same screen is both the "Launch readiness"
// tab of the campaign and the slide-over a channel card opens with itself in focus.
export const LaunchReadinessContent = ({
  campaignId,
  focusActionId,
}: {
  campaignId: string
  /** Opened from one channel's card: show that channel first, but still show the
   *  campaign, because "is this ready" is a question about the whole launch. */
  focusActionId?: string
}) => {
  const { campaign, reloadDetail } = useCampaignWorkspace()
  const { activeWorkspace } = useSession()
  // Waivers and push-config writes require admin; members can still run checks.
  const canDecide = ['owner', 'admin'].includes(activeWorkspace?.role ?? '')
  const { showToast } = useToast()
  const {
    data,
    loading,
    checking,
    error,
    check,
    checkAll,
    setWaiver,
    fixAssets,
    fixChannel,
    fixPushConfig,
    tagAndFixAssets,
    previewTaggedUrl,
    suggestForAsset,
  } = useLaunchReadiness(campaignId, true)

  const assetsFor = (actionId: string): Asset[] =>
    (campaign.phases ?? [])
      .flatMap((p) => p.channel_actions ?? [])
      .find((a) => a.action_id === actionId)?.assets ?? []

  const run = async (actionId: string) => {
    const err = await check(actionId)
    if (err) showToast('error', err)
  }

  const runAll = async () => {
    const err = await checkAll()
    if (err) showToast('error', err)
  }

  const changeWaiver = async (actionId: string, code: string, waive: boolean, reason?: string) => {
    const err = await setWaiver(actionId, code, waive, reason)
    if (err) showToast('error', err)
  }

  // Every fix reports the same way: toast on failure, confirm on success, and the
  // channel re-checks itself so the row it came from turns green in place.
  // Every fix writes straight to the API, so the workspace copy of the campaign
  // (asset statuses, channel budgets, the push button's ready-count) has to be
  // pulled again or the screen disagrees with itself until a reload.
  const report = async (err: string | null, ok: string) => {
    if (err) return showToast('error', err)
    await reloadDetail()
    showToast('success', ok)
  }

  const fixesFor = (actionId: string): FixHandlers => ({
    asset: async (assetIds, fields) =>
      report(
        await fixAssets(actionId, assetIds, fields),
        assetIds.length === 1 ? 'Ad updated' : `${assetIds.length} ads updated`,
      ),
    channel: async (fields) => report(await fixChannel(actionId, fields), 'Channel updated'),
    pushConfig: async (patch) => report(await fixPushConfig(actionId, patch), 'Saved'),
    tagAndSave: async (assetIds, baseUrl) =>
      report(
        await tagAndFixAssets(actionId, assetIds, baseUrl),
        assetIds.length === 1 ? 'Ad updated with tracking tags' : `${assetIds.length} ads tagged`,
      ),
    previewTagged: previewTaggedUrl,
    recheck: async () => report(await check(actionId), 'Re-checked'),
    suggest: (assetId) => suggestForAsset(actionId, assetId),
  })

  const totals = data?.totals
  const busyAny = checking.length > 0
  const orderedChannels = focusActionId
    ? [...(data?.channels ?? [])].sort(
        (a, b) => Number(b.action_id === focusActionId) - Number(a.action_id === focusActionId),
      )
    : (data?.channels ?? [])

  return (
    <div className="flex flex-col min-h-0 flex-1">
        {totals && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-tertiary">
            <div className="flex items-center gap-2 flex-wrap">
              {totals.passed + totals.blocking + totals.warnings + totals.waived + totals.unknown >
                0 && (
                <Pill tone={totals.blocking > 0 ? 'bad' : totals.warnings > 0 ? 'warn' : 'good'}>
                  {totals.passed} of{' '}
                  {totals.passed +
                    totals.blocking +
                    totals.warnings +
                    totals.waived +
                    totals.unknown}{' '}
                  passing
                </Pill>
              )}
              {totals.blocking > 0 && <Pill tone="bad">{totals.blocking} to fix</Pill>}
              {totals.warnings > 0 && <Pill tone="warn">{totals.warnings} to decide</Pill>}
              {totals.waived > 0 && <Pill tone="mute">{totals.waived} accepted</Pill>}
              {totals.unknown > 0 && <Pill tone="mute">{totals.unknown} couldn’t check</Pill>}
              {totals.unchecked > 0 && <Pill tone="mute">{totals.unchecked} not checked</Pill>}
            </div>
            <button
              onClick={() => void runAll()}
              disabled={busyAny || !data?.channels.length}
              className="shrink-0 label-xs px-2.5 py-1 rounded-lg bg-utility-brand-600 text-white hover:bg-utility-brand-700 disabled:opacity-50"
            >
              {busyAny ? `Checking ${checking.length}…` : 'Check every channel'}
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {loading && <p className="paragraph-xs text-tertiary text-center py-8">Loading…</p>}
          {error && <p className="paragraph-xs text-utility-error-500 text-center py-4">{error}</p>}
          {data?.channels.length === 0 && !loading && (
            <p className="paragraph-xs text-quaternary text-center py-8">
              This campaign has no Meta Ads or Google Ads channels, so there is nothing to push.
            </p>
          )}
          {orderedChannels.map((ch) => (
            <LaunchReadinessChannelCard
              key={`${ch.action_id}-${ch.platform}`}
              channel={ch}
              assets={assetsFor(ch.action_id)}
              busy={checking.includes(ch.action_id)}
              onCheck={() => void run(ch.action_id)}
              onSetWaiver={(code, waive, reason) => void changeWaiver(ch.action_id, code, waive, reason)}
              fixes={fixesFor(ch.action_id)}
              canDecide={canDecide}
            />
          ))}
          {data && data.channels.length > 0 && (
            <p className="paragraph-xs text-quaternary pt-1">
              Channels that have never been checked (or whose result has gone stale) refresh
              themselves when you open this — the rest is on the buttons. A “couldn’t check” row is
              not a pass: the platform didn’t answer, so nothing was verified.
            </p>
          )}
        </div>
    </div>
  )
}

// Slide-over wrapper — used by a channel card to open the campaign's readiness with
// that channel first. The tab renders LaunchReadinessContent directly.
export const LaunchReadinessPanel = ({
  campaignId,
  onClose,
  focusActionId,
}: {
  campaignId: string
  onClose: () => void
  focusActionId?: string
}) => (
  <div className="campaign-workspace fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
    <div
      className="bg-secondary w-full max-w-2xl h-full flex flex-col border-l border-secondary shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 p-4 border-b border-tertiary">
        <div className="min-w-0">
          <p className="label-sm text-primary">Launch readiness</p>
          <p className="paragraph-xs text-quaternary mt-0.5">
            What the preflight found, kept with every push — who checked, what passed, what was
            accepted.
          </p>
        </div>
        <button onClick={onClose} className="text-quaternary hover:text-secondary shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <LaunchReadinessContent campaignId={campaignId} focusActionId={focusActionId} />
    </div>
  </div>
)
