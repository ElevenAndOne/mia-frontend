import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/button'
import { TopBar } from '../components/top-bar'
import { Skeleton } from '../components/skeleton'
import { useSession } from '../contexts/session-context'
import * as api from '../features/campaign-builder/api'
import { Card, Chip, day, money, num } from '../features/campaign-builder/components/parts'
import type { BoardCampaign } from '../features/campaign-builder/types'

// The campaigns board (plan §8.1): every campaign the new builder made, where it stands and the one
// thing it needs next; older campaigns underneath, opening the campaign workspace they were made in.

const STAGE_TONE: Record<string, 'neutral' | 'pm' | 'mia' | 'good'> = {
  Brief: 'neutral',
  Plan: 'pm',
  Approved: 'mia',
  'In studio': 'mia',
  Live: 'good',
}

export default function CampaignBoardPage() {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['campaign-board', tenantId],
    queryFn: () => api.fetchBoard(sessionId!, tenantId!),
    enabled: !!sessionId && !!tenantId,
    // Every visit reads it fresh (the cached list still shows meanwhile): campaigns are made, approved, renamed and
    // deleted on other pages, and the app-wide 5-minute staleTime hid those until it ran out (sweep 12 Nov).
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const open = (c: BoardCampaign) => navigate(`/campaign-builder/${c.campaign_id}/${c.next_step?.tab ?? 'brief'}`)

  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden bg-secondary">
      <TopBar
        breadcrumbs={[{ label: 'Home', to: '/home' }, { label: 'Campaign builder' }]}
        title="Campaign builder"
        onBack={() => navigate('/home')}
        rightSlot={
          <Button variant="primary" size="sm" onClick={() => navigate('/campaign-builder/new')}>
            New campaign
          </Button>
        }
      />
      <div className="@container flex-1 min-h-0 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {q.isPending ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : null}
          {q.error ? <Card warn className="paragraph-sm text-primary">{(q.error as Error).message}</Card> : null}
          {q.data ? (
            <>
              {q.data.campaigns.length ? (
                <>
                {/* Phones (19 Nov 2026): one card per campaign; the table needed a sideways scroll. */}
                <ul className="flex flex-col gap-2 md:hidden">
                  {q.data.campaigns.map((c) => (
                    <li key={c.campaign_id}>
                      <button
                        type="button"
                        onClick={() => open(c)}
                        className="group w-full text-left rounded-xl border border-secondary bg-primary p-3 flex flex-col gap-2 active:scale-[0.99] transition"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="paragraph-sm font-medium text-primary">{c.name}</span>
                          <Chip tone={STAGE_TONE[c.stage ?? ''] ?? 'neutral'}>{c.stage}</Chip>
                        </span>
                        <span className="paragraph-xs text-tertiary">
                          {c.start_date ? `${day(c.start_date)} – ${day(c.end_date)}` : 'No dates yet'}
                          {c.budget_total != null ? ` · ${money(c.budget_total, c.currency)}` : ''}
                        </span>
                        {c.next_step?.label ? (
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-secondary px-2.5 py-1 paragraph-xs text-primary">
                            {c.next_step.label} <span aria-hidden>→</span>
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
                <Card className="hidden md:block overflow-x-auto p-0">
                  <table className="w-full min-w-[760px] paragraph-sm">
                    <thead>
                      <tr className="text-left label-xs text-tertiary">
                        <th className="px-4 py-2">Campaign</th>
                        <th className="px-2 py-2">Stage</th>
                        <th className="px-2 py-2">Dates</th>
                        <th className="px-2 py-2 text-right">Budget</th>
                        <th className="px-2 py-2 text-right">Credits</th>
                        <th className="px-4 py-2">Next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.data.campaigns.map((c) => (
                        <tr
                          key={c.campaign_id}
                          className="group cursor-pointer border-t border-secondary align-top transition-colors hover:bg-secondary"
                          onClick={() => open(c)}
                        >
                          <td className="px-4 py-3">
                            <span className="text-primary">{c.name}</span>
                          </td>
                          <td className="px-2 py-3">
                            <span className="flex flex-col items-start gap-0.5">
                              <Chip tone={STAGE_TONE[c.stage ?? ''] ?? 'neutral'}>
                                <span className="inline-flex items-center gap-1.5">
                                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${c.stage === 'Live' ? 'bg-success-solid animate-pulse' : 'bg-current opacity-60'}`} />
                                  {c.stage}
                                </span>
                              </Chip>
                              {c.progress ? <span className="paragraph-xs text-tertiary">{c.progress}</span> : null}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-secondary whitespace-nowrap">
                            {c.start_date ? `${day(c.start_date)} – ${day(c.end_date)}` : '—'}
                          </td>
                          <td className="px-2 py-3 text-right text-secondary">{c.budget_total != null ? money(c.budget_total, c.currency) : '—'}</td>
                          <td className="px-2 py-3 text-right text-secondary whitespace-nowrap">
                            {c.credits != null ? (
                              <span className="flex flex-col items-end">
                                {num(c.credits)}
                                <span className="paragraph-xs text-tertiary">
                                  {c.jobs} job{c.jobs === 1 ? '' : 's'}
                                </span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {/* The next step as a button (19 Nov 2026): what to do, one click away. */}
                            {c.next_step?.label ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-secondary bg-primary px-2.5 py-1 paragraph-sm text-primary transition-colors group-hover:border-brand-solid group-hover:text-brand-secondary">
                                {c.next_step.label}
                                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
                </>
              ) : (
                <Card className="flex flex-col items-start gap-3">
                  <p className="paragraph-sm text-secondary">
                    No campaigns from the new builder yet. Start one: tell Mia what it's for, or drop in the client's brief.
                  </p>
                  {/* First run: the one thing to do pulses once. */}
                  <Button variant="primary" size="sm" className="mia-nudge" onClick={() => navigate('/campaign-builder/new')}>
                    New campaign
                  </Button>
                </Card>
              )}
              {q.data.older.length ? (
                <details className="rounded-xl border border-secondary bg-primary p-4">
                  <summary className="cursor-pointer subheading-sm text-primary">
                    Older campaigns ({q.data.older.length}) · made before the new builder
                  </summary>
                  <ul className="mt-3 flex flex-col divide-y divide-secondary">
                    {q.data.older.map((c) => (
                      <li key={c.campaign_id}>
                        <button
                          type="button"
                          className="flex w-full flex-wrap items-center justify-between gap-2 py-2 text-left hover:text-primary"
                          onClick={() => navigate(`/campaigns/${c.campaign_id}/overview`)}
                        >
                          <span className="paragraph-sm text-primary">{c.name}</span>
                          <span className="paragraph-xs text-tertiary">
                            {c.status} · {c.start_date ? `${day(c.start_date)} – ${day(c.end_date)}` : 'no dates'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
