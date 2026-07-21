import type { ClickUpPullResult } from '../../types'

interface Props {
  result: ClickUpPullResult | null
  loading: boolean
  applying: boolean
  error: string
  applied: boolean
  onApply: () => void
  onClose: () => void
}

// "Sync from ClickUp": lists the ads the studio marked Ready to Launch, with the
// approved creative link and any final-URL edits they made, and applies them
// back onto the campaign's assets.
export const ClickUpPullModal = ({ result, loading, applying, error, applied, onApply, onClose }: Props) => {
  const ready = result?.ready ?? []

  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-secondary rounded-2xl border border-secondary p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#7B68EE]/15 shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#7B68EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" /><path d="M7 8l-4 4 4 4" /></svg>
          </div>
          <h2 className="title-h6 text-primary">Sync from ClickUp</h2>
        </div>
        <p className="paragraph-sm text-tertiary mb-4">
          {loading
            ? 'Checking ClickUp for approved ads…'
            : applied
              ? 'Applied. Your assets now carry the approved creative and are marked ready.'
              : `Ads marked "Ready to Launch" in ClickUp, with what the studio filled in.`}
        </p>

        {error && <p className="mb-3 paragraph-xs text-utility-error-700">{error}</p>}

        {!loading && !error && ready.length === 0 && (
          <div className="mb-4 bg-tertiary/40 border border-secondary rounded-lg p-4 text-center">
            <p className="paragraph-sm text-tertiary">No ads are marked Ready to Launch yet.</p>
          </div>
        )}

        {ready.length > 0 && (
          <div className="mb-4 space-y-2 max-h-72 overflow-y-auto">
            {ready.map((ad) => (
              <div key={ad.asset_id} className="border border-secondary rounded-lg p-3 bg-primary">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="paragraph-xs font-semibold text-primary font-mono">{ad.asset_id}</span>
                  <span className="label-xs font-semibold text-utility-brand-600 uppercase tracking-[0.08em]">{ad.clickup_status}</span>
                </div>
                <dl className="space-y-1">
                  <div className="flex gap-2">
                    <dt className="paragraph-xs text-quaternary w-20 shrink-0">Creative</dt>
                    <dd className="paragraph-xs text-secondary break-all">{ad.deliverable_url || <span className="text-utility-warning-600">— not filled in —</span>}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="paragraph-xs text-quaternary w-20 shrink-0">Final URL</dt>
                    <dd className="paragraph-xs text-secondary break-all">{ad.final_url || <span className="text-quaternary">unchanged</span>}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={applying} className="flex-1 px-4 py-3 border border-secondary rounded-lg subheading-md text-secondary hover:bg-tertiary disabled:opacity-50">{applied ? 'Close' : 'Cancel'}</button>
          {!applied && ready.length > 0 && (
            <button onClick={onApply} disabled={applying} className="flex-1 px-4 py-3 bg-[#7B68EE] text-white rounded-lg subheading-md hover:bg-[#6A58DD] disabled:opacity-50 disabled:cursor-not-allowed">{applying ? 'Applying…' : `Apply ${ready.length} to campaign`}</button>
          )}
        </div>
      </div>
    </div>
  )
}
