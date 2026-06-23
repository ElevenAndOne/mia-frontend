// Calendar data: extract scheduled posts (assets with a date) from a campaign and
// lay them out on a month grid. An asset's date is its launch date, else its
// flight start (see assetDate).

import type { CampaignDetail } from '../types'
import { assetTypeColor, channelColor, channelLabel } from './channel-colors'
import { assetDate } from './campaign-dates'

export interface CalendarEvent {
  iso: string
  channel: string
  channelLabel: string
  color: string
  type: string | null
  typeColor: string
  name: string
}

export function buildCalendarEvents(campaign: CampaignDetail): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const phase of campaign.phases) {
    for (const ca of phase.channel_actions) {
      for (const a of ca.assets) {
        const d = assetDate(a)
        if (!d) continue
        events.push({
          iso: d.slice(0, 10),
          channel: ca.channel,
          channelLabel: channelLabel(ca.channel),
          color: channelColor(ca.channel),
          type: a.asset_type,
          typeColor: assetTypeColor(a.asset_type),
          name: a.asset_name,
        })
      }
    }
  }
  return events
}

// Distinct channels present among events, in first-seen order (for the chips).
export function eventChannels(events: CalendarEvent[]): { channel: string; label: string; color: string }[] {
  const seen = new Set<string>()
  const out: { channel: string; label: string; color: string }[] = []
  for (const e of events) {
    if (seen.has(e.channel)) continue
    seen.add(e.channel)
    out.push({ channel: e.channel, label: e.channelLabel, color: e.color })
  }
  return out
}

// Sorted unique 'YYYY-MM' that contain at least one event.
export function eventMonths(events: CalendarEvent[]): string[] {
  return [...new Set(events.map((e) => e.iso.slice(0, 7)))].sort()
}

export interface DayCell {
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
  weekend: boolean
  events: CalendarEvent[]
  moreCount: number
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const ymd = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

// 6-week (Mon-first) grid for a 'YYYY-MM', with active-channel events per day.
export function buildMonthGrid(
  month: string,
  events: CalendarEvent[],
  active: Set<string>,
  maxPerCell: number,
  todayIso: string,
): DayCell[] {
  const [y, mo] = month.split('-').map(Number)
  const daysInMonth = new Date(y, mo, 0).getDate()
  const first = new Date(y, mo - 1, 1)
  const startOffset = (first.getDay() + 6) % 7 // Monday = 0
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7
  const gridStart = new Date(y, mo - 1, 1 - startOffset)

  const byDate = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    if (!active.has(e.channel)) continue
    const arr = byDate.get(e.iso) ?? []
    arr.push(e)
    byDate.set(e.iso, arr)
  }

  const cells: DayCell[] = []
  for (let i = 0; i < totalCells; i++) {
    const cur = new Date(gridStart)
    cur.setDate(gridStart.getDate() + i)
    const iso = ymd(cur)
    const inMonth = cur.getMonth() === mo - 1
    const all = inMonth ? byDate.get(iso) ?? [] : []
    cells.push({
      iso,
      day: cur.getDate(),
      inMonth,
      isToday: iso === todayIso,
      weekend: i % 7 >= 5,
      events: all.slice(0, maxPerCell),
      moreCount: Math.max(0, all.length - maxPerCell),
    })
  }
  return cells
}
