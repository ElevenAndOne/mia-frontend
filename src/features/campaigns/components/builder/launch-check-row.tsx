import { useState } from 'react'
import FacebookPageSelector from '../../../integrations/selectors/facebook-page-selector'
import GoogleAccountSelector from '../../../integrations/selectors/google-account-selector'
import MetaAccountSelector from '../../../integrations/selectors/meta-account-selector'
import { LaunchCheckFixForm } from './launch-check-fix-form'
import { useCheckFix } from '../../hooks/use-check-fix'
import { LOOK, fmtWhen } from '../../utils/launch-check-look'
import { specFor } from '../../utils/launch-check-fixes'
import type { Asset, PushCheck } from '../../types'

const inputCls =
  'w-full px-2 py-1 rounded-lg bg-primary border border-tertiary paragraph-xs text-primary outline-none focus:border-utility-brand-400'

export interface FixHandlers {
  /** Write fields on the ads this check points at. */
  asset: (assetIds: string[], fields: Record<string, unknown>) => Promise<void>
  /** Write fields on the channel action itself (budget, dates). */
  channel: (fields: Record<string, unknown>) => Promise<void>
  /** Merge keys into the channel's push profile. */
  pushConfig: (patch: Record<string, unknown>) => Promise<void>
  /** Run a landing page through the campaign's UTM builder, then save it per ad. */
  tagAndSave: (assetIds: string[], baseUrl: string) => Promise<void>
  /** What the tagged link will be, without saving it. */
  previewTagged: (assetId: string, baseUrl: string) => Promise<string | null>
  /** Nothing was written by us — something changed elsewhere, so look again. */
  recheck: () => Promise<void>
  /** Mia's draft copy/keywords for one ad, for review. Never saved directly. */
  suggest: (assetId: string) => Promise<{
    headlines: string
    descriptions: string
    keywords: string
  } | null>
}

// One row of the checklist: what was checked, what the answer was, and — where the
// cause is a field Mia owns — the input to fix it without leaving the screen.
// Checks that need the ad platform itself (a dead account, a pixel that isn't
// firing) have no fix here, and keep Accept / must fix.
export const LaunchCheckRow = ({
  check,
  busy,
  platform,
  channelAssets,
  onSetWaiver,
  fixes,
  canDecide = true,
}: {
  check: PushCheck
  busy: boolean
  /** 'meta' | 'google' — the same code can mean different things per platform. */
  platform: string
  /** Every asset on this channel — needed to mark ads ready. */
  channelAssets: Asset[]
  onSetWaiver: (code: string, waive: boolean, reason?: string) => void
  fixes?: FixHandlers
  /** false for members: Accept/Declare are admin-only server-side. */
  canDecide?: boolean
}) => {
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const waived = !!check.waived
  const look = LOOK[waived ? 'waived' : check.severity] ?? LOOK.info
  const muted = waived || check.severity === 'pass' || check.severity === 'info'
  const ads = check.target?.level === 'asset' ? check.target.names : []
  const assetIds = check.target?.level === 'asset' ? check.target.ids : []

  const spec = check.severity === 'pass' || !fixes ? undefined : specFor(platform, check.code)
  // An asset-targeted fix needs to know which ads to write to. "Mark ready" is the
  // exception — it exists precisely because no ad is ready yet.
  const notReady = channelAssets.filter((a) => a.status !== 'ready')
  const fixable =
    !!spec &&
    (spec.kind === 'ready'
      ? notReady.length > 0
      : spec.kind === 'connect' || spec.target !== 'asset' || assetIds.length > 0)

  const fix = useCheckFix(spec, notReady, assetIds, fixes)

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 border-b border-tertiary last:border-b-0">
      <span
        className={`shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center label-xs ${look.cls}`}
      >
        {look.glyph}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`paragraph-xs ${muted ? 'text-tertiary' : 'text-primary'}`}>{check.message}</p>
        {ads.length > 0 && check.severity !== 'pass' && (
          <p className="paragraph-xs text-quaternary mt-0.5">
            {ads.length === 1 ? 'Ad: ' : 'Ads: '}
            {ads.join(', ')}
          </p>
        )}
        {waived && (
          <p className="paragraph-xs text-quaternary mt-0.5 italic">
            Accepted by {check.waived?.by} · {fmtWhen(check.waived?.at ?? null)}
            {check.waived?.reason ? ` — ${check.waived.reason}` : ''}
          </p>
        )}

        {fix.open && spec?.kind === 'connect' && (
          <>
            <p className="paragraph-xs text-quaternary mt-0.5">{spec.hint}</p>
            {spec.selector === 'meta_account' && (
              <MetaAccountSelector isOpen onClose={() => fix.setOpen(false)} onSuccess={fix.connected} />
            )}
            {spec.selector === 'facebook_page' && (
              <FacebookPageSelector isOpen onClose={() => fix.setOpen(false)} onSuccess={fix.connected} />
            )}
            {spec.selector === 'google_account' && (
              <GoogleAccountSelector isOpen onClose={() => fix.setOpen(false)} onSuccess={fix.connected} />
            )}
          </>
        )}

        {fix.open && spec && spec.kind !== 'connect' && (
          <LaunchCheckFixForm
            spec={spec}
            notReady={notReady}
            assetIds={assetIds}
            fixing={fix.saving}
            saveDisabled={fix.saveDisabled}
            state={fix.state}
            onSuggest={assetIds[0] ? () => fix.suggest(assetIds[0]) : undefined}
            onSave={() => void fix.save()}
            onCancel={() => fix.setOpen(false)}
            onPreview={() => void fix.loadPreview()}
          />
        )}

        {asking && (
          <div className="flex items-center gap-2 mt-1.5">
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this OK? (optional, saved with your name)"
              className={inputCls}
            />
            <button
              onClick={() => {
                onSetWaiver(check.code, true, reason.trim() || undefined)
                setAsking(false)
                setReason('')
              }}
              className="shrink-0 label-xs px-2.5 py-1 rounded-lg bg-utility-brand-600 text-white hover:bg-utility-brand-700"
            >
              Accept
            </button>
            <button
              onClick={() => setAsking(false)}
              className="shrink-0 label-xs px-2 py-1 rounded-lg border border-tertiary text-secondary hover:bg-tertiary"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {fixable && !fix.open && !asking && (
          <button
            onClick={fix.start}
            disabled={busy || fix.saving}
            className="label-xs text-utility-brand-700 hover:underline disabled:opacity-50"
          >
            {spec?.cta}
          </button>
        )}
        {check.severity === 'block' && !fixable && (
          <span className="label-xs text-utility-error-700">must fix</span>
        )}
        {check.severity === 'unknown' && (
          <span className="label-xs text-quaternary">couldn’t check</span>
        )}
        {canDecide &&
          check.severity === 'warn' &&
          !fix.open &&
          (waived ? (
            <button
              onClick={() => onSetWaiver(check.code, false)}
              disabled={busy}
              className="label-xs text-quaternary hover:text-secondary disabled:opacity-50"
            >
              Un-accept
            </button>
          ) : (
            !asking && (
              <button
                onClick={() => setAsking(true)}
                disabled={busy}
                className="label-xs text-utility-brand-700 hover:underline disabled:opacity-50"
              >
                Accept
              </button>
            )
          ))}
      </div>
    </div>
  )
}
