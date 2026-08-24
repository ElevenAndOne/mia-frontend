import { FixActions, ReadyAdsInput, RsaCopyInput } from './launch-check-fix-inputs'
import { hasUtm } from '../../utils/launch-check-fixes'
import type { Asset } from '../../types'
import type { FixSpec } from '../../utils/launch-check-fixes'

const inputCls =
  'w-full px-2 py-1 rounded-lg bg-primary border border-tertiary paragraph-xs text-primary outline-none focus:border-utility-brand-400'

export interface FixFormState {
  value: string
  setValue: (v: string) => void
  descriptions: string
  setDescriptions: (v: string) => void
  period: string
  setPeriod: (v: string) => void
  readyIds: string[]
  setReadyIds: (fn: (prev: string[]) => string[]) => void
  addTags: boolean
  setAddTags: (v: boolean) => void
  preview: string | null
  setPreview: (v: string | null) => void
}

// The input half of a checklist row: one form per fix kind. Split out of
// launch-check-row.tsx to keep both files inside the 200-line component limit —
// the row owns the verdict and the buttons, this owns the editing.
export const LaunchCheckFixForm = ({
  spec,
  notReady,
  assetIds,
  fixing,
  saveDisabled,
  state,
  onSave,
  onCancel,
  onPreview,
  onSuggest,
}: {
  spec: FixSpec
  notReady: Asset[]
  assetIds: string[]
  fixing: boolean
  saveDisabled: boolean
  state: FixFormState
  onSave: () => void
  onCancel: () => void
  onPreview: () => void
  /** Ask Mia to draft this ad's copy or keywords. Only offered where a draft
   *  makes sense — writing ad copy from a blank box is the worst part of this job. */
  onSuggest?: () => Promise<void>
}) => {
  const {
    value,
    setValue,
    descriptions,
    setDescriptions,
    period,
    setPeriod,
    readyIds,
    setReadyIds,
    addTags,
    setAddTags,
    preview,
    setPreview,
  } = state
  return (
                  <div className="mt-1.5 space-y-1.5">
            {spec.hint && <p className="paragraph-xs text-quaternary">{spec.hint}</p>}

            {spec.kind === 'rsa' && (
              <RsaCopyInput
                headlines={value}
                setHeadlines={setValue}
                descriptions={descriptions}
                setDescriptions={setDescriptions}
              />
            )}
            {spec.kind === 'lines' && (
              <textarea
                autoFocus
                rows={3}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={spec.placeholder}
                className={inputCls}
              />
            )}
            {spec.kind === 'text' && (
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => onPreview()}
                onKeyDown={(e) => {
                  // Guard with the same condition as the Save button: Enter on an
                  // empty field would otherwise write '' over every targeted ad.
                  if (e.key === 'Enter' && !saveDisabled) onSave()
                }}
                placeholder={spec.placeholder}
                className={inputCls}
              />
            )}
            {spec.kind === 'date' && (
              <input
                autoFocus
                type="date"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={inputCls}
              />
            )}
            {spec.kind === 'budget' && (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={spec.placeholder}
                  className={inputCls}
                />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className={inputCls}
                >
                  <option value="total">total for the flight</option>
                  <option value="monthly">per month</option>
                </select>
              </div>
            )}
            {spec.kind === 'select' && (
              <select
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={inputCls}
              >
                <option value="">Choose…</option>
                {spec.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            {spec.kind === 'ready' && (
              <ReadyAdsInput notReady={notReady} readyIds={readyIds} setReadyIds={setReadyIds} />
            )}
            {spec.taggable &&
              (hasUtm(value) ? (
                <p className="paragraph-xs text-quaternary">
                  This link is already tagged — saving it as pasted.
                </p>
              ) : (
                <label className="flex items-center gap-1.5 paragraph-xs text-quaternary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addTags}
                    onChange={(e) => {
                      setAddTags(e.target.checked)
                      setPreview(null)
                    }}
                  />
                  Add tracking tags automatically{assetIds.length > 1 ? ' (one per ad)' : ''}
                </label>
              ))}
            {preview && (
              <p className="paragraph-xs text-tertiary break-all">
                Will save: <span className="text-secondary">{preview}</span>
              </p>
            )}

            <FixActions
              saveLabel={
                fixing
                  ? 'Saving…'
                  : spec.kind === 'ready'
                    ? `Mark ${readyIds.length} ready`
                    : spec.target === 'asset' && assetIds.length > 1
                      ? `Save to ${assetIds.length} ads`
                      : 'Save'
              }
              saveDisabled={saveDisabled}
              busy={fixing}
              onSave={onSave}
              onCancel={onCancel}
              onSuggest={
                onSuggest && (spec.kind === 'rsa' || spec.field === 'keywords')
                  ? onSuggest
                  : undefined
              }
            />
          </div>
  )
}
