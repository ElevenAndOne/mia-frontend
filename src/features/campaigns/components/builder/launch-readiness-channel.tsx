import { LaunchCheckRow } from './launch-check-row'
import { PushToGoogleButton } from './push-to-google-button'
import { PushToMetaButton } from './push-to-meta-button'
import { Pill, fmtWhen, score } from './launch-readiness-bits'
import { channelLabel } from '../../utils/channel-colors'
import type { FixHandlers } from './launch-check-row'
import type { Asset, LaunchReadinessChannel } from '../../types'

// One channel's card: its saved state, its problems, and its own push button —
// pushing is per channel because each platform is a separate job. A single
// campaign-wide "push live" would imply the two go together, and they don't.
export const LaunchReadinessChannelCard = ({
  channel,
  assets,
  busy,
  onCheck,
  onSetWaiver,
  fixes,
  canDecide,
}: {
  channel: LaunchReadinessChannel
  assets: Asset[]
  busy: boolean
  onCheck: () => void
  onSetWaiver: (code: string, waive: boolean, reason?: string) => void
  fixes: FixHandlers
  /** Accepting and declaring are admin-gated server-side; don't offer a member
   *  controls that can only come back 403. */
  canDecide: boolean
}) => {
  const snap = channel.snapshot
  const checks = snap?.checks ?? []
  // Don't offer a push we know the platform will refuse — and say which it is.
  const blockedReason = busy
    ? 'Still checking this channel…'
    : !snap
      ? 'Run the readiness check first'
      : snap.blocking_count > 0
        ? `Fix ${snap.blocking_count} blocking ${snap.blocking_count === 1 ? 'problem' : 'problems'} first`
        : null

  return (
    <div className="bg-primary border border-secondary rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-tertiary">
        <div className="min-w-0">
          <p className="label-sm text-primary truncate">
            {channelLabel(channel.channel)} · {channel.phase_name}
          </p>
          <p className="paragraph-xs text-quaternary mt-0.5">
            {snap
              ? `Checked ${fmtWhen(snap.checked_at)}${snap.checked_by.name ? ` by ${snap.checked_by.name}` : ''}${
                  snap.triggered_by === 'push' ? ' · at push time' : ''
                }`
              : 'Not checked yet'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {snap && (
            <Pill tone={snap.blocking_count > 0 ? 'bad' : snap.warning_count > 0 ? 'warn' : 'good'}>
              {score(snap).passed} of {score(snap).total} passing
            </Pill>
          )}
          {snap && snap.warning_count > 0 && <Pill tone="warn">{snap.warning_count} to decide</Pill>}
          {snap && snap.waived_count > 0 && <Pill tone="mute">{snap.waived_count} accepted</Pill>}
          {snap && snap.unknown_count > 0 && (
            <Pill tone="mute">{snap.unknown_count} couldn’t check</Pill>
          )}
          <button
            onClick={onCheck}
            disabled={busy}
            className="label-xs px-2.5 py-1 rounded-lg border border-tertiary text-secondary hover:bg-tertiary disabled:opacity-50"
          >
            {busy ? 'Checking…' : snap ? 'Re-check' : 'Check'}
          </button>
        </div>
      </div>

      {checks.length > 0 ? (
        <div>
          {checks.map((c, i) => (
            <LaunchCheckRow
              key={`${c.code}-${i}`}
              check={c}
              busy={busy}
              onSetWaiver={onSetWaiver}
              platform={channel.platform}
              channelAssets={assets}
              fixes={canDecide ? fixes : undefined}
              canDecide={canDecide}
            />
          ))}
        </div>
      ) : (
        <p className="paragraph-xs text-quaternary px-3 py-2.5">
          {snap
            ? 'Nothing to check on this channel yet.'
            : 'Run the check to see whether this channel is ready to push.'}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-secondary border-t border-tertiary">
        <p className="paragraph-xs text-quaternary">
          {blockedReason ?? 'Pushing creates everything paused — nothing spends until you activate it.'}
        </p>
        {channel.platform === 'meta' ? (
          <PushToMetaButton
            actionId={channel.action_id}
            assets={assets}
            blockedReason={blockedReason}
          />
        ) : (
          <PushToGoogleButton
            actionId={channel.action_id}
            assets={assets}
            blockedReason={blockedReason}
          />
        )}
      </div>
    </div>
  )
}
