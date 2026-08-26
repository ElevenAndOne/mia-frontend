import type { useClickUpBrowse } from '../../hooks/use-clickup-browse'
import type { ClickUpAdsPushResult } from '../../types'

const selectCls = 'w-full px-4 py-3 border border-secondary rounded-lg paragraph-sm bg-primary text-primary'

interface Props {
  browse: ReturnType<typeof useClickUpBrowse>
  result: ClickUpAdsPushResult | null
  pushing: boolean
  error: string
  clickupListId: string | null
  onPush: (listId: string) => void
  onClose: () => void
}

// Pushes each ad (asset) on the campaign's paid channels to ClickUp as its own
// task, carrying the creative brief and tracking URL. Uses the same
// space → folder → list picker as the summary push.
export const ClickUpPushAdsModal = ({ browse, result, pushing, error, clickupListId, onPush, onClose }: Props) => {
  const ads = result?.ads_created ?? 0
  const adsUpdated = result?.ads_updated ?? 0
  // Count every task, not just ads: a campaign whose actions have no assets yet
  // pushes phase and channel tasks only, and reporting "0 ads created" in a green
  // panel read as "nothing was pushed" — the reason people rebuilt tasks by hand.
  const createdTotal = result?.tasks_created ?? ads
  const updatedTotal = result?.tasks_updated ?? adsUpdated
  const nothingToDo = result?.nothing_to_do ?? (createdTotal === 0 && updatedTotal === 0)
  const missingFields = result?.missing_fields ?? []
  const firstTaskUrl = result?.tasks?.find((t) => t.task_url)?.task_url
  const targetList = browse.listId || clickupListId || ''

  const summary = [
    createdTotal > 0 ? `${createdTotal} task${createdTotal !== 1 ? 's' : ''} created` : '',
    updatedTotal > 0 ? `${updatedTotal} updated` : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-secondary rounded-2xl border border-secondary p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#7B68EE]/15 shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M3 14.5L12 4l9 10.5" stroke="#7B68EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 19.5L12 15l5 4.5" stroke="#00C4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="title-h6 text-primary">Push campaign to ClickUp</h2>
        </div>
        <p className="paragraph-sm text-tertiary mb-4">
          {result
            ? nothingToDo
              ? 'Nothing was pushed to ClickUp.'
              : `${summary}.`
            : 'Push the campaign to ClickUp: a parent task per phase, one per channel, and each ad nested beneath with its brief and tracking URL.'}
        </p>

        {result ? (
          <div
            className={`mb-4 border rounded-lg p-4 ${
              nothingToDo
                ? 'bg-utility-warning-100 border-utility-warning-300'
                : 'bg-utility-success-100 border-utility-success-300'
            }`}
          >
            {nothingToDo ? (
              <>
                <p className="subheading-md text-utility-warning-700 mb-1">Nothing to push</p>
                <p className="paragraph-xs text-utility-warning-700">
                  {result.reason ||
                    'This campaign has no phases or channel actions to push yet. Add them in the builder, then push again.'}
                </p>
              </>
            ) : (
              <>
                <p className="subheading-md text-utility-success-700 mb-1">{summary}</p>
                {ads === 0 && adsUpdated === 0 && (
                  <p className="paragraph-xs text-utility-success-700 mb-1">
                    Phase and channel tasks only — none of these actions have assets yet, so there
                    are no ad subtasks.
                  </p>
                )}
                {firstTaskUrl && (
                  <a href={firstTaskUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 paragraph-xs text-utility-success-700 hover:underline">Open first task in ClickUp ↗</a>
                )}
              </>
            )}
            {missingFields.length > 0 && (
              <p className="paragraph-xs text-utility-warning-700 mt-2">
                This list has no {missingFields.join(' or ')} field, so {missingFields.length > 1 ? 'those values were' : 'that value was'} not
                written. Add the custom field in ClickUp and push again.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="block subheading-md text-secondary mb-1">Space</label>
              <select value={browse.spaceId} onChange={(e) => browse.selectSpace(e.target.value)} disabled={browse.loading === 'spaces' || pushing} className={selectCls}>
                <option value="">{browse.loading === 'spaces' ? 'Loading spaces…' : browse.spaces.length === 0 ? 'No spaces found' : 'Select a space'}</option>
                {browse.spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {browse.spaceId && (
              <div className="mb-3">
                <label className="block subheading-md text-secondary mb-1">Folder</label>
                <select value={browse.folderId} onChange={(e) => browse.selectFolder(e.target.value)} disabled={browse.loading === 'folders' || pushing} className={selectCls}>
                  <option value="">{browse.loading === 'folders' ? 'Loading folders…' : browse.folders.length === 0 ? 'No folders found' : 'Select a folder'}</option>
                  {browse.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            {browse.folderId && (
              <div className="mb-4">
                <label className="block subheading-md text-secondary mb-1">List</label>
                <select value={browse.listId} onChange={(e) => browse.setListId(e.target.value)} disabled={browse.loading === 'lists' || pushing} className={selectCls}>
                  <option value="">{browse.loading === 'lists' ? 'Loading lists…' : browse.lists.length === 0 ? 'No lists found' : 'Select a list'}</option>
                  {browse.lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            {error && <p className="mb-3 paragraph-xs text-utility-error-700">{error}</p>}
          </>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={pushing} className="flex-1 px-4 py-3 border border-secondary rounded-lg subheading-md text-secondary hover:bg-tertiary disabled:opacity-50">{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button onClick={() => onPush(targetList)} disabled={pushing || !targetList} className="flex-1 px-4 py-3 bg-[#7B68EE] text-white rounded-lg subheading-md hover:bg-[#6A58DD] disabled:opacity-50 disabled:cursor-not-allowed">{pushing ? 'Pushing…' : 'Push ads'}</button>
          )}
        </div>
      </div>
    </div>
  )
}
