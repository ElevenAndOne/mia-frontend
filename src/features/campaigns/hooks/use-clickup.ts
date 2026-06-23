import { useCallback, useState } from 'react'
import { fetchClickupSync, invokeClickup } from '../services/campaign-api'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import type { ClickUpPushResult, ClickUpUpdateResult, SyncResult } from '../types'

// ClickUp campaign operations: sync-check, update, and push-summary. Browsing
// spaces/folders/lists (for the push target) lives in use-clickup-browse.
export function useClickUp() {
  const { tenantId, sessionId, campaign } = useCampaignWorkspace()
  const id = campaign.campaign_id

  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncError, setSyncError] = useState('')

  const [updateResult, setUpdateResult] = useState<ClickUpUpdateResult | null>(null)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')

  const [pushResult, setPushResult] = useState<ClickUpPushResult | null>(null)
  const [pushing, setPushing] = useState(false)
  const [pushError, setPushError] = useState('')

  const runSync = useCallback(async () => {
    setSyncLoading(true); setSyncError(''); setSyncResult(null)
    try { setSyncResult(await fetchClickupSync(sessionId, tenantId, id)) }
    catch (e) { setSyncError(e instanceof Error ? e.message : 'Sync check failed') }
    finally { setSyncLoading(false) }
  }, [sessionId, tenantId, id])

  const runUpdate = useCallback(async () => {
    setUpdating(true); setUpdateError(''); setUpdateResult(null)
    try { setUpdateResult((await invokeClickup(sessionId, tenantId, 'update_campaign_summary', { campaign_id: id })) as ClickUpUpdateResult) }
    catch (e) { setUpdateError(e instanceof Error ? e.message : 'Update failed') }
    finally { setUpdating(false) }
  }, [sessionId, tenantId, id])

  const pushSummary = useCallback(
    async (listId: string) => {
      if (!listId) { setPushError('Please select a list first'); return }
      setPushing(true); setPushError(''); setPushResult(null)
      try { setPushResult((await invokeClickup(sessionId, tenantId, 'push_campaign_summary', { campaign_id: id, list_id: listId })) as ClickUpPushResult) }
      catch (e) { setPushError(e instanceof Error ? e.message : 'Push to ClickUp failed') }
      finally { setPushing(false) }
    },
    [sessionId, tenantId, id],
  )

  const resetPush = useCallback(() => { setPushResult(null); setPushError('') }, [])

  return {
    clickupListId: campaign.clickup_list_id,
    syncResult, syncLoading, syncError, runSync,
    updateResult, updating, updateError, runUpdate,
    pushResult, pushing, pushError, pushSummary, resetPush,
  }
}
