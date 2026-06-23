import { useMemo, useState } from 'react'
import { CampaignIdentityHeader } from '../components/campaign-identity-header'
import { CalendarControls } from '../components/calendar/calendar-controls'
import { CalendarGrid } from '../components/calendar/calendar-grid'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import { buildCalendarEvents, buildMonthGrid, eventChannels, eventMonths } from '../utils/calendar-data'

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const CalendarView = () => {
  const { campaign } = useCampaignWorkspace()
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
          <CalendarGrid cells={grid} />
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <p className="paragraph-xs text-quaternary">Toggle channels above to filter what shows on each date. Hover a post for details.</p>
            <p className="paragraph-xs text-quaternary cw-mono">{visibleTotal} posts visible</p>
          </div>
        </>
      )}
    </div>
  )
}
