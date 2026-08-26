import { useCallback, useState } from 'react'
import { fetchClickupSync, invokeClickup, linkClickupList, patchAsset } from '../services/campaign-api'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import type {
  ClickUpAdsPushResult,
  ClickUpPullResult,
  ClickUpPushResult,
  ClickUpUpdateResult,
  ReadyAd,
  SyncResult,
} from '../types'

// ClickUp campaign operations: sync-check, update, push-summary, and the ad
// round-trip (push each ad as a task, pull approved ads back). Browsing
// spaces/folders/lists (for the push target) lives in use-clickup-browse.
export function useClickUp() {
  const { tenantId, sessionId, campaign, reloadDetail } = useCampaignWorkspace()
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
    // push_campaign_ads updates linked tasks' names + descriptions in place on
    // repeat pushes — the 0.4.0 replacement for the removed update_campaign_summary.
    try {
      const r = (await invokeClickup(sessionId, tenantId, 'push_campaign_ads', { campaign_id: id })) as ClickUpAdsPushResult
      // Totals, not ads alone — phase/channel tasks count as pushed work too.
      setUpdateResult({
        tasks_updated: r.tasks_updated ?? r.ads_updated,
        tasks_created: r.tasks_created ?? r.ads_created,
      })
    }
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

  // ── Ad round-trip ──────────────────────────────────────────────────────────

  const [adsResult, setAdsResult] = useState<ClickUpAdsPushResult | null>(null)
  const [pushingAds, setPushingAds] = useState(false)
  const [adsError, setAdsError] = useState('')

  const pushAds = useCallback(
    async (listId: string) => {
      if (!listId) { setAdsError('Please select a list first'); return }
      setPushingAds(true); setAdsError(''); setAdsResult(null)
      try {
        setAdsResult((await invokeClickup(sessionId, tenantId, 'push_campaign_ads', { campaign_id: id, list_id: listId })) as ClickUpAdsPushResult)
        // Remember the target so later pushes don't have to ask again, and so a
        // deleted task can be recreated on the update path (which sends no list_id).
        // Best-effort: the push already succeeded, so a failure here isn't the user's problem.
        try { await linkClickupList(sessionId, tenantId, id, listId) } catch { /* non-critical */ }
      }
      catch (e) { setAdsError(e instanceof Error ? e.message : 'Push ads to ClickUp failed') }
      finally { setPushingAds(false) }
    },
    [sessionId, tenantId, id],
  )

  const resetAds = useCallback(() => { setAdsResult(null); setAdsError('') }, [])

  const [pullResult, setPullResult] = useState<ClickUpPullResult | null>(null)
  const [pulling, setPulling] = useState(false)
  const [pullError, setPullError] = useState('')
  const [applying, setApplying] = useState(false)

  const runPull = useCallback(async () => {
    setPulling(true); setPullError(''); setPullResult(null)
    try { setPullResult((await invokeClickup(sessionId, tenantId, 'pull_ready_ads', { campaign_id: id })) as unknown as ClickUpPullResult) }
    catch (e) { setPullError(e instanceof Error ? e.message : 'Pull from ClickUp failed') }
    finally { setPulling(false) }
  }, [sessionId, tenantId, id])

  // Apply the studio's approved ads back onto the campaign: creative link, final
  // URL (if edited in ClickUp), and mark the asset ready. Returns true only if every
  // PATCH succeeded — apiFetch doesn't throw on HTTP errors, so we check res.ok and
  // surface failures rather than falsely reporting success.
  const applyPulled = useCallback(
    async (ads: ReadyAd[]): Promise<boolean> => {
      setApplying(true)
      setPullError('')
      try {
        const failed: string[] = []
        for (const ad of ads) {
          const fields: Record<string, string> = { status: 'ready' }
          if (ad.deliverable_url) fields.deliverable_url = ad.deliverable_url
          if (ad.final_url) fields.final_url = ad.final_url
          const res = await patchAsset(sessionId, tenantId, id, ad.asset_id, fields)
          if (!res.ok) failed.push(ad.asset_id)
        }
        await reloadDetail()
        if (failed.length) {
          setPullError(`Couldn't apply ${failed.length} of ${ads.length} ad${ads.length === 1 ? '' : 's'} — check your permissions and try again.`)
          return false
        }
        return true
      } catch (e) {
        setPullError(e instanceof Error ? e.message : 'Failed to apply changes')
        return false
      } finally {
        setApplying(false)
      }
    },
    [sessionId, tenantId, id, reloadDetail],
  )

  const resetPull = useCallback(() => { setPullResult(null); setPullError('') }, [])

  return {
    clickupListId: campaign.clickup_list_id,
    syncResult, syncLoading, syncError, runSync,
    updateResult, updating, updateError, runUpdate,
    pushResult, pushing, pushError, pushSummary, resetPush,
    adsResult, pushingAds, adsError, pushAds, resetAds,
    pullResult, pulling, pullError, runPull, applyPulled, applying, resetPull,
  }
}
