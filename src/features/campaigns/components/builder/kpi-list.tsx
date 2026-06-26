import { useState } from 'react'
import { EditableText } from '../../../../components/editable-text'
import type { KPI } from '../../types'

interface ListOption { list_id: number; name: string; size: number }

interface KpiListProps {
  kpis: KPI[]
  hubspotLists: ListOption[]
  brevoLists: ListOption[]
  phaseHasHubspot: boolean
  phaseHasBrevo: boolean
  onPatchKpi: (kpiId: number, fields: Partial<KPI>) => void | Promise<void>
  onDeleteKpi: (kpiId: number) => void
  onAddKpi: (name: string, target: string) => Promise<boolean> | void
}

const linkSelect =
  'flex-1 text-xs rounded-lg border border-tertiary bg-primary text-tertiary px-2 py-1 focus:outline-none focus:border-utility-brand-400 disabled:opacity-50'

export const KpiList = ({
  kpis, hubspotLists, brevoLists, phaseHasHubspot, phaseHasBrevo,
  onPatchKpi, onDeleteKpi, onAddKpi,
}: KpiListProps) => {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)

  const linkList = async (kpiId: number, field: 'hubspot_list_name' | 'brevo_list_name', value: string | null) => {
    setSavingId(kpiId)
    try { await onPatchKpi(kpiId, { [field]: value }) } finally { setSavingId(null) }
  }

  const submit = async () => {
    if (!name.trim()) return
    const ok = await onAddKpi(name.trim(), target.trim())
    if (ok !== false) { setName(''); setTarget(''); setAdding(false) }
  }

  return (
    <div>
      <p className="label-xs text-quaternary uppercase tracking-wide mb-2">KPI Targets</p>
      {kpis.length > 0 && (
        <div className="rounded-xl border border-secondary overflow-hidden mb-2">
          {kpis.map((kpi, i) => {
            const isTotal = kpi.kpi_name.toLowerCase().startsWith('total')
            const showHs = phaseHasHubspot && hubspotLists.length > 0 && !isTotal
            const isBrevoKpi = /competition|entr|giveaway|contest|subscriber|sign.?up|member/i.test(kpi.kpi_name)
            const showBrevo = phaseHasBrevo && brevoLists.length > 0 && isBrevoKpi
            return (
              <div key={kpi.kpi_id} className={`px-3 py-2.5 space-y-1.5 ${i < kpis.length - 1 ? 'border-b border-tertiary' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <EditableText value={kpi.kpi_name} onSave={(v) => onPatchKpi(kpi.kpi_id, { kpi_name: v })} className="paragraph-sm text-secondary" />
                  </div>
                  <div className="shrink-0 w-32 text-right">
                    <EditableText value={kpi.target_value ?? '—'} onSave={(v) => onPatchKpi(kpi.kpi_id, { target_value: v })} className="label-sm text-primary font-medium cw-mono text-right" />
                  </div>
                  <button onClick={() => onDeleteKpi(kpi.kpi_id)} className="p-0.5 text-quaternary hover:text-utility-error-500 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {showHs && (
                  <div className="flex items-center gap-2">
                    <select value={kpi.hubspot_list_name ?? ''} disabled={savingId === kpi.kpi_id} onChange={(e) => linkList(kpi.kpi_id, 'hubspot_list_name', e.target.value || null)} className={linkSelect}>
                      <option value="">— Link HubSpot list —</option>
                      {hubspotLists.map((l) => <option key={l.list_id} value={l.name}>{l.name} ({l.size.toLocaleString()})</option>)}
                    </select>
                    {kpi.hubspot_list_name && <span className="shrink-0 px-1.5 py-0.5 rounded bg-utility-success-100 text-utility-success-700 label-xs">linked</span>}
                  </div>
                )}
                {showBrevo && (
                  <div className="flex items-center gap-2">
                    <select value={kpi.brevo_list_name ?? ''} disabled={savingId === kpi.kpi_id} onChange={(e) => linkList(kpi.kpi_id, 'brevo_list_name', e.target.value || null)} className={linkSelect}>
                      <option value="">— Link Brevo list —</option>
                      {brevoLists.map((l) => <option key={l.list_id} value={l.name}>{l.name} ({l.size.toLocaleString()})</option>)}
                    </select>
                    {kpi.brevo_list_name && <span className="shrink-0 px-1.5 py-0.5 rounded bg-utility-brand-100 text-utility-brand-700 label-xs">list linked</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {adding ? (
        <div className="flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="KPI name" autoFocus className="flex-1 px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-primary text-secondary outline-none focus:border-utility-brand-400" />
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target" className="w-24 px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-primary text-secondary outline-none focus:border-utility-brand-400" />
          <button onClick={submit} className="label-xs text-utility-brand-600 hover:text-utility-brand-700 shrink-0">Add</button>
          <button onClick={() => { setAdding(false); setName(''); setTarget('') }} className="label-xs text-quaternary shrink-0">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="label-xs text-quaternary hover:text-secondary">+ Add KPI</button>
      )}
    </div>
  )
}
