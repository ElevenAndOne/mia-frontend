import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/button'
import { TopBar } from '../components/top-bar'
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
  })
  const open = (c: BoardCampaign) => navigate(`/campaign-builder/${c.campaign_id}/${c.next_step?.tab ?? 'brief'}`)

  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden bg-secondary">
      <TopBar
        breadcrumbs={[{ label: 'Home', to: '/home' }, { label: 'Campaigns' }]}
        title="Campaigns"
        onBack={() => navigate('/home')}
        rightSlot={
          <Button variant="primary" size="sm" onClick={() => navigate('/campaign-builder/new')}>
            New campaign
          </Button>
        }
      />
      <div className="@container flex-1 min-h-0 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {q.isPending ? <p className="paragraph-sm text-tertiary">Loading the campaigns…</p> : null}
          {q.error ? <Card warn className="paragraph-sm text-primary">{(q.error as Error).message}</Card> : null}
          {q.data ? (
            <>
              {q.data.campaigns.length ? (
                <Card className="overflow-x-auto p-0">
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
                          className="cursor-pointer border-t border-secondary align-top hover:bg-secondary"
                          onClick={() => open(c)}
                        >
                          <td className="px-4 py-3">
                            <span className="text-primary">{c.name}</span>
                          </td>
                          <td className="px-2 py-3">
                            <span className="flex flex-col items-start gap-0.5">
                              <Chip tone={STAGE_TONE[c.stage ?? ''] ?? 'neutral'}>{c.stage}</Chip>
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
                            <span className="paragraph-sm text-primary">{c.next_step?.label}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ) : (
                <Card className="flex flex-col items-start gap-3">
                  <p className="paragraph-sm text-secondary">
                    No campaigns from the new builder yet. Start one: tell Mia what it's for, or drop in the client's brief.
                  </p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/campaign-builder/new')}>
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
