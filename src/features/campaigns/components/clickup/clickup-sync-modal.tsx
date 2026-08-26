import type { SyncResult } from '../../types'

interface Props {
  result: SyncResult | null
  loading: boolean
  error: string
  campaignName: string
  onClose: () => void
  onPushMissing: () => void
}

export const ClickUpSyncModal = ({ result, loading, error, campaignName, onClose, onPushMissing }: Props) => {
  // Items, not assets: a channel action with no assets has its own ClickUp task and is
  // counted here. Falls back to the asset-only numbers against an older backend.
  const total = result ? result.total_items ?? result.total_assets : 0
  const matched = result ? result.matched_items ?? result.matched : 0
  const missing = result ? result.unmatched_items ?? result.unmatched : 0
  const ok = result ? missing === 0 : false
  const noun = result && result.total_items != null ? 'items' : 'assets'
  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-secondary rounded-2xl border border-secondary p-6 max-w-lg w-full shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#7B68EE]/15 shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#7B68EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
          </div>
          <div>
            <h2 className="title-h6 text-primary">ClickUp Sync Check</h2>
            <p className="paragraph-xs text-tertiary">{campaignName}</p>
          </div>
        </div>

        {loading && <div className="flex items-center justify-center py-10 text-tertiary paragraph-sm">Checking ClickUp tasks…</div>}
        {error && !loading && <p className="paragraph-sm text-utility-error-700 mb-4">{error}</p>}

        {result && !loading && (
          <>
            <div className={`mb-4 shrink-0 rounded-lg p-3 flex items-center gap-3 border ${ok ? 'bg-utility-success-100 border-utility-success-300' : 'bg-utility-warning-100 border-utility-warning-300'}`}>
              <p className={`subheading-md ${ok ? 'text-utility-success-700' : 'text-utility-warning-700'}`}>
                {matched} / {total} {noun} synced{missing > 0 ? ` · ${missing} missing` : ''}
              </p>
            </div>
            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {result.phases.map((phase) => (
                <div key={phase.phase_id}>
                  <p className="subheading-md text-secondary mb-2">{phase.phase_name}</p>
                  {phase.channels.map((ch) => (
                    <div key={ch.action_id} className="mb-3">
                      <p className="paragraph-xs text-tertiary mb-1.5">{ch.channel_label}</p>
                      {ch.assets.length === 0 && (
                        // No assets yet, so the channel task itself is the thing to check.
                        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-tertiary">
                          <svg className={`w-4 h-4 shrink-0 ${ch.synced ? 'text-utility-success-700' : 'text-utility-error-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {ch.synced ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />}
                          </svg>
                          <span className={`paragraph-xs flex-1 ${ch.synced ? 'text-primary' : 'text-tertiary'}`}>
                            Channel task<span className="text-quaternary ml-1">(no assets yet)</span>
                          </span>
                          {ch.synced && ch.clickup_task_url && (
                            <a href={ch.clickup_task_url} target="_blank" rel="noopener noreferrer" className="paragraph-xs text-utility-brand-600 hover:underline shrink-0" onClick={(e) => e.stopPropagation()}>Open ↗</a>
                          )}
                        </div>
                      )}
                      <div className="space-y-1">
                        {ch.assets.map((asset) => (
                          <div key={asset.asset_id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-tertiary">
                            <svg className={`w-4 h-4 shrink-0 ${asset.synced ? 'text-utility-success-700' : 'text-utility-error-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {asset.synced ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />}
                            </svg>
                            <span className={`paragraph-xs flex-1 ${asset.synced ? 'text-primary' : 'text-tertiary'}`}>{asset.asset_name}{asset.asset_type && <span className="text-quaternary ml-1">({asset.asset_type})</span>}</span>
                            {asset.synced && asset.clickup_task_url && (
                              <a href={asset.clickup_task_url} target="_blank" rel="noopener noreferrer" className="paragraph-xs text-utility-brand-600 hover:underline shrink-0" onClick={(e) => e.stopPropagation()}>Open ↗</a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3 mt-4 shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-secondary rounded-lg subheading-md text-secondary hover:bg-tertiary">Close</button>
          {result && missing > 0 && (
            <button onClick={onPushMissing} className="flex-1 px-4 py-3 bg-[#7B68EE] text-white rounded-lg subheading-md hover:bg-[#6A58DD]">Push Missing →</button>
          )}
        </div>
      </div>
    </div>
  )
}
