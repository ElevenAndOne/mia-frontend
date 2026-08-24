import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import {
  fetchCampaignLaunchReadiness,
  revokeLaunchCheckWaiver,
  runLaunchChecks,
  waiveLaunchCheck,
} from '../services/campaign-api'
import { useLaunchFixes } from './use-launch-fixes'
import type { CampaignLaunchReadiness, LaunchCheckSnapshot } from '../types'

// A saved result older than this is worth refreshing on open: budgets, account
// status and landing pages all move underneath us during a working day.
const STALE_AFTER_MS = 6 * 60 * 60 * 1000
// Bound on how much a single panel-open will do unasked. Beyond this the user can
// press "Check every channel" — better than a ten-minute silent burst of API calls.
const MAX_AUTO_CHECKS = 8

// Loading the roll-up is cheap (saved snapshots, one query). RUNNING a check is not:
// it asks the ad platform about the account, the campaign objects and every creative
// URL. So the panel loads instantly, then quietly fills in the channels that have
// never been checked (or whose result has gone stale) one at a time — the user reads
// the first card while the rest arrive, instead of pressing a button and waiting.
export function useLaunchReadiness(campaignId: string, enabled: boolean) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const [data, setData] = useState<CampaignLaunchReadiness | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState<string[]>([]) // action_ids in flight
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId || !tenantId || !campaignId) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchCampaignLaunchReadiness(sessionId, tenantId, campaignId))
    } catch {
      setError('Could not load launch readiness')
    } finally {
      setLoading(false)
    }
  }, [sessionId, tenantId, campaignId])

  useEffect(() => {
    if (enabled) void load()
  }, [enabled, load])

  // Replace one channel's snapshot in place and recompute the totals, so a re-check
  // updates the header without re-fetching the whole campaign.
  const applySnapshot = useCallback((actionId: string, snapshot: LaunchCheckSnapshot) => {
    setData((prev) => {
      if (!prev) return prev
      const channels = prev.channels.map((c) =>
        c.action_id === actionId && c.platform === snapshot.platform ? { ...c, snapshot } : c,
      )
      const totals = channels.reduce(
        (t, c) =>
          c.snapshot
            ? {
                ...t,
                blocking: t.blocking + c.snapshot.blocking_count,
                warnings: t.warnings + c.snapshot.warning_count,
                waived: t.waived + c.snapshot.waived_count,
                unknown: t.unknown + c.snapshot.unknown_count,
                passed: t.passed + c.snapshot.passed_count,
              }
            : { ...t, unchecked: t.unchecked + 1 },
        { blocking: 0, warnings: 0, waived: 0, unknown: 0, passed: 0, unchecked: 0 },
      )
      return { ...prev, channels, totals }
    })
  }, [])

  const check = useCallback(
    async (actionId: string): Promise<string | null> => {
      if (!sessionId || !tenantId) return 'Not signed in'
      setChecking((prev) => [...prev, actionId])
      try {
        applySnapshot(actionId, await runLaunchChecks(sessionId, tenantId, campaignId, actionId))
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'Readiness check failed'
      } finally {
        setChecking((prev) => prev.filter((id) => id !== actionId))
      }
    },
    [sessionId, tenantId, campaignId, applySnapshot],
  )

  // Sequential on purpose: each check is several platform round-trips, and firing
  // ten at once would rate-limit the account rather than finish sooner.
  const checkAll = useCallback(async (): Promise<string | null> => {
    const ids = (data?.channels ?? []).map((c) => c.action_id)
    let firstError: string | null = null
    for (const id of ids) {
      const err = await check(id)
      if (err && !firstError) firstError = err
    }
    return firstError
  }, [data, check])

  const {
    fixAssets,
    fixChannel,
    fixPushConfig,
    tagAndFixAssets,
    previewTaggedUrl,
    suggestForAsset,
  } = useLaunchFixes(campaignId, check)

  const setWaiver = useCallback(
    async (actionId: string, code: string, waive: boolean, reason?: string): Promise<string | null> => {
      if (!sessionId || !tenantId) return 'Not signed in'
      try {
        const res = waive
          ? await waiveLaunchCheck(sessionId, tenantId, campaignId, actionId, code, reason)
          : await revokeLaunchCheckWaiver(sessionId, tenantId, campaignId, actionId, code)
        // The decision is stored against a snapshot server-side, so what comes back
        // is authoritative — no need to re-run the platform checks to see it.
        if (res.snapshot) {
          applySnapshot(actionId, res.snapshot)
          return null
        }
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not update that waiver'
      }
      // No stored snapshot to restate (first-ever decision on this channel) — run
      // the checks so the screen and the roll-up agree.
      return check(actionId)
    },
    [sessionId, tenantId, campaignId, check, applySnapshot],
  )

  // Fill in what nobody has checked yet, once per open, oldest gap first.
  const autoRan = useRef(false)
  useEffect(() => {
    if (!enabled || !data || autoRan.current) return
    const stale = (iso: string | null | undefined) =>
      !iso || Date.now() - new Date(iso).getTime() > STALE_AFTER_MS
    const todo = data.channels
      .filter(
        (c) =>
          !c.snapshot ||
          stale(c.snapshot.checked_at) ||
          // A red row people came here to act on has to be current: an account
          // linked (or a budget set) elsewhere five minutes ago must not still
          // show as blocking.
          c.snapshot.blocking_count > 0,
      )
      .slice(0, MAX_AUTO_CHECKS)
      .map((c) => c.action_id)
    if (todo.length === 0) return
    autoRan.current = true
    void (async () => {
      for (const id of todo) await check(id)
    })()
  }, [enabled, data, check])

  return {
    data,
    loading,
    checking,
    error,
    reload: load,
    check,
    checkAll,
    setWaiver,
    fixAssets,
    fixChannel,
    fixPushConfig,
    tagAndFixAssets,
    previewTaggedUrl,
    suggestForAsset,
  }
}
