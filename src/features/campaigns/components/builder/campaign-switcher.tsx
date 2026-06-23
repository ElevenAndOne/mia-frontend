import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditableText } from '../../../../components/editable-text'
import { setCampaignMode } from '../../../../utils/campaign-mode'
import { setPrimaryCampaign } from '../../services/campaign-api'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import type { CampaignView } from '../../types'

interface Props {
  view: CampaignView
  onRename: (name: string) => void
  onBuildNew: () => void
}

// Campaign name (inline-editable) + a dropdown to switch between the workspace's
// campaigns or start a new build. Switching sets the campaign primary and
// navigates to it (keeping the current view).
export const CampaignSwitcher = ({ view, onRename, onBuildNew }: Props) => {
  const { tenantId, sessionId, campaign, list, setList } = useCampaignWorkspace()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const switchTo = (id: string) => {
    setOpen(false)
    if (id === campaign.campaign_id) return
    void setPrimaryCampaign(sessionId, tenantId, id)
    setCampaignMode(tenantId, id)
    setList((prev) => prev.map((c) => ({ ...c, is_primary: c.campaign_id === id })))
    navigate(`/campaigns/${id}/${view}`)
  }

  return (
    <div className="relative min-w-0" ref={ref}>
      <div className="flex items-center gap-1.5">
        {campaign.is_primary && (
          <svg className="w-3.5 h-3.5 text-utility-warning-700 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
        <EditableText value={campaign.campaign_name} onSave={(v) => v.trim() && onRename(v.trim())} className="title-h5 text-primary" />
        <button onClick={() => setOpen(!open)}>
          <svg className={`w-4 h-4 text-tertiary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-secondary border border-secondary rounded-xl shadow-lg z-20 min-w-56 max-w-80 overflow-hidden">
          {list.map((c) => (
            <button key={c.campaign_id} onClick={() => switchTo(c.campaign_id)}
              className={`w-full text-left px-3 py-2.5 paragraph-sm hover:bg-tertiary transition-colors ${c.campaign_id === campaign.campaign_id ? 'text-primary font-medium bg-tertiary' : 'text-secondary'}`}>
              {c.is_primary ? '★ ' : ''}{c.campaign_name}
              {c.status === 'draft' && <span className="ml-1.5 text-quaternary label-xs">draft</span>}
            </button>
          ))}
          <div className="border-t border-tertiary">
            <button onClick={() => { setOpen(false); onBuildNew() }} className="w-full text-left px-3 py-2.5 paragraph-sm text-tertiary hover:bg-tertiary hover:text-primary transition-colors flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Build new campaign
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
