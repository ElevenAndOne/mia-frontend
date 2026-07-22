import { useState } from 'react'
import { usePlugins } from '../../../plugins/hooks/use-plugins'
import { useClickUp } from '../../hooks/use-clickup'
import { useClickUpBrowse } from '../../hooks/use-clickup-browse'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import { ClickUpPushAdsModal } from './clickup-push-ads-modal'
import { ClickUpPullModal } from './clickup-pull-modal'
import { ClickUpSyncModal } from './clickup-sync-modal'
import { ClickUpUpdateModal } from './clickup-update-modal'

type Modal = 'sync' | 'update' | 'push-ads' | 'pull' | null

const iconBtn = 'p-1 transition-colors disabled:opacity-50'

// ClickUp controls for the Builder header: sync-check, update, the campaign push
// (0.4.0 — full structure: overview task + phase parents + nested ad subtasks),
// and the pull (approved ads back). Only rendered when the plugin is enabled.
export const ClickUpActions = () => {
  const { isEnabled } = usePlugins()
  const { campaign } = useCampaignWorkspace()
  const cu = useClickUp()
  const browse = useClickUpBrowse()
  const [modal, setModal] = useState<Modal>(null)
  const [applied, setApplied] = useState(false)

  if (!isEnabled('clickup')) return null

  const openPushAds = () => { cu.resetAds(); void browse.loadSpaces(); setModal('push-ads') }
  const openPull = () => { setApplied(false); cu.resetPull(); void cu.runPull(); setModal('pull') }

  const applyPull = async () => {
    if (!cu.pullResult) return
    const ok = await cu.applyPulled(cu.pullResult.ready)
    if (ok) setApplied(true)
  }

  return (
    <>
      <button onClick={() => { void cu.runSync(); setModal('sync') }} title="Check ClickUp sync" className={iconBtn}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
      </button>
      <button onClick={() => { void cu.runUpdate(); setModal('update') }} disabled={cu.updating} title="Update ClickUp tasks" className={iconBtn}>
        <svg className={`w-4 h-4 ${cu.updating ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 019-9" /></svg>
      </button>
      <button onClick={openPushAds} title="Push campaign to ClickUp (overview + phases + ad subtasks)" className={iconBtn}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="5" rx="1" /><rect x="3" y="13" width="18" height="5" rx="1" /><path d="M8 21h8" stroke="#00C4FF" /></svg>
      </button>
      <button onClick={openPull} disabled={cu.pulling} title="Sync from ClickUp (pull approved ads)" className={iconBtn}>
        <svg className={`w-4 h-4 ${cu.pulling ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" stroke="#00C4FF" /><path d="M7 10l5 5 5-5" stroke="#00C4FF" /><path d="M4 21h16" /></svg>
      </button>

      {modal === 'push-ads' && (
        <ClickUpPushAdsModal browse={browse} result={cu.adsResult} pushing={cu.pushingAds} error={cu.adsError} clickupListId={cu.clickupListId} onPush={cu.pushAds} onClose={() => setModal(null)} />
      )}
      {modal === 'pull' && (
        <ClickUpPullModal result={cu.pullResult} loading={cu.pulling} applying={cu.applying} error={cu.pullError} applied={applied} onApply={() => void applyPull()} onClose={() => setModal(null)} />
      )}
      {modal === 'sync' && (
        <ClickUpSyncModal result={cu.syncResult} loading={cu.syncLoading} error={cu.syncError} campaignName={campaign.campaign_name} onClose={() => setModal(null)} onPushMissing={openPushAds} />
      )}
      {modal === 'update' && (
        <ClickUpUpdateModal result={cu.updateResult} updating={cu.updating} error={cu.updateError} onClose={() => setModal(null)} />
      )}
    </>
  )
}
