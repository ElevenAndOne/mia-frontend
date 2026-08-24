import { useCallback } from 'react'
import { useSession } from '../../../contexts/session-context'
import {
  buildAssetFinalUrl,
  patchAsset,
  patchChannelAction,
  patchPushConfig,
  suggestGoogleSearch,
} from '../services/campaign-api'

// The write half of launch readiness: every inline fix a checklist row can apply.
// Each one re-checks the channel it touched, so the row it came from turns green
// in place rather than going quiet. Split from use-launch-readiness.ts, which
// owns loading and re-checking.
export function useLaunchFixes(
  campaignId: string,
  check: (actionId: string) => Promise<string | null>,
) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id

  // Fix a check from its own row: write the field on every ad the check points at,
  // then re-check so the row turns green in place rather than going quiet.
  const fixAssets = useCallback(
    async (actionId: string, assetIds: string[], fields: Record<string, unknown>): Promise<string | null> => {
      if (!sessionId || !tenantId) return 'Not signed in'
      for (const assetId of assetIds) {
        const res = await patchAsset(sessionId, tenantId, campaignId, assetId, fields)
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          return body?.detail || `Could not update that ad (${res.status})`
        }
      }
      return check(actionId)
    },
    [sessionId, tenantId, campaignId, check],
  )

  // Same fix, but run the landing page through the campaign's UTM builder first.
  // Per ad, not once: utm_content comes from the ad's own name, so two ads on one
  // landing page must not end up sharing a tag — that's how a report stops being
  // able to tell them apart.
  const tagAndFixAssets = useCallback(
    async (actionId: string, assetIds: string[], baseUrl: string): Promise<string | null> => {
      if (!sessionId || !tenantId) return 'Not signed in'
      for (const assetId of assetIds) {
        try {
          const tagged = await buildAssetFinalUrl(sessionId, tenantId, campaignId, assetId, baseUrl)
          const res = await patchAsset(sessionId, tenantId, campaignId, assetId, {
            final_url: tagged,
          })
          if (!res.ok) {
            const body = await res.json().catch(() => null)
            return body?.detail || `Could not update that ad (${res.status})`
          }
        } catch (e) {
          return e instanceof Error ? e.message : 'Could not build the tracking link'
        }
      }
      return check(actionId)
    },
    [sessionId, tenantId, campaignId, check],
  )

  // What the tagged link will look like, before committing to it.
  const previewTaggedUrl = useCallback(
    async (assetId: string, baseUrl: string): Promise<string | null> => {
      if (!sessionId || !tenantId) return null
      try {
        return await buildAssetFinalUrl(sessionId, tenantId, campaignId, assetId, baseUrl)
      } catch {
        return null
      }
    },
    [sessionId, tenantId, campaignId],
  )

  // The channel's own settings — budget, flight dates.
  const fixChannel = useCallback(
    async (actionId: string, fields: Record<string, unknown>): Promise<string | null> => {
      if (!sessionId || !tenantId) return 'Not signed in'
      const res = await patchChannelAction(sessionId, tenantId, campaignId, actionId, fields)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        return body?.detail || `Could not update the channel (${res.status})`
      }
      return check(actionId)
    },
    [sessionId, tenantId, campaignId, check],
  )

  // Push-profile keys (e.g. the special ad category declaration), merged.
  const fixPushConfig = useCallback(
    async (actionId: string, patch: Record<string, unknown>): Promise<string | null> => {
      if (!sessionId || !tenantId) return 'Not signed in'
      try {
        await patchPushConfig(sessionId, tenantId, campaignId, actionId, patch)
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not save that setting'
      }
      return check(actionId)
    },
    [sessionId, tenantId, campaignId, check],
  )

  // Mia's draft copy and keywords for one ad, for the person to read and edit.
  // Deliberately NOT saved: the whole point of the fix box is that a human sees
  // the words before they become a live ad. Same endpoint the Google preflight
  // modal's "Suggest" already uses.
  const suggestForAsset = useCallback(
    async (actionId: string, assetId: string) => {
      if (!sessionId || !tenantId) return null
      const res = await suggestGoogleSearch(sessionId, tenantId, campaignId, actionId)
      const mine = res.assets?.find((a) => a.asset_id === assetId) ?? res.assets?.[0]
      if (!mine) return null
      return {
        headlines: (mine.headlines ?? []).map((h) => h.text).join('\n'),
        descriptions: (mine.descriptions ?? []).map((d) => d.text).join('\n'),
        keywords: (mine.keywords ?? [])
          .map((k) => (k.match && k.match !== 'BROAD' ? `${k.text} | ${k.match}` : k.text))
          .join('\n'),
      }
    },
    [sessionId, tenantId, campaignId],
  )

  return {
    fixAssets,
    fixChannel,
    fixPushConfig,
    tagAndFixAssets,
    previewTaggedUrl,
    suggestForAsset,
  }
}
