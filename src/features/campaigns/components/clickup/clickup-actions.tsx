import { useState } from 'react'
import { usePlugins } from '../../../plugins/hooks/use-plugins'
import { useClickUp } from '../../hooks/use-clickup'
import { useClickUpBrowse } from '../../hooks/use-clickup-browse'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import { ClickUpPushModal } from './clickup-push-modal'
import { ClickUpSyncModal } from './clickup-sync-modal'
import { ClickUpUpdateModal } from './clickup-update-modal'

type Modal = 'sync' | 'update' | 'push' | null

const iconBtn = 'p-1 transition-colors disabled:opacity-50'

// ClickUp sync-check / update / push controls for the Builder header. Only
// rendered when the ClickUp plugin is enabled for the workspace.
export const ClickUpActions = () => {
  const { isEnabled } = usePlugins()
  const { campaign } = useCampaignWorkspace()
  const cu = useClickUp()
  const browse = useClickUpBrowse()
  const [modal, setModal] = useState<Modal>(null)

  if (!isEnabled('clickup')) return null

  const openPush = () => { cu.resetPush(); void browse.loadSpaces(); setModal('push') }

  return (
    <>
      <button onClick={() => { void cu.runSync(); setModal('sync') }} title="Check ClickUp sync" className={iconBtn}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
      </button>
      <button onClick={() => { void cu.runUpdate(); setModal('update') }} disabled={cu.updating} title="Update ClickUp tasks" className={iconBtn}>
        <svg className={`w-4 h-4 ${cu.updating ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 019-9" /></svg>
      </button>
      <button onClick={openPush} title="Push to ClickUp" className={iconBtn}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M3 14.5L12 4l9 10.5" stroke="#7B68EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 19.5L12 15l5 4.5" stroke="#00C4FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {modal === 'push' && (
        <ClickUpPushModal browse={browse} result={cu.pushResult} pushing={cu.pushing} error={cu.pushError} clickupListId={cu.clickupListId} onPush={cu.pushSummary} onClose={() => setModal(null)} />
      )}
      {modal === 'sync' && (
        <ClickUpSyncModal result={cu.syncResult} loading={cu.syncLoading} error={cu.syncError} campaignName={campaign.campaign_name} onClose={() => setModal(null)} onPushMissing={openPush} />
      )}
      {modal === 'update' && (
        <ClickUpUpdateModal result={cu.updateResult} updating={cu.updating} error={cu.updateError} onClose={() => setModal(null)} />
      )}
    </>
  )
}
