import { useState } from 'react'
import { Button } from '../../../components/button'
import type { BenchmarkRow, BenchmarkWeek } from '../types'
import { ago, clientsWord } from './format'

const PLATFORM: Record<string, string> = { meta: 'Meta (Facebook & Instagram)', google: 'Google Ads' }
const METRIC_ORDER: Record<string, number> = { cpc: 0, cpm: 1, ctr: 2 }
const SMALL = 0.05 // under 5% either way is noise: "about the same"
const TYPICAL_FROM = 3 // with fewer clients a "typical client" just repeats them: say each one instead

/** What each number means, in words a client would use. */
const METRIC: Record<string, { name: string; explain: string }> = {
  cpc: { name: 'Price of a click', explain: 'What we paid, on average, each time someone clicked an ad.' },
  cpm: { name: 'Price to be seen', explain: 'What we paid for the ads to be shown 1,000 times.' },
  ctr: { name: 'People who clicked', explain: 'Out of everyone who saw an ad, how many clicked it.' },
}

type Tone = 'good' | 'bad' | 'flat'

/** A change in plain words: "26% cheaper", "18% more expensive", "16% fewer", "about the same". Costs down and clicks
 *  up are good news for the client. */
function say(metric: string, change: number | null | undefined, goodWhenUp: boolean): { text: string; tone: Tone } {
  if (change === null || change === undefined) return { text: 'too little activity', tone: 'flat' }
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

function shortSpan(w: BenchmarkWeek): string {
  const a = new Date(w.week_start)
  const b = new Date(w.week_end)
  const m = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' })
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${m(b)}`
    : `${a.getDate()} ${m(a)}–${b.getDate()} ${m(b)}`
}

/** One number's move as part of a sentence, the change coloured: "clicks were 26% cheaper". */
function Phrase({ r, change }: { r: BenchmarkRow; change: number | null | undefined }) {
  const s = say(r.metric, change, r.good_when_up)
  const hit = <span className={TONE_CLASS[s.tone]}>{s.text}</span>
  if (r.metric === 'cpc') return s.tone === 'flat' ? <>clicks cost about the same</> : <>clicks were {hit}</>
  if (r.metric === 'cpm') return s.tone === 'flat' ? <>being seen cost about the same</> : <>being seen was {hit}</>
  return s.tone === 'flat' ? <>about as many people clicked</> : <>{hit} people clicked</>
}

/** "clicks were 26% cheaper, being seen cost about the same and 16% fewer people clicked." */
function Sentence({ metrics, changeOf }: { metrics: BenchmarkRow[]; changeOf: (r: BenchmarkRow) => number | null | undefined }) {
  const known = metrics.filter((r) => changeOf(r) !== undefined && changeOf(r) !== null)
  if (known.length === 0) return <>too little activity to say.</>
  return (
    <>
      {known.map((r, i) => (
        <span key={r.metric}>
          {i > 0 && (i === known.length - 1 ? ' and ' : ', ')}
          <Phrase r={r} change={changeOf(r)} />
        </span>
      ))}
      .
    </>
  )
}

/** One platform: a sentence (the typical client, or each client when there are few), the table behind a click. */
function PlatformCard({ platform, rows }: { platform: string; rows: BenchmarkRow[] }) {
  const [open, setOpen] = useState(false)
  const metrics = [...rows].sort((a, b) => (METRIC_ORDER[a.metric] ?? 9) - (METRIC_ORDER[b.metric] ?? 9))
  const clients = [...new Set(metrics.flatMap((r) => r.detail.map((c) => c.name)))].sort((a, b) => a.localeCompare(b))
  const changeOf = (r: BenchmarkRow, name: string) => r.detail.find((c) => c.name === name)?.change
  const typical = clients.length >= TYPICAL_FROM

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-secondary bg-primary p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="m-0 subheading-md text-primary">{PLATFORM[platform] ?? platform}</h3>
        <span className="paragraph-xs text-tertiary">{clientsWord(clients.length)}</span>
      </div>

      {typical ? (
        <p className="m-0 paragraph-md text-secondary">
          For a typical client, <Sentence metrics={metrics} changeOf={(r) => r.median_change} />
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {clients.map((name) => (
            <li key={name} className="paragraph-md text-secondary">
              <span className="text-primary">{name}:</span>{' '}
              <Sentence metrics={metrics} changeOf={(r) => changeOf(r, name)} />
            </li>
          ))}
        </ul>
      )}

      {typical && (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="w-fit paragraph-sm text-tertiary hover:text-secondary"
          >
            {open ? '▾ Hide each client' : `▸ See each client (${clients.length})`}
          </button>
          {open && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="pb-1.5 pr-3 paragraph-xs font-normal text-tertiary">Client</th>
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
                      {metrics.map((r) => {
                        const s = say(r.metric, changeOf(r, name), r.good_when_up)
                        return (
                          <td key={r.metric} className={`whitespace-nowrap px-3 py-2.5 paragraph-sm ${TONE_CLASS[s.tone]}`}>
                            {s.text}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface ClientTrendsProps {
  weeks: BenchmarkWeek[]
  lastRun: string | null
  running: boolean
  onRefresh: () => void
}

/** How our agency clients' ads did last week against their own four weeks before. Only we can see this. */
export function ClientTrends({ weeks, lastRun, running, onRefresh }: ClientTrendsProps) {
  const [explain, setExplain] = useState(false)
  const [latest] = weeks
  const shown = latest?.rows.filter((r) => r.clients > 0) ?? []
  const platforms = [...new Set(shown.map((r) => r.platform))]
  const used = [...new Set(shown.map((r) => r.metric))].sort((a, b) => (METRIC_ORDER[a] ?? 9) - (METRIC_ORDER[b] ?? 9))
  const updated = ago(lastRun)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 title-h6 text-primary">How our clients’ ads did last week</h2>
          <span className="paragraph-sm text-tertiary">
            {latest
              ? `${shortSpan(latest)}, against each client’s own four weeks before.`
              : 'Every Monday Mia compares last week with the four weeks before, for every agency client with ads running.'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {updated && !running && <span className="paragraph-sm text-tertiary">Updated {updated}</span>}
          <Button variant="secondary" size="sm" loading={running} onClick={onRefresh}>
            {running ? 'Updating…' : 'Update now'}
          </Button>
        </div>
      </div>

      {platforms.length === 0 ? (
        <p className="m-0 paragraph-md text-tertiary">
          {latest ? 'No client had enough ad activity last week to compare.' : 'No numbers yet. The first ones come in on Monday.'}
        </p>
      ) : (
        // Side by side as sentences; one column once a table is open, so it has room.
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:[&:has([aria-expanded=true])]:grid-cols-1">
          {platforms.map((p) => (
            <PlatformCard key={p} platform={p} rows={shown.filter((r) => r.platform === p)} />
          ))}
        </div>
      )}

      {platforms.length > 0 && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="w-fit paragraph-xs text-tertiary underline hover:text-secondary"
            onClick={() => setExplain(!explain)}
          >
            {explain ? 'Hide what these mean' : 'What do these mean?'}
          </button>
          {explain && (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 paragraph-sm text-secondary">
              {used.map((m) => (
                <li key={m}>
                  <span className="text-primary">{METRIC[m]?.name ?? m}:</span> {METRIC[m]?.explain}
                </li>
              ))}
              <li className="text-tertiary">
                Only agency clients show, and only when they spent enough that week for the number to mean something.
              </li>
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
