import { useEffect, useMemo, useState } from 'react'
import type { useClickUpBrowse } from '../../hooks/use-clickup-browse'
import type { ClickUpAdsPushResult, StudioDefaults, StudioPreview, StudioPushRow } from '../../types'

const selectCls = 'w-full px-3 py-2 border border-secondary rounded-lg paragraph-sm bg-primary text-primary'
const inputCls = 'w-full px-2 py-1.5 border border-secondary rounded-md paragraph-xs bg-primary text-primary'
const cell = 'px-2 py-1.5 align-top'

interface RowState extends StudioPushRow {
  task_name: string
  phase_name: string
  channel_name: string
  launch_date: string | null
  tags: string[]
  already_pushed: boolean
  existing_task_url: string | null
  candidate: { id: string; name: string; url?: string; score?: number } | null
  adopt: boolean
}

interface Props {
  browse: ReturnType<typeof useClickUpBrowse>
  preview: StudioPreview | null
  loading: boolean
  pushing: boolean
  error: string
  result: ClickUpAdsPushResult | null
  savedListId: string | null
  onLoadPreview: (listId: string | null) => void
  onPush: (listId: string, defaults: StudioDefaults, rows: StudioPushRow[], remember: boolean) => void
  onClose: () => void
}

// "Send to studio" (7 Oct 2026): the checklist before a campaign goes to ClickUp. One row per
// asset with the team's fields prefilled; points and estimates are typed by the PM, never
// auto-set. Adopting a hand-made task avoids the duplicate tree the old push created.
export const StudioPushModal = ({ browse, preview, loading, pushing, error, result, savedListId, onLoadPreview, onPush, onClose }: Props) => {
  const [pickList, setPickList] = useState(!savedListId)
  const [defaults, setDefaults] = useState<StudioDefaults>({ client: '', client_type: 'Campaign' })
  const [remember, setRemember] = useState(true)
  const [rows, setRows] = useState<RowState[]>([])

  const listId = browse.listId || preview?.list_id || savedListId || ''

  // Load the preview for the chosen list (the saved one first, a picked one after).
  useEffect(() => {
    if (!pickList) onLoadPreview(savedListId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (browse.listId) onLoadPreview(browse.listId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browse.listId])

  useEffect(() => {
    if (!preview) return
    setDefaults({ ...preview.defaults })
    const next: RowState[] = []
    for (const p of preview.phases) {
      for (const c of p.channels) {
        for (const a of c.assets) {
          next.push({
            asset_id: a.asset_id,
            task_name: a.task_name,
            phase_name: p.phase_name,
            channel_name: c.task_name.split(': ').slice(1).join(': ') || c.channel,
            job_type: a.job_type,
            assignee_clickup_id: a.assignee_clickup_id ?? null,
            assignee_name: a.assignee_name ?? null,
            points: a.points ?? null,
            estimate_hours: a.estimate_hours ?? null,
            due_date: a.due_date,
            launch_date: a.launch_date,
            tags: a.tags,
            already_pushed: a.already_pushed,
            existing_task_url: a.existing_task_url,
            candidate: a.candidate,
            adopt: false,
          })
        }
      }
    }
    setRows(next)
  }, [preview])

  const members = preview?.members ?? []
  const memberName = (id: string | null | undefined) => members.find((m) => String(m.id) === String(id))?.username ?? ''

  const update = (i: number, patch: Partial<RowState>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  const counts = useMemo(() => {
    const total = rows.length
    const pushed = rows.filter((r) => r.already_pushed).length
    const adopt = rows.filter((r) => r.adopt && r.candidate).length
    return { total, pushed, adopt, create: total - pushed - adopt }
  }, [rows])

  const submit = () => {
    if (!listId) return
    const payload: StudioPushRow[] = rows.map((r) => ({
      asset_id: r.asset_id,
      job_type: r.job_type,
      assignee_clickup_id: r.assignee_clickup_id || null,
      assignee_name: r.assignee_clickup_id ? memberName(r.assignee_clickup_id) : null,
      points: r.points,
      estimate_hours: r.estimate_hours,
      due_date: r.due_date,
      adopt_task_id: r.adopt && r.candidate ? r.candidate.id : null,
      adopt_task_url: r.adopt && r.candidate ? r.candidate.url ?? null : null,
    }))
    onPush(listId, defaults, payload, remember)
  }

  const missing = preview?.missing_fields ?? []
  const firstTaskUrl = result?.tasks?.find((t) => t.task_url)?.task_url

  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-secondary rounded-2xl border border-secondary p-6 max-w-5xl w-full shadow-xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#7B68EE]/15 shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M3 14.5L12 4l9 10.5" stroke="#7B68EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 19.5L12 15l5 4.5" stroke="#00C4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <h2 className="title-h6 text-primary">Send to studio</h2>
            <p className="paragraph-xs text-tertiary">Check every task before it lands in ClickUp. Points and estimates are yours to fill.</p>
          </div>
        </div>

        {result ? (
          <div className={`mt-4 border rounded-lg p-4 ${result.nothing_to_do ? 'bg-utility-warning-100 border-utility-warning-300' : 'bg-utility-success-100 border-utility-success-300'}`}>
            <p className="subheading-md text-utility-success-700 mb-1">
              {result.nothing_to_do ? 'Nothing was pushed' : `${result.tasks_created ?? 0} created · ${result.tasks_updated ?? 0} updated`}
            </p>
            {firstTaskUrl && <a href={firstTaskUrl} target="_blank" rel="noopener noreferrer" className="paragraph-xs text-utility-success-700 hover:underline">Open in ClickUp ↗</a>}
            {(result.missing_fields?.length ?? 0) > 0 && (
              <p className="paragraph-xs text-utility-warning-700 mt-2">This list has no {result.missing_fields!.join(', ')} field, so those values were not written.</p>
            )}
            {(result.unknown_options?.length ?? 0) > 0 && (
              <p className="paragraph-xs text-utility-warning-700 mt-1">ClickUp doesn't know these values: {result.unknown_options!.join(' · ')}</p>
            )}
          </div>
        ) : (
          <div className="mt-3 flex-1 min-h-0 overflow-y-auto">
            {/* Target list */}
            <div className="mb-3 flex flex-wrap items-end gap-3">
              {!pickList && savedListId ? (
                <p className="paragraph-sm text-secondary">
                  List: <span className="text-primary font-medium">{preview?.list_name ?? savedListId}</span>
                  <button className="ml-2 paragraph-xs text-[#7B68EE] hover:underline" onClick={() => { setPickList(true); void browse.loadSpaces() }}>change</button>
                </p>
              ) : (
                <>
                  <div className="min-w-[160px]"><label className="block paragraph-xs text-tertiary mb-1">Space</label>
                    <select className={selectCls} value={browse.spaceId} onChange={(e) => browse.selectSpace(e.target.value)}>
                      <option value="">{browse.loading === 'spaces' ? 'Loading…' : 'Select'}</option>{browse.spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div className="min-w-[160px]"><label className="block paragraph-xs text-tertiary mb-1">Client folder</label>
                    <select className={selectCls} value={browse.folderId} onChange={(e) => browse.selectFolder(e.target.value)} disabled={!browse.spaceId}>
                      <option value="">{browse.loading === 'folders' ? 'Loading…' : 'Select'}</option>{browse.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                  <div className="min-w-[200px]"><label className="block paragraph-xs text-tertiary mb-1">List</label>
                    <select className={selectCls} value={browse.listId} onChange={(e) => browse.setListId(e.target.value)} disabled={!browse.folderId}>
                      <option value="">{browse.loading === 'lists' ? 'Loading…' : 'Select'}</option>{browse.lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                </>
              )}
            </div>

            {loading && <p className="paragraph-sm text-tertiary">Reading the list and the team…</p>}
            {error && <p className="paragraph-xs text-utility-error-700 mb-2">{error}</p>}

            {preview && !loading && (
              <>
                {/* Defaults the team keeps on every task */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div><label className="block paragraph-xs text-tertiary mb-1">Client</label>
                    <input className={inputCls} value={defaults.client ?? ''} onChange={(e) => setDefaults({ ...defaults, client: e.target.value })} placeholder="As in the ClickUp Client dropdown" /></div>
                  <div><label className="block paragraph-xs text-tertiary mb-1">Client type</label>
                    <select className={inputCls} value={defaults.client_type ?? 'Campaign'} onChange={(e) => setDefaults({ ...defaults, client_type: e.target.value })}><option>Campaign</option><option>BPO</option></select></div>
                  <div><label className="block paragraph-xs text-tertiary mb-1">Creative lead</label>
                    <select className={inputCls} value={defaults.creative_lead_id ?? ''} onChange={(e) => setDefaults({ ...defaults, creative_lead_id: e.target.value || null, creative_lead_name: memberName(e.target.value) || null })}>
                      <option value="">—</option>{members.map((m) => <option key={m.id} value={String(m.id)}>{m.username}</option>)}</select></div>
                  <div><label className="block paragraph-xs text-tertiary mb-1">Delivery lead</label>
                    <select className={inputCls} value={defaults.delivery_lead_id ?? ''} onChange={(e) => setDefaults({ ...defaults, delivery_lead_id: e.target.value || null, delivery_lead_name: memberName(e.target.value) || null })}>
                      <option value="">—</option>{members.map((m) => <option key={m.id} value={String(m.id)}>{m.username}</option>)}</select></div>
                </div>
                <div className="flex flex-wrap items-center gap-4 mb-3 paragraph-xs text-tertiary">
                  <span>Tags: <span className="text-secondary">{preview.campaign_tag}</span> + phase + month + sprint{preview.sprint_calendar_ok ? '' : ' (Flex sprint calendar unreachable)'}</span>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember client and leads for this workspace</label>
                </div>
                {missing.length > 0 && (
                  <p className="paragraph-xs text-utility-warning-700 mb-2">This list has no {missing.join(', ')} field. Those values will be skipped until it's added in ClickUp.</p>
                )}
                {preview.warnings.map((w) => <p key={w} className="paragraph-xs text-utility-warning-700 mb-1">{w}</p>)}

                {/* Rows */}
                <div className="overflow-x-auto border border-secondary rounded-lg">
                  <table className="w-full paragraph-xs text-primary" style={{ minWidth: 900 }}>
                    <thead className="bg-tertiary text-tertiary">
                      <tr>
                        <th className={`${cell} text-left`}>Task</th>
                        <th className={`${cell} text-left`}>Job type</th>
                        <th className={`${cell} text-left`}>Assignee</th>
                        <th className={`${cell} text-left w-16`}>Points</th>
                        <th className={`${cell} text-left w-16`}>Est. h</th>
                        <th className={`${cell} text-left`}>Due</th>
                        <th className={`${cell} text-left`}>Launch</th>
                        <th className={`${cell} text-left`}>In ClickUp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.asset_id} className="border-t border-secondary">
                          <td className={cell}>
                            <div className="font-medium">{r.task_name}</div>
                            <div className="text-tertiary">{r.phase_name} · {r.tags.slice(2).join(' · ')}</div>
                          </td>
                          <td className={cell}>
                            <select className={inputCls} value={r.job_type ?? ''} onChange={(e) => update(i, { job_type: e.target.value })}>
                              {preview.job_types.map((j) => <option key={j} value={j}>{j}</option>)}
                            </select>
                          </td>
                          <td className={cell}>
                            <select className={inputCls} value={r.assignee_clickup_id ?? ''} onChange={(e) => update(i, { assignee_clickup_id: e.target.value || null })}>
                              <option value="">—</option>{members.map((m) => <option key={m.id} value={String(m.id)}>{m.username}</option>)}
                            </select>
                          </td>
                          <td className={cell}><input className={inputCls} type="number" min={0} step={1} value={r.points ?? ''} onChange={(e) => update(i, { points: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                          <td className={cell}><input className={inputCls} type="number" min={0} step={0.5} value={r.estimate_hours ?? ''} onChange={(e) => update(i, { estimate_hours: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                          <td className={cell}><input className={inputCls} type="date" value={r.due_date ?? ''} onChange={(e) => update(i, { due_date: e.target.value || null })} /></td>
                          <td className={cell}>{r.launch_date ?? <span className="text-tertiary">—</span>}</td>
                          <td className={cell}>
                            {r.already_pushed ? (
                              <a href={r.existing_task_url ?? '#'} target="_blank" rel="noopener noreferrer" className="text-[#7B68EE] hover:underline">already there ↗</a>
                            ) : r.candidate ? (
                              <label className="flex items-start gap-1">
                                <input type="checkbox" checked={r.adopt} onChange={(e) => update(i, { adopt: e.target.checked })} />
                                <span>adopt <span className="text-secondary">"{r.candidate.name}"</span></span>
                              </label>
                            ) : (
                              <span className="text-tertiary">new</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          {!result && preview && (
            <p className="paragraph-xs text-tertiary mr-auto">{counts.create} to create · {counts.adopt} to adopt · {counts.pushed} already in ClickUp (brief refreshed)</p>
          )}
          <button onClick={onClose} disabled={pushing} className="px-4 py-2 border border-secondary rounded-lg subheading-md text-secondary hover:bg-tertiary disabled:opacity-50">{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button onClick={submit} disabled={pushing || loading || !preview || !listId} className="px-4 py-2 bg-[#7B68EE] text-white rounded-lg subheading-md hover:bg-[#6A58DD] disabled:opacity-50 disabled:cursor-not-allowed">
              {pushing ? 'Sending…' : `Send ${rows.length} task${rows.length === 1 ? '' : 's'} to ClickUp`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
