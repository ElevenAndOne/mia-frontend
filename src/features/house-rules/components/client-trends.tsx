import { useState } from 'react'
import { Button } from '../../../components/button'
import type { BenchmarkRow, BenchmarkWeek } from '../types'
import { day } from './format'

const PLATFORM: Record<string, string> = { meta: 'Meta (Facebook & Instagram)', google: 'Google Ads' }
const METRIC_ORDER: Record<string, number> = { cpc: 0, cpm: 1, ctr: 2 }
const SMALL = 0.05 // under 5% either way is noise: "about the same"

/** What each number means, in words a client would use. */
const METRIC: Record<string, { name: string; explain: string }> = {
  cpc: { name: 'Price of a click', explain: 'What we paid, on average, each time someone clicked an ad.' },
  cpm: { name: 'Price to be seen', explain: 'What we paid for the ads to be shown 1,000 times.' },
  ctr: { name: 'People who clicked', explain: 'Out of everyone who saw an ad, how many clicked it.' },
}

type Tone = 'good' | 'bad' | 'flat'

/** A change in plain words: "26% cheaper", "18% more expensive", "16% fewer", "about the same". Costs down and clicks up are
 *  good news for the client. */
function say(metric: string, change: number | null | undefined, goodWhenUp: boolean): { text: string; tone: Tone } {
  if (change === null || change === undefined) return { text: 'not enough activity', tone: 'flat' }
  if (Math.abs(change) < SMALL) return { text: 'about the same', tone: 'flat' }
  const n = Math.round(Math.abs(change) * 100)
  const up = change > 0
  const text = metric === 'ctr' ? `${n}% ${up ? 'more' : 'fewer'}` : `${n}% ${up ? 'more expensive' : 'cheaper'}`
  return { text, tone: up === goodWhenUp ? 'good' : 'bad' }
}

const TONE_CLASS: Record<Tone, string> = {
  good: 'text-utility-success-700',
  bad: 'text-utility-error-700',
  flat: 'text-tertiary',
}
const ARROW: Record<Tone, string> = { good: '●', bad: '●', flat: '○' }

function shortSpan(w: BenchmarkWeek): string {
  const a = new Date(w.week_start)
  const b = new Date(w.week_end)
  const m = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' })
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${m(b)}`
    : `${a.getDate()} ${m(a)}–${b.getDate()} ${m(b)}`
}

/** "For a typical client, clicks were about the same price and 16% fewer people clicked." */
function headline(metrics: BenchmarkRow[]): string {
  const parts = metrics.map((r) => {
    const s = say(r.metric, r.median_change, r.good_when_up)
    if (r.metric === 'cpc') return s.tone === 'flat' ? 'clicks cost about the same' : `clicks were ${s.text}`
    if (r.metric === 'cpm') return s.tone === 'flat' ? 'being seen cost about the same' : `being seen was ${s.text}`
    return s.tone === 'flat' ? 'about as many people clicked' : `${s.text} people clicked`
  })
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
  return `For a typical client, ${list}.`
}

function Cell({ r, change }: { r: BenchmarkRow; change: number | null | undefined }) {
  const s = say(r.metric, change, r.good_when_up)
  return (
    <td className={`whitespace-nowrap px-3 py-2.5 paragraph-sm ${TONE_CLASS[s.tone]}`}>
      <span aria-hidden className="mr-1.5 text-[8px] align-middle">
        {ARROW[s.tone]}
      </span>
      {s.text}
    </td>
  )
}

/** One platform: a sentence for the typical client, then each client in plain words. */
function PlatformBlock({ platform, rows }: { platform: string; rows: BenchmarkRow[] }) {
  const metrics = [...rows].sort((a, b) => (METRIC_ORDER[a.metric] ?? 9) - (METRIC_ORDER[b.metric] ?? 9))
  const clients = [...new Set(metrics.flatMap((r) => r.detail.map((c) => c.name)))].sort((a, b) => a.localeCompare(b))
  const changeOf = (r: BenchmarkRow, name: string) => r.detail.find((c) => c.name === name)?.change

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="m-0 title-h6 text-primary">{PLATFORM[platform] ?? platform}</h3>
        <p className="m-0 paragraph-md text-secondary">{headline(metrics)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="pb-1.5 pr-3 paragraph-xs font-normal text-tertiary">
                {clients.length} {clients.length === 1 ? 'client' : 'clients'}
              </th>
              {metrics.map((r) => (
                <th key={r.metric} className="whitespace-nowrap px-3 pb-1.5 paragraph-xs font-normal text-tertiary">
                  {METRIC[r.metric]?.name ?? r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((name) => (
              <tr key={name} className="border-t border-secondary">
                <td className="max-w-48 truncate py-2.5 pr-3 paragraph-sm text-primary">{name}</td>
                {metrics.map((r) => (
                  <Cell key={r.metric} r={r} change={changeOf(r, name)} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface ClientTrendsProps {
  weeks: BenchmarkWeek[]
  lastRun: string | null
  running: boolean
  onRefresh: () => void
}

/** How our clients' ads did last week against their own four weeks before. Only we can see this. */
export function ClientTrends({ weeks, lastRun, running, onRefresh }: ClientTrendsProps) {
  const [explain, setExplain] = useState(false)
  const [latest] = weeks
  const shown = latest?.rows.filter((r) => r.clients > 0) ?? []
  const platforms = [...new Set(shown.map((r) => r.platform))]
  const used = [...new Set(shown.map((r) => r.metric))].sort((a, b) => (METRIC_ORDER[a] ?? 9) - (METRIC_ORDER[b] ?? 9))

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 title-h6 text-primary">How our clients’ ads did last week</h2>
          <span className="paragraph-sm text-tertiary">
            {latest
              ? `${shortSpan(latest)}, compared with each client’s own four weeks before.`
              : 'Every Monday Mia compares last week with the four weeks before, for every client with ads running.'}
          </span>
        </div>
        <Button variant="ghost" size="sm" loading={running} onClick={onRefresh}>
          {running ? 'Reading…' : 'Refresh'}
        </Button>
      </div>

      {platforms.length === 0 ? (
        <p className="m-0 paragraph-md text-tertiary">
          {latest ? 'No client had enough ad activity last week to compare.' : 'No numbers yet. The first ones come in on Monday.'}
        </p>
      ) : (
        platforms.map((p) => <PlatformBlock key={p} platform={p} rows={shown.filter((r) => r.platform === p)} />)
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 paragraph-xs text-tertiary">
          <span>
            <span className="text-utility-success-700">●</span> good for the client
          </span>
          <span>
            <span className="text-utility-error-700">●</span> bad for the client
          </span>
          {lastRun && <span>Last read {day(lastRun)}</span>}
          <button type="button" className="underline hover:text-secondary" onClick={() => setExplain(!explain)}>
            {explain ? 'Hide what these mean' : 'What do these mean?'}
          </button>
        </div>
        {explain && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 paragraph-sm text-secondary">
            {used.map((m) => (
              <li key={m}>
                <span className="text-primary">{METRIC[m]?.name ?? m}:</span> {METRIC[m]?.explain}
              </li>
            ))}
            <li className="text-tertiary">
              A client only shows when they spent enough that week for the number to mean something.
            </li>
          </ul>
        )}
      </div>
    </section>
  )
}
