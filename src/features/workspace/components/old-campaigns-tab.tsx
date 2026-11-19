import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { Skeleton } from '../../../components/skeleton'
import * as api from '../../campaign-builder/api'
import { day } from '../../campaign-builder/components/parts'
import type { BoardCampaign } from '../../campaign-builder/types'

/**
 * Settings → Old campaigns (agency clean-up, 19 Nov 2026). The campaigns made before the new
 * builder, which left the sidebar but are still in use for a while. Each opens the old campaign
 * workspace it was made in. New campaigns are made in the Campaign builder.
 */
export const OldCampaignsTab = ({ tenantId }: { tenantId: string }) => {
  const { sessionId, activeWorkspace, switchWorkspace } = useSession()
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['campaign-board', tenantId],
    queryFn: () => api.fetchBoard(sessionId!, tenantId),
    enabled: !!sessionId && !!tenantId,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // The old campaign pages work on the open workspace; open this one first if it isn't.
  const open = async (c: BoardCampaign) => {
    if (activeWorkspace?.tenant_id !== tenantId) {
      const ok = await switchWorkspace(tenantId)
      if (!ok) return
    }
    navigate(`/campaigns/${c.campaign_id}/overview`)
  }

  const older = q.data?.older ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="subheading-md text-primary">Old campaigns</h2>
        <p className="paragraph-sm text-tertiary mt-1">
          Campaigns made before the new builder. They still open and still work. New campaigns are made in the{' '}
          <button
            type="button"
            className="text-brand-secondary underline underline-offset-2"
            onClick={() => navigate('/campaign-builder')}
          >
            Campaign builder
          </button>
          .
        </p>
      </div>

      {q.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : null}
      {q.error ? <p className="paragraph-sm text-utility-error-700">{(q.error as Error).message}</p> : null}

      {q.data && !older.length ? (
        <p className="paragraph-sm text-tertiary">This workspace has no campaigns from before the new builder.</p>
      ) : null}

      {older.length ? (
        <ul className="flex flex-col divide-y divide-secondary rounded-xl border border-secondary bg-primary">
          {older.map((c) => (
            <li key={c.campaign_id}>
              <button
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-secondary"
                onClick={() => void open(c)}
              >
                <span className="paragraph-sm text-primary">{c.name}</span>
                <span className="paragraph-xs text-tertiary">
                  {c.status} · {c.start_date ? `${day(c.start_date)} – ${day(c.end_date)}` : 'no dates'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
