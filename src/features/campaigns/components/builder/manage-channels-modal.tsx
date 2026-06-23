import { useState } from 'react'
import { PLATFORM_LABELS } from '../../utils/channel-colors'
import type { ChannelConfig } from '../../types'

const ALWAYS_HIDDEN = ['ga4', 'airtable']

interface Props {
  config: ChannelConfig
  onClose: () => void
  onSave: (config: ChannelConfig) => Promise<boolean> | boolean
}

// Toggle which channels appear in the "+ Add channel" dropdown and define custom
// channels. Save is delegated to the parent (which persists via the API).
export const ManageChannelsModal = ({ config, onClose, onSave }: Props) => {
  const [hidden, setHidden] = useState<string[]>(config.hidden)
  const [custom, setCustom] = useState<{ key: string; label: string }[]>(config.custom)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const standard = Object.entries(PLATFORM_LABELS).filter(([k]) => !ALWAYS_HIDDEN.includes(k))

  const addCustom = () => {
    const label = newLabel.trim()
    if (!label) return
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    if (Object.keys(PLATFORM_LABELS).includes(key) || custom.some((c) => c.key === key)) return
    setCustom((prev) => [...prev, { key, label }])
    setNewLabel('')
  }

  const save = async () => {
    setSaving(true)
    const ok = await onSave({ hidden, custom })
    setSaving(false)
    if (ok !== false) onClose()
  }

  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-secondary rounded-2xl border border-secondary w-full max-w-sm max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-tertiary">
          <h2 className="label-md text-primary">Manage channel options</h2>
          <button onClick={onClose} className="text-quaternary hover:text-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <p className="paragraph-xs text-tertiary">Toggle which channels appear in the "+ Add channel" dropdown.</p>
          <div className="space-y-1">
            {standard.map(([key, label]) => {
              const isHidden = hidden.includes(key)
              return (
                <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-tertiary transition-colors">
                  <span className={`paragraph-sm ${isHidden ? 'text-quaternary line-through' : 'text-primary'}`}>{label}</span>
                  <button onClick={() => setHidden((p) => (isHidden ? p.filter((k) => k !== key) : [...p, key]))}
                    className={`label-xs px-2 py-0.5 rounded-full transition-colors ${isHidden ? 'text-utility-success-600 bg-utility-success-50' : 'text-utility-error-600 bg-utility-error-50'}`}>
                    {isHidden ? '+ Show' : '× Hide'}
                  </button>
                </div>
              )
            })}
          </div>
          {custom.length > 0 && (
            <div>
              <p className="label-xs text-quaternary uppercase tracking-wide mb-2">Custom channels</p>
              <div className="space-y-1">
                {custom.map((ch, i) => (
                  <div key={ch.key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-tertiary transition-colors">
                    <span className="paragraph-sm text-primary">{ch.label}</span>
                    <button onClick={() => setCustom((p) => p.filter((_, idx) => idx !== i))} className="label-xs text-utility-error-600 bg-utility-error-50 px-2 py-0.5 rounded-full">× Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="label-xs text-quaternary uppercase tracking-wide mb-2">Add custom channel</p>
            <div className="flex gap-2">
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} placeholder="e.g. Outdoor Advertising"
                className="flex-1 px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-primary text-secondary outline-none focus:border-utility-brand-400" />
              <button onClick={addCustom} className="label-xs text-utility-brand-600 hover:text-utility-brand-700 shrink-0 px-2">Add</button>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-tertiary flex justify-end gap-2">
          <button onClick={onClose} className="label-xs text-quaternary hover:text-secondary px-3 py-1.5">Cancel</button>
          <button onClick={save} disabled={saving} className="label-xs bg-utility-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-utility-brand-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
