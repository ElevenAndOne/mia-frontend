import { useCallback, useMemo, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { CampaignIdentityHeader } from '../components/campaign-identity-header'
import { CalendarControls } from '../components/calendar/calendar-controls'
import { CalendarGrid } from '../components/calendar/calendar-grid'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import { clearCampaignDetailCache } from '../campaign-detail-cache'
import { patchAsset } from '../services/campaign-api'
import { buildCalendarEvents, buildMonthGrid, eventChannels, eventMonths } from '../utils/calendar-data'
import type { Asset } from '../types'

const EDIT_ROLES = new Set(['owner', 'admin', 'analyst'])

/** Shift an ISO date by the same day-delta (used to move a flight preserving duration). */
const shiftIso = (iso: string, deltaMs: number) =>
  new Date(Date.parse(iso.slice(0, 10)) + deltaMs).toISOString().slice(0, 10)

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const CalendarView = () => {
  const { campaign, setCampaign, openAssetPreview, sessionId, tenantId } = useCampaignWorkspace()
  const { activeWorkspace } = useSession()
  const canEdit = EDIT_ROLES.has(activeWorkspace?.role ?? '')

  // Drag-to-reschedule: organic posts move their launch_date; paid flights shift
  // start+end preserving duration; undated assets (inheriting the channel date)
  // get an explicit launch_date. Optimistic local update, then the same PATCH
  // the builder uses — so builder view + ClickUp mirror stay in step.
  const moveAsset = useCallback(
    async (assetId: string, newIso: string) => {
      let found: Asset | null = null
      for (const p of campaign.phases)
        for (const ca of p.channel_actions)
          for (const a of ca.assets) if (a.asset_id === assetId) found = a
      if (!found) return

      const details = (found.details ?? {}) as Record<string, unknown>
      const patch: Record<string, unknown> = {}
      if (typeof details.launch_date === 'string' && details.launch_date) {
        patch.details = { ...details, launch_date: newIso }
      } else if (found.start_date) {
        const delta = Date.parse(newIso) - Date.parse(found.start_date.slice(0, 10))
        if (delta === 0) return
        patch.start_date = newIso
        if (found.end_date) patch.end_date = shiftIso(found.end_date, delta)
      } else {
        patch.details = { ...details, launch_date: newIso }
      }

      // Optimistic: the chip jumps immediately; the PATCH persists it.
      setCampaign((prev) =>
        prev
          ? {
              ...prev,
              phases: prev.phases.map((p) => ({
                ...p,
                channel_actions: p.channel_actions.map((ca) => ({
                  ...ca,
                  assets: ca.assets.map((a) =>
                    a.asset_id === assetId ? ({ ...a, ...patch } as Asset) : a
                  ),
                })),
              })),
            }
          : prev
      )
      clearCampaignDetailCache()
      try {
        await patchAsset(sessionId, tenantId, campaign.campaign_id, assetId, patch)
      } catch {
        /* PATCH failed — next detail load reconciles to the server state */
      }
    },
    [campaign, setCampaign, sessionId, tenantId]
  )

  const events = useMemo(() => buildCalendarEvents(campaign), [campaign])
  const channels = useMemo(() => eventChannels(events), [events])
  const months = useMemo(() => eventMonths(events), [events])
  const today = todayIso()
  const todayMonth = today.slice(0, 7)

  const [active, setActive] = useState<Set<string> | null>(null)
  const effectiveActive = useMemo(() => active ?? new Set(channels.map((c) => c.channel)), [active, channels])
  const toggle = (channel: string) =>
    setActive((prev) => {
      const next = new Set(prev ?? channels.map((c) => c.channel))
      if (next.has(channel)) next.delete(channel)
      else next.add(channel)
      return next
    })

  const [month, setMonth] = useState<string | null>(null)
  const effectiveMonth = month ?? (months.includes(todayMonth) ? todayMonth : months[0] ?? todayMonth)
  const idx = months.indexOf(effectiveMonth)

  const grid = useMemo(
    () => buildMonthGrid(effectiveMonth, events, effectiveActive, 4, today),
    [effectiveMonth, events, effectiveActive, today],
  )

  const inMonth = events.filter((e) => e.iso.slice(0, 7) === effectiveMonth)
  const monthCounts: Record<string, number> = {}
  for (const e of inMonth) monthCounts[e.channel] = (monthCounts[e.channel] ?? 0) + 1
  const monthPostCount = inMonth.filter((e) => effectiveActive.has(e.channel)).length
  const visibleTotal = events.filter((e) => effectiveActive.has(e.channel)).length
  const [y, mo] = effectiveMonth.split('-').map(Number)
  const monthLabel = new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      <CampaignIdentityHeader view="calendar" />

      {events.length === 0 ? (
        <div className="bg-secondary-alt border border-secondary rounded-2xl p-10 text-center">
          <p className="paragraph-sm text-tertiary">No scheduled posts yet.</p>
          <p className="paragraph-xs text-quaternary mt-1">Add launch dates to assets in the Builder and they'll appear here.</p>
        </div>
      ) : (
        <>
          <CalendarControls
            channels={channels}
            active={effectiveActive}
            monthCounts={monthCounts}
            onToggle={toggle}
            monthLabel={monthLabel}
            monthPostCount={monthPostCount}
            onPrev={() => idx > 0 && setMonth(months[idx - 1])}
            onNext={() => idx < months.length - 1 && setMonth(months[idx + 1])}
            prevDisabled={idx <= 0}
            nextDisabled={idx >= months.length - 1}
          />
          <CalendarGrid cells={grid} onOpenAsset={openAssetPreview} onMoveAsset={canEdit ? moveAsset : undefined} />
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <p className="paragraph-xs text-quaternary">Toggle channels above to filter what shows on each date. Hover a post for details.</p>
            <p className="paragraph-xs text-quaternary cw-mono">{visibleTotal} posts visible</p>
          </div>
        </>
      )}
    </div>
  )
}
