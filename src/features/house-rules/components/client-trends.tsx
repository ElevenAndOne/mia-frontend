import { Fragment, useState } from 'react'
import { Button } from '../../../components/button'
import type { BenchmarkRow, BenchmarkWeek } from '../types'
import { day, pct } from './format'

const PLATFORM: Record<string, string> = { meta: 'Meta', google: 'Google Ads' }
const SMALL = 0.05 // under 5% either way is noise, shown grey

/** Green when the move is good news for clients (costs down, click rate up), red when it isn't, grey when small. */
function tone(row: Pick<BenchmarkRow, 'median_change' | 'good_when_up'>): string {
  const c = row.median_change
  if (c === null || Math.abs(c) < SMALL) return 'text-tertiary'
  return c > 0 === row.good_when_up ? 'text-utility-success-700' : 'text-utility-error-700'
}

function shortSpan(w: BenchmarkWeek): string {
  const a = new Date(w.week_start)
  const b = new Date(w.week_end)
  const m = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' })
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${m(b)}`
    : `${a.getDate()} ${m(a)}–${b.getDate()} ${m(b)}`
}

interface ClientTrendsProps {
  weeks: BenchmarkWeek[]
  lastRun: string | null
  running: boolean
  onRefresh: () => void
}

/** Last week against each client's four weeks before, per platform and number. Only we can see this. */
export function ClientTrends({ weeks, lastRun, running, onRefresh }: ClientTrendsProps) {
  const [open, setOpen] = useState<string | null>(null)
  const [latest, previous] = weeks
  const shown = latest?.rows.filter((r) => r.clients > 0) ?? []
  const prevOf = (r: BenchmarkRow) => previous?.rows.find((p) => p.platform === r.platform && p.metric === r.metric)

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-secondary bg-primary p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 title-h6 text-primary">Across our clients</h2>
          <Button variant="ghost" size="sm" loading={running} onClick={onRefresh}>
            {running ? 'Reading numbers…' : 'Refresh'}
          </Button>
        </div>
        <span className="paragraph-sm text-tertiary">
          {latest
            ? `Last week (${shortSpan(latest)}) against each client’s four weeks before. The middle client’s change, so one big account can’t skew it.`
            : 'Every Monday Mia compares last week with the four weeks before, for every client with ads running.'}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="m-0 py-2 paragraph-md text-tertiary">
          {latest ? 'No client had enough ad activity last week to compare.' : 'No numbers yet. The first ones come in on Monday.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="label-xs uppercase tracking-wider text-tertiary">
                <th className="py-2 pr-3 font-normal">Platform</th>
                <th className="py-2 pr-3 font-normal">Number</th>
                <th className="py-2 pr-3 font-normal text-right">Change</th>
                <th className="py-2 pr-3 font-normal">Clients</th>
                <th className="hidden py-2 font-normal text-right sm:table-cell">Week before</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const key = `${r.platform}:${r.metric}`
                const prev = prevOf(r)
                const isOpen = open === key
                return (
                  <Fragment key={key}>
                    <tr
                      className="cursor-pointer border-t border-secondary hover:bg-secondary"
                      onClick={() => setOpen(isOpen ? null : key)}
                      aria-expanded={isOpen}
                    >
                      <td className="py-2.5 pr-3 paragraph-md text-primary">{PLATFORM[r.platform] ?? r.platform}</td>
                      <td className="py-2.5 pr-3 paragraph-md text-secondary">{r.label}</td>
                      <td className={`py-2.5 pr-3 text-right subheading-md tabular-nums ${tone(r)}`}>{pct(r.median_change)}</td>
                      <td className="py-2.5 pr-3 paragraph-sm text-tertiary whitespace-nowrap">
                        {r.up} up, {r.down} down
                      </td>
                      <td className={`hidden py-2.5 text-right paragraph-sm tabular-nums sm:table-cell ${prev ? tone(prev) : 'text-tertiary'}`}>
                        {prev && prev.clients > 0 ? pct(prev.median_change) : '–'}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-secondary">
                        <td colSpan={5} className="px-3 py-2">
                          <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-1 p-0 sm:grid-cols-2">
                            {r.detail.map((c) => (
                              <li key={c.name} className="flex justify-between gap-3 paragraph-sm">
                                <span className="truncate text-secondary">{c.name}</span>
                                <span className={`tabular-nums ${tone({ median_change: c.change, good_when_up: r.good_when_up })}`}>
                                  {pct(c.change)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {lastRun && <span className="paragraph-xs text-tertiary">Last read {day(lastRun)}. Tap a row to see each client.</span>}
    </section>
  )
}
