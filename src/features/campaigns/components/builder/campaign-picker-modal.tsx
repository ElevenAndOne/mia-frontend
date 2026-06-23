import { useState } from 'react'
import { usePlatformCampaigns } from '../../hooks/use-platform-campaigns'
import { channelLabel } from '../../utils/channel-colors'
import type { LinkedCampaign } from '../../types'

interface Props {
  channel: string
  current: LinkedCampaign[]
  onSave: (selected: LinkedCampaign[]) => void
  onClose: () => void
}

// Multi-select of platform campaigns / lists to link to a channel action (drives
// actuals + budget-tracker spend scoping).
export const CampaignPickerModal = ({ channel, current, onSave, onClose }: Props) => {
  const { campaigns, loading, error } = usePlatformCampaigns(channel)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Map<string, LinkedCampaign>>(
    new Map(current.map((c) => [c.id, c])),
  )

  const toggle = (c: LinkedCampaign) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(c.id)) next.delete(c.id)
      else next.set(c.id, c)
      return next
    })
  }

  const isList = channel === 'hubspot'
  const noun = isList ? 'lists' : 'campaigns'
  const filtered = campaigns.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="campaign-workspace fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-secondary rounded-2xl border border-secondary shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-tertiary">
          <p className="label-sm text-primary">Link {channelLabel(channel)} {noun}</p>
          <button onClick={onClose} className="text-quaternary hover:text-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-3 border-b border-tertiary">
          <input type="text" placeholder={`Search ${noun}…`} value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
            className="w-full px-3 py-1.5 rounded-lg border border-tertiary bg-primary paragraph-sm text-primary outline-none focus:border-utility-brand-400" />
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {loading && <p className="paragraph-xs text-tertiary text-center py-6">Loading…</p>}
          {error && !loading && <p className="paragraph-xs text-quaternary text-center py-4">{error}</p>}
          {!loading && filtered.length === 0 && !error && <p className="paragraph-xs text-quaternary text-center py-4">No {noun} found</p>}
          {filtered.map((c) => (
            <button key={c.id} onClick={() => toggle(c)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-tertiary text-left">
              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${selected.has(c.id) ? 'bg-utility-brand-600 border-utility-brand-600' : 'border-tertiary'}`}>
                {selected.has(c.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="paragraph-xs text-primary truncate">{c.name}</p>
                {c.status && <p className="paragraph-xs text-quaternary">{c.status}</p>}
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-2 p-4 border-t border-tertiary">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-tertiary paragraph-sm text-secondary hover:bg-tertiary">Cancel</button>
          <button onClick={() => onSave(Array.from(selected.values()))} className="flex-1 py-2 rounded-lg bg-utility-brand-600 paragraph-sm text-white hover:bg-utility-brand-700">
            Save {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
