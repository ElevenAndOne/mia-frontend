import { useState } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import { clearTrackerCache, fetchPhaseActuals, type KPIActual } from '../../campaign/services/campaign-tracker-service'
import { LinkedContentPanel } from '../../campaigns/components/builder/linked-content-panel'
import * as api from '../api'
import type { ResultsKpi } from '../types'
import { Card, Chip, day, money, num } from './parts'
import { askMia } from './your-turn'

// A target is set in the chat (Mia's targets card, applied by the PM); this only starts the question there (6 Nov: a
// campaign moved or approved with no targets had no way to get them).
function AskForTarget({ draft }: { draft: string }) {
  return (
    <button
      type="button"
      onClick={() => askMia({ label: 'Targets', draft })}
      // a quiet link like Ask Mia everywhere else (24 Nov: a bordered pill on every row)
      className="inline-flex items-center paragraph-xs font-medium text-brand-secondary hover:underline whitespace-nowrap"
    >
      Ask Mia for a target
    </button>
  )
}

// The Results tab (plan §8.2): how the live campaign is tracking against the plan's targets, read the way each
// target was made, then the debrief once it ends. Actuals are the campaign tracker's (cached, warmed nightly).

type Pace = 'ahead' | 'on_pace' | 'behind' | 'better' | 'close' | 'worse'

// Same rule as services/campaign_builder/results.pace (tested there).
function pace(actual: number | null, k: ResultsKpi, share: number | null): Pace | null {
  if (actual == null || !k.target) return null
  if (k.rate) {
    const ratio = k.lower_is_better ? (actual ? k.target / actual : 0) : actual / k.target
    return ratio >= 1 ? 'better' : ratio >= 0.85 ? 'close' : 'worse'
  }
  if (!share) return null
  const ratio = actual / (k.target * share)
  return ratio >= 1.1 ? 'ahead' : ratio >= 0.9 ? 'on_pace' : 'behind'
}

const PACE_STYLE: Record<Pace, { label: string; cls: string }> = {
  ahead: { label: 'ahead', cls: 'bg-utility-success-100 text-utility-success-700 border-utility-success-300' },
  better: { label: 'better than target', cls: 'bg-utility-success-100 text-utility-success-700 border-utility-success-300' },
  on_pace: { label: 'on pace', cls: 'bg-utility-blue-100 text-utility-blue-700 border-utility-blue-300' },
  close: { label: 'close', cls: 'bg-utility-blue-100 text-utility-blue-700 border-utility-blue-300' },
  behind: { label: 'behind', cls: 'bg-utility-warning-100 text-utility-warning-700 border-utility-warning-300' },
  worse: { label: 'off target', cls: 'bg-utility-warning-100 text-utility-warning-700 border-utility-warning-300' },
}

const POINTS: [string, string][] = [
  ['what_worked', 'What worked'],
  ['what_failed', "What didn't"],
  ['what_to_repeat', 'Do again'],
  ['what_to_avoid', 'Avoid next time'],
]

