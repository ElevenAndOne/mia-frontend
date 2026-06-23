import type { useClickUpBrowse } from '../../hooks/use-clickup-browse'
import type { ClickUpPushResult } from '../../types'

const selectCls = 'w-full px-4 py-3 border border-secondary rounded-lg paragraph-sm bg-primary text-primary'

interface Props {
  browse: ReturnType<typeof useClickUpBrowse>
  result: ClickUpPushResult | null
  pushing: boolean
  error: string
  clickupListId: string | null
  onPush: (listId: string) => void
  onClose: () => void
}

export const ClickUpPushModal = ({ browse, result, pushing, error, clickupListId, onPush, onClose }: Props) => {
  const created = result?.tasks_created ?? 0
  const skipped = result?.tasks_skipped ?? 0
  const targetList = browse.listId || clickupListId || ''

  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-secondary rounded-2xl border border-secondary p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#7B68EE]/15 shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M3 14.5L12 4l9 10.5" stroke="#7B68EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 19.5L12 15l5 4.5" stroke="#00C4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="title-h6 text-primary">Push to ClickUp</h2>
        </div>
        <p className="paragraph-sm text-tertiary mb-4">
          {result ? `${created} task${created !== 1 ? 's' : ''} created${skipped > 0 ? `, ${skipped} already existed` : ''}.` : 'Push channel actions to ClickUp as tasks.'}
        </p>

        {result ? (
          <div className="mb-4 bg-utility-success-100 border border-utility-success-300 rounded-lg p-4">
            <p className="subheading-md text-utility-success-700 mb-1">{created} task{created !== 1 ? 's' : ''} created{skipped > 0 ? ` · ${skipped} skipped` : ''}</p>
            {result.tasks?.[0]?.task_url && (
              <a href={result.tasks[0].task_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 paragraph-xs text-utility-success-700 hover:underline">Open first task in ClickUp ↗</a>
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
            <button onClick={() => onPush(targetList)} disabled={pushing || !targetList} className="flex-1 px-4 py-3 bg-[#7B68EE] text-white rounded-lg subheading-md hover:bg-[#6A58DD] disabled:opacity-50 disabled:cursor-not-allowed">{pushing ? 'Pushing…' : 'Push to ClickUp'}</button>
          )}
        </div>
      </div>
    </div>
  )
}
