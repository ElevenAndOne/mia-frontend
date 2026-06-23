// Pure transforms that turn a campaign into the Overview's funnel + timeline +
// budget shapes. Kept out of components so the view stays presentational.

import type { CampaignDetail } from '../types'
import { assetTypeColor, channelColor, channelLabel } from './channel-colors'
import { assetDate } from './campaign-dates'
import { phaseHue, phaseRole } from './phase-roles'

export interface FunnelPhase {
  phaseId: string
  num: string
  name: string
  role: string
  hue: string
  objective: string
  primaryValue: string | null
  primaryLabel: string | null
  secondary: string | null
  channels: { name: string; label: string; color: string }[]
}

export function buildFunnel(campaign: CampaignDetail): FunnelPhase[] {
  return [...campaign.phases]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p, i) => {
      const seen = new Set<string>()
      const channels = p.channel_actions
        .filter((ca) => (seen.has(ca.channel) ? false : seen.add(ca.channel)))
        .map((ca) => ({ name: ca.channel, label: channelLabel(ca.channel), color: channelColor(ca.channel) }))
      const k0 = p.kpis[0]
      const k1 = p.kpis[1]
      return {
        phaseId: p.phase_id,
        num: String(i + 1).padStart(2, '0'),
        name: p.phase_name,
        role: phaseRole(p.phase_name, p.sort_order ?? i),
        hue: phaseHue(p.sort_order ?? i),
        objective: p.objective ?? '',
        primaryValue: k0?.target_value ?? null,
        primaryLabel: k0?.kpi_name ?? null,
        secondary: k1 ? `${k1.target_value ?? ''} ${k1.kpi_name}`.trim() : `${channels.length} channel${channels.length === 1 ? '' : 's'}`,
        channels,
      }
    })
}

// Channel keys per phase — used to dim the timeline when a funnel card is selected.
export function channelsByPhase(campaign: CampaignDetail): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {}
  for (const p of campaign.phases) map[p.phase_id] = new Set(p.channel_actions.map((ca) => ca.channel))
  return map
}

export interface TimelineDot { left: number; color: string; name: string; dateLabel: string }
export interface TimelineLane {
  channel: string
  label: string
  color: string
  flight: { left: number; width: number } | null
  dots: TimelineDot[]
}
export interface TimelineData {
  months: { label: string; left: number; width: number }[]
  gridlines: number[]
  lanes: TimelineLane[]
  hasRange: boolean
}

function bounds(campaign: CampaignDetail): [number, number] | null {
  const dates: number[] = []
  const push = (d: string | null) => { if (d) { const t = Date.parse(d); if (!Number.isNaN(t)) dates.push(t) } }
  push(campaign.start_date); push(campaign.end_date)
  for (const p of campaign.phases) {
    for (const ca of p.channel_actions) {
      push(ca.start_date); push(ca.end_date)
      for (const a of ca.assets) { push(a.start_date); push(a.end_date); push(assetDate(a)) }
    }
  }
  if (dates.length === 0) return null
  return [Math.min(...dates), Math.max(...dates)]
}

export function buildTimeline(campaign: CampaignDetail): TimelineData {
  const b = bounds(campaign)
  if (!b || b[1] <= b[0]) return { months: [], gridlines: [], lanes: [], hasRange: false }
  const [t0, t1] = b
  const span = t1 - t0
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - t0) / span) * 100))

  const months: TimelineData['months'] = []
  const gridlines: number[] = []
  let d = new Date(new Date(t0).getFullYear(), new Date(t0).getMonth(), 1)
  while (d.getTime() <= t1) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const left = pct(d.getTime())
    const width = pct(next.getTime()) - left
    months.push({ label: d.toLocaleDateString('en-GB', { month: 'short' }), left, width })
    if (left > 0.5) gridlines.push(left)
    d = next
  }

  // One lane per distinct channel, aggregated across phases.
  const order: string[] = []
  const byChannel = new Map<string, { starts: number[]; ends: number[]; dots: TimelineDot[] }>()
  for (const p of campaign.phases) {
    for (const ca of p.channel_actions) {
      if (!byChannel.has(ca.channel)) { byChannel.set(ca.channel, { starts: [], ends: [], dots: [] }); order.push(ca.channel) }
      const lane = byChannel.get(ca.channel)!
      if (ca.start_date) lane.starts.push(Date.parse(ca.start_date))
      if (ca.end_date) lane.ends.push(Date.parse(ca.end_date))
      for (const a of ca.assets) {
        const ad = assetDate(a)
        if (ad) lane.dots.push({ left: pct(Date.parse(ad)), color: assetTypeColor(a.asset_type), name: a.asset_name, dateLabel: new Date(ad).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) })
        if (a.start_date) lane.starts.push(Date.parse(a.start_date))
        if (a.end_date) lane.ends.push(Date.parse(a.end_date))
      }
    }
  }

  const lanes: TimelineLane[] = order.map((channel) => {
    const l = byChannel.get(channel)!
    let flight: TimelineLane['flight'] = null
    if (l.starts.length && l.ends.length) {
      const left = pct(Math.min(...l.starts))
      flight = { left, width: Math.max(1, pct(Math.max(...l.ends)) - left) }
    }
    return { channel, label: channelLabel(channel), color: channelColor(channel), flight, dots: l.dots }
  })

  return { months, gridlines, lanes, hasRange: true }
}