export function ResultsTab({ campaignId, approved, bpo = false }: { campaignId: string; approved: boolean; bpo?: boolean }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const qc = useQueryClient()
  const key = ['campaign-results', tenantId, campaignId]
  // BPO shows no numbers here, so none are fetched (review 24 Nov)
  const q = useQuery({ queryKey: key, queryFn: () => api.fetchResults(sessionId!, tenantId!, campaignId), enabled: !!sessionId && !!tenantId && approved && !bpo })
  const s = q.data
  const fetchable = !!s && s.live && s.when !== 'not_started'
  const actuals = useQueries({
    queries: (s?.phases ?? []).map((p) => ({
      queryKey: ['campaign-results-actuals', tenantId, campaignId, p.phase],
      // fetchPhaseActuals answers null when the read failed; as data that sat as a row of dashes for 10 minutes with
      // nothing said (sweep 12 Nov), so it is an error here: retried, and shown with a Try again
      queryFn: async () => {
        const got = await fetchPhaseActuals(sessionId!, tenantId!, campaignId, p.phase)
        if (got == null) throw new Error("Couldn't read the platforms for this phase just now.")
        return got
      },
      enabled: fetchable,
      staleTime: 10 * 60 * 1000,
    })),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState(false)
  const navigate = useNavigate()

  if (!approved) return <Card className="paragraph-sm text-secondary">Results start once the plan is approved and the campaign is launched.</Card>
  // BPO: the client runs and measures its own media, so there are no targets here (24 Nov: empty phase cards asked
  // for targets a BPO campaign never has)
  if (bpo)
    return (
      <Card className="flex flex-col gap-1">
        <p className="label-sm text-primary">No targets for a BPO campaign</p>
        <p className="paragraph-sm text-secondary">The client runs its own media. What's made, sent and back from the studio is on the Studio tab.</p>
      </Card>
    )
  if (q.isPending) return <p className="paragraph-sm text-tertiary">Loading…</p>
  if (!s) return <p className="paragraph-sm text-error">{(q.error as Error)?.message ?? 'Could not load the results.'}</p>

  const progress = s.share_elapsed != null ? Math.round(s.share_elapsed * 100) : null
  // KPIs with no number only because no ads are linked to the campaign (the server's link_gap): named in one line with
  // the way to link them, here in the studio (docs2/LINK_EXISTING_ADS_PLAN_2026-11-24.md). Until campaigns are pushed
  // from Mia, which links what it pushes by itself.
  const unlinked = [...new Set(actuals.flatMap((a) => ((a.data as KPIActual[] | undefined) ?? []).filter((r) => r.link_gap).map((r) => r.kpi_name)))]
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="subheading-md text-primary">
            {!s.live ? 'Not live yet' : s.when === 'not_started' ? 'Live, starts ' + day(s.start_date) : s.when === 'ended' ? 'Ended' : `Day ${s.days_elapsed} of ${s.days_total}`}
          </p>
          <span className="flex flex-wrap items-center gap-2">
            <p className="paragraph-xs text-tertiary">
              {day(s.start_date)} – {day(s.end_date)}
              {s.budget_total != null ? ` · ${money(s.budget_total, s.currency)}` : ''}
            </p>
            {/* A client report for this campaign, with it already picked (19 Nov 2026). */}
            {s.live && s.when !== 'not_started' ? (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/reports?new=1&campaign=${encodeURIComponent(campaignId)}`)}>
                Make a client report
              </Button>
            ) : null}
          </span>
        </div>
        {progress != null && s.when === 'running' ? (
          <div className="h-1.5 rounded-full bg-tertiary overflow-hidden" aria-hidden="true">
            <div className="h-full bg-brand-solid" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        {/* one short line; how pacing works is behind Why? (24 Nov, less text) */}
        <div className="flex flex-wrap items-center gap-x-3 paragraph-xs text-tertiary">
          <span>
            {!s.live
              ? 'Results start when the first job launches.'
              : s.when === 'not_started'
                ? 'Numbers appear once the campaign starts.'
                : 'Numbers refresh nightly.'}
          </span>
          {s.live ? (
            <details className="inline">
              <summary className="inline cursor-pointer underline hover:text-secondary">How pacing works</summary>
              <span className="block mt-1 text-secondary">
                Counts are compared with the share of the target due by today; rates are compared as they stand.
              </span>
            </details>
          ) : null}
        </div>
      </Card>

      {unlinked.length ? (
        <Card warn className="flex flex-wrap items-center justify-between gap-2">
          <p className="paragraph-sm text-primary">
            {listed(unlinked)} {unlinked.length === 1 ? 'has' : 'have'} no data because no ads or posts are linked to this
            campaign yet. Mia counts only what's linked, so a client's other posts never count here.
          </p>
          <Button size="sm" variant="primary" onClick={() => setLinking(true)}>
            Link ads and posts
          </Button>
        </Card>
      ) : null}
      {linking ? (
        <LinkedContentPanel
          campaignId={campaignId}
          onClose={() => setLinking(false)}
          // saving clears the server's cached numbers (measurement.py save_linked_content); the browser keeps its own
          // copy for 23 hours (campaign-tracker-service), so that goes too, then they're read again now
          onSaved={() => {
            clearTrackerCache()
            void qc.invalidateQueries({ queryKey: ['campaign-results-actuals', tenantId, campaignId] })
          }}
        />
      ) : null}

      <div className="grid gap-3 @2xl:grid-cols-2">
        {s.phases.map((p, i) => {
          const rows = (actuals[i]?.data as KPIActual[] | null | undefined) ?? []
          const loading = fetchable && actuals[i]?.isPending
          const failed = fetchable && actuals[i]?.isError
          return (
            <section key={p.phase} className="rounded-xl border border-secondary bg-secondary p-3 flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="subheading-md text-primary">{p.phase}</h3>
                <span className="paragraph-xs text-tertiary">{p.budget != null ? money(p.budget, s.currency) : ''}</span>
              </div>
              {loading ? <p className="paragraph-xs text-tertiary">Reading the platforms… (up to a minute)</p> : null}
              {failed ? (
                <p className="paragraph-xs text-error">
                  {(actuals[i].error as Error)?.message}{' '}
                  <button type="button" className="underline" onClick={() => void actuals[i].refetch()}>
                    Try again
                  </button>
                </p>
              ) : null}
              {!p.kpis.length ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-secondary bg-primary px-2 py-1.5">
                  <span className="paragraph-sm text-secondary">No target yet</span>
                  <AskForTarget draft={`Suggest targets for ${p.phase}.`} />
                </div>
              ) : null}
              <ul className="flex flex-col gap-1.5">
                {p.kpis.map((k) => {
                  const a = rows.find((r) => r.kpi_name === k.kpi_name)
                  const value = a?.actual_value ?? null
                  const pc = pace(value, k, s.share_elapsed)
                  return (
                    <li key={k.kpi_name} className="rounded-lg border border-secondary bg-primary px-2 py-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="label-sm text-primary">{k.kpi_name}</span>
                        <span className="paragraph-sm text-primary tabular-nums">
                          {a?.actual_label ?? (value != null ? num(value) : '—')}
                          <span className="text-tertiary"> / {k.target != null ? targetLabel(k, s.currency) : 'no target'}</span>
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {pc ? (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 label-xs ${PACE_STYLE[pc].cls}`}>
                            {k.basis === 'budget' && !k.rate ? (pc === 'behind' ? 'buying less than before' : 'buying what it bought before') : PACE_STYLE[pc].label}
                          </span>
                        ) : null}
                        {k.target == null ? <AskForTarget draft={`Suggest a target for ${p.phase} ${k.kpi_name}.`} /> : null}
                        {/* where the target came from: only beside a target (24 Nov: "no target" sat beside "your target") */}
                        {k.target == null ? null : k.basis === 'after_approve' ? <Chip>set after approve</Chip> : k.basis === 'budget' ? <Chip>target is what the budget buys</Chip> : k.basis === 'pm' ? <Chip tone="pm">your target</Chip> : k.basis === 'mia_estimate' ? <Chip>Mia's estimate, not a client goal</Chip> : null}
                        {(() => {
                          // the number it replaced stays on record (owner, 6 Nov): never a silent rewrite
                          const last = k.history?.length ? k.history[k.history.length - 1] : null
                          return last && last.old != null ? (
                            <span className="paragraph-xs text-tertiary">
                              changed {last.at ? day(last.at) : ''} from {targetLabel({ ...k, target: last.old }, s.currency)}
                            </span>
                          ) : null
                        })()}
                        {/* why there's no number, as the server says it (24 Nov: "set its source on the campaign" was
                            wrong when the source was connected and only the ads weren't linked) */}
                        {a?.link_gap ? (
                          <span className="paragraph-xs text-utility-warning-700">nothing linked yet</span>
                        ) : a?.state === 'none' ? (
                          <span className="paragraph-xs text-tertiary">{a.blank_reason ?? 'no data for these dates yet'}</span>
                        ) : null}
                        {a?.as_of ? <span className="paragraph-xs text-tertiary">as of {day(a.as_of)}</span> : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      {fetchable ? <ByJob campaignId={campaignId} currency={s.currency} /> : null}

      <Card className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="subheading-md text-primary">Debrief</p>
          {s.can_debrief ? (
            <Button size="sm" variant={s.debrief ? 'secondary' : 'primary'} loading={busy}
              onClick={async () => {
                setBusy(true)
                setError(null)
                try {
                  const r = await api.writeDebrief(sessionId!, tenantId!, campaignId)
                  if (r.status === 'skipped') setError(`Not written: ${r.reason}`)
                  await qc.invalidateQueries({ queryKey: key })
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not write the debrief')
                } finally {
                  setBusy(false)
                }
              }}>
              {s.debrief ? 'Write it again' : 'Write the debrief'}
            </Button>
          ) : null}
        </div>
        {s.debrief ? (
          <>
            <p className="paragraph-sm text-primary">{s.debrief.headline}</p>
            <div className="grid gap-3 @xl:grid-cols-2">
              {POINTS.map(([k, label]) =>
                (s.debrief!.points[k] ?? []).length ? (
                  <div key={k}>
                    <p className="label-xs text-secondary">{label}</p>
                    <ul className="mt-1 flex flex-col gap-1 paragraph-sm text-primary">
                      {s.debrief!.points[k].map((p) => (
                        <li key={p.point}>
                          {p.point} <span className="paragraph-xs text-tertiary">({p.evidence})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
            {s.debrief.data_gaps.length ? (
              <details className="paragraph-xs text-tertiary">
                <summary className="cursor-pointer">What the numbers couldn't show ({s.debrief.data_gaps.length})</summary>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {s.debrief.data_gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </details>
            ) : null}
            <p className="paragraph-xs text-tertiary">
              Written {day(s.debrief.written_at)}. Every number in it was checked against the results; what it learned feeds the next
              plan for this client.
            </p>
          </>
        ) : (
          <p className="paragraph-sm text-secondary">
            {s.can_debrief
              ? 'Mia writes what worked, what didn’t and what to do again, checked against the results. It feeds the next plan for this client.'
              : `Written when the campaign ends${s.end_date ? ` (${day(s.end_date)})` : ''}.`}
          </p>
        )}
        {error ? <p className="paragraph-xs text-utility-warning-700">{error}</p> : null}
      </Card>
    </div>
  )
}


const PLATFORM: Record<string, string> = { meta_ads: 'Meta ad', google_ads: 'Google ad', facebook: 'Facebook post', instagram: 'Instagram post' }

/** Which job did best (step 4, 16 Nov): each ad and post on its own, with its angle and format. Read when asked, since
 *  it calls the platforms; a platform that couldn't be read is said, never shown as zeros. */
function ByJob({ campaignId, currency }: { campaignId: string; currency?: string }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const [open, setOpen] = useState(false)
  const q = useQuery({
    queryKey: ['campaign-results-jobs', tenantId, campaignId],
    queryFn: () => api.fetchJobResults(sessionId!, tenantId!, campaignId),
    enabled: open && !!sessionId && !!tenantId,
    staleTime: 10 * 60 * 1000,
  })
  const jobs = q.data?.jobs ?? []
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="subheading-md text-primary">By job</p>
        {!open ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            Show each ad and post
          </Button>
        ) : null}
      </div>
      {!open ? (
        <p className="paragraph-sm text-secondary">What each ad and post did on its own, so you can see which angle and format worked.</p>
      ) : q.isPending ? (
        <p className="paragraph-xs text-tertiary">Reading each ad and post… (up to a minute)</p>
      ) : q.isError ? (
        <p className="paragraph-xs text-error">
          {(q.error as Error)?.message}{' '}
          <button type="button" className="underline" onClick={() => void q.refetch()}>
            Try again
          </button>
        </p>
      ) : !jobs.length ? (
        <p className="paragraph-sm text-secondary">Nothing has gone out from the jobs yet: ads appear here once pushed, posts once they're out.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {jobs.map((j) => (
            <li key={`${j.job_id}-${j.platform}`} className="rounded-lg border border-secondary bg-primary px-2 py-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="label-sm text-primary">{j.name}</span>
                <span className="paragraph-xs text-tertiary">
                  {PLATFORM[j.platform] ?? j.platform} · {j.phase}
                  {j.format ? ` · ${j.format}` : ''}
                </span>
              </div>
              {j.angle ? <p className="paragraph-xs text-secondary">{j.angle}</p> : null}
              <p className="paragraph-xs text-primary tabular-nums mt-0.5">
                {!j.read
                  ? "Couldn't be read just now"
                  : j.platform === 'facebook' || j.platform === 'instagram'
                    ? `${j.views != null ? num(j.views) : '—'} views · ${j.engagements != null ? num(j.engagements) : '—'} engagements`
                    : `${num(j.impressions ?? 0)} impressions · ${num(j.clicks ?? 0)} clicks · CTR ${j.ctr != null ? `${j.ctr}%` : '—'} · CPC ${j.cpc != null ? money(j.cpc, currency) : '—'}${j.leads ? ` · ${num(j.leads)} leads` : ''}${j.conversions ? ` · ${num(j.conversions)} conversions` : ''}`}
              </p>
            </li>
          ))}
        </ul>
      )}
      {q.data?.problems?.length ? <p className="paragraph-xs text-utility-warning-700">{q.data.problems.join(' ')}</p> : null}
    </Card>
  )
}

// "Clicks", "Clicks and CTR", "Clicks, CTR and Leads"
function listed(names: string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// A target as the PM typed it means it: R5 for a cost, 2.5% for a rate, 2,000 for a count (live test 18 Oct).
const MONEY_KEYS = new Set(['cpc', 'cpm', 'cpa', 'cost_per_conversion', 'cost_per_lead', 'spend'])
const PERCENT_KEYS = new Set(['ctr', 'conversion_rate', 'email_open_rate', 'email_click_rate', 'web_engagement_rate',
  'website_engagement_rate', 'organic_engagement_rate', 'email_unsubscribe_rate', 'email_bounce_rate'])
function targetLabel(k: ResultsKpi, currency?: string): string {
  const key = k.kpi_key ?? ''
  if (MONEY_KEYS.has(key)) return money(k.target as number, currency)
  if (PERCENT_KEYS.has(key)) return `${num(k.target as number)}%`
  return num(k.target as number)
}
