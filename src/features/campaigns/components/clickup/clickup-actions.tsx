import { useState } from 'react'
import { usePlugins } from '../../../plugins/hooks/use-plugins'
import { useClickUp } from '../../hooks/use-clickup'
import { useClickUpBrowse } from '../../hooks/use-clickup-browse'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import { StudioPushModal } from './studio-push-modal'
import { ClickUpPullModal } from './clickup-pull-modal'
import { ClickUpSyncModal } from './clickup-sync-modal'

type Modal = 'studio' | 'sync' | 'pull' | null

// ClickUp controls for the Builder header (7 Oct 2026): one labelled "Send to studio"
// button opens the checklist that pushes (and re-pushes) the campaign; the sync check and
// the pull of approved ads sit behind a small menu. Only rendered when the plugin is enabled.
export const ClickUpActions = () => {
  const { isEnabled } = usePlugins()
  const { campaign } = useCampaignWorkspace()
  const cu = useClickUp()
  const browse = useClickUpBrowse()
  const [modal, setModal] = useState<Modal>(null)
  const [menu, setMenu] = useState(false)
  const [applied, setApplied] = useState(false)

  if (!isEnabled('clickup')) return null

  const openStudio = () => { setMenu(false); cu.resetStudio(); setModal('studio') }
  const openPull = () => { setMenu(false); setApplied(false); cu.resetPull(); void cu.runPull(); setModal('pull') }
  const openSync = () => { setMenu(false); void cu.runSync(); setModal('sync') }

  const applyPull = async () => {
    if (!cu.pullResult) return
    const ok = await cu.applyPulled(cu.pullResult.ready)
    if (ok) setApplied(true)
  }

  return (
    <>
      <div className="relative flex items-center gap-1">
        <button
          onClick={openStudio}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#7B68EE]/10 text-[#5a48c7] hover:bg-[#7B68EE]/20 paragraph-xs font-medium"
          title="Check every task, then send the campaign to ClickUp"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14.5L12 4l9 10.5" /><path d="M7 19.5L12 15l5 4.5" /></svg>
          Send to studio
        </button>
        <button onClick={() => setMenu((m) => !m)} className="p-1 rounded-md hover:bg-tertiary text-tertiary" title="More ClickUp actions" aria-haspopup="menu" aria-expanded={menu}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
        </button>
        {menu && (
          <div className="absolute right-0 top-full mt-1 z-20 bg-secondary border border-secondary rounded-lg shadow-lg min-w-[200px] py-1" role="menu">
            <button role="menuitem" onClick={openSync} className="w-full text-left px-3 py-2 paragraph-xs text-primary hover:bg-tertiary">Check what's in ClickUp</button>
            <button role="menuitem" onClick={openPull} disabled={cu.pulling} className="w-full text-left px-3 py-2 paragraph-xs text-primary hover:bg-tertiary disabled:opacity-50">Pull approved ads back</button>
          </div>
        )}
      </div>

      {modal === 'studio' && (
        <StudioPushModal
          browse={browse}
          preview={cu.studioPreview}
          loading={cu.studioLoading}
          pushing={cu.studioPushing}
          error={cu.studioError}
          result={cu.studioResult}
          savedListId={cu.clickupListId}
          onLoadPreview={(listId) => void cu.loadStudioPreview(listId)}
          onPush={(listId, defaults, rows, remember) => void cu.sendToStudio(listId, defaults, rows, remember)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'pull' && (
        <ClickUpPullModal result={cu.pullResult} loading={cu.pulling} applying={cu.applying} error={cu.pullError} applied={applied} onApply={() => void applyPull()} onClose={() => setModal(null)} />
      )}
      {modal === 'sync' && (
        <ClickUpSyncModal result={cu.syncResult} loading={cu.syncLoading} error={cu.syncError} campaignName={campaign.campaign_name} onClose={() => setModal(null)} onPushMissing={openStudio} />
      )}
    </>
  )
}
