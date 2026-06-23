import { useState } from 'react'

interface ObjectivesEditorProps {
  objectives: string[]
  onSave: (objectives: string[]) => Promise<boolean> | boolean
}

// Campaign objectives — bulleted list with an inline multi-row editor.
export const ObjectivesEditor = ({ objectives, onSave }: ObjectivesEditorProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>([])

  const start = () => {
    setDraft([...objectives, ''])
    setEditing(true)
  }

  const save = async () => {
    const ok = await onSave(draft.filter((o) => o.trim()))
    if (ok !== false) setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="label-xs text-quaternary uppercase tracking-wide">Objectives</p>
        {!editing && <button onClick={start} className="label-xs text-quaternary hover:text-secondary">Edit</button>}
      </div>
      {editing ? (
        <div className="space-y-2">
          {draft.map((obj, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                value={obj}
                onChange={(e) => setDraft((p) => p.map((o, j) => (j === i ? e.target.value : o)))}
                onFocus={() => { if (i === draft.length - 1) setDraft((p) => [...p, '']) }}
                placeholder={i === draft.length - 1 ? '+ Add objective' : 'Objective'}
                className="flex-1 px-2 py-1.5 border border-tertiary rounded-lg paragraph-sm bg-primary text-secondary outline-none focus:border-utility-brand-400"
              />
              {obj.trim() && (
                <button onClick={() => setDraft((p) => p.filter((_, j) => j !== i))} className="mt-2 text-quaternary hover:text-utility-error-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="px-3 py-1.5 bg-utility-brand-600 text-white rounded-lg label-sm hover:bg-utility-brand-700">Save</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 border border-tertiary rounded-lg label-sm text-secondary hover:bg-tertiary">Cancel</button>
          </div>
        </div>
      ) : objectives.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {objectives.map((obj, i) => (
            <div key={i} className="flex gap-3 bg-primary border border-secondary rounded-xl px-4 py-3.5">
              <span className="shrink-0 w-6 h-6 rounded-lg bg-utility-brand-100 text-utility-brand-600 cw-mono text-xs font-bold flex items-center justify-center">{String(i + 1).padStart(2, '0')}</span>
              <span className="paragraph-sm text-secondary leading-relaxed">{obj}</span>
            </div>
          ))}
        </div>
      ) : (
        <button onClick={start} className="paragraph-sm text-quaternary italic hover:text-secondary">+ Add objectives</button>
      )}
    </div>
  )
}
