import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import * as api from '../api'
import { ClientRules } from './client-rules'

// The rules Mia follows for this campaign, as one line with a count (20 Nov, docs2/BUILDER_HAND_HOLDING_CLEANUP_2026-11-20.md:
// they lived only in a folded card at the end of Check & approve). "N new" counts rules that arrived since this browser last
// looked (a note from the chat or from Claude); See them opens the full list, where each can be stopped.

const seenKey = (campaignId: string) => `mia-builder-rules-seen-${campaignId}`

function readSeen(campaignId: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(seenKey(campaignId))
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

function writeSeen(campaignId: string, ids: string[]) {
  try {
    localStorage.setItem(seenKey(campaignId), JSON.stringify(ids))
  } catch {
    // private window: nothing is marked seen, so nothing shows as new either (see below)
  }
}

export function RulesLine({ client, campaignId, readOnly }: { client: string; campaignId: string; readOnly: boolean }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  // the same query ClientRules uses, so opening the list doesn't fetch again
  const q = useQuery({
    queryKey: ['client-rules', tenantId, campaignId],
    queryFn: () => api.fetchRules(sessionId!, tenantId!, campaignId),
    enabled: !!sessionId && !!tenantId,
  })
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<Set<string> | null>(() => readSeen(campaignId))
  const rules = q.data?.rules ?? []
  const ids = rules.map((r) => r.rule_id)
  // The first look at a campaign marks what's there as seen: "new" means new since you last looked, not everything.
  useEffect(() => {
    if (q.data && seen === null) {
      writeSeen(campaignId, ids)
      setSeen(new Set(ids))
    }
  }, [q.data, seen, campaignId, ids])
  const fresh = seen ? rules.filter((r) => !seen.has(r.rule_id)) : []
  const toggle = () => {
    if (!open && fresh.length) {
      writeSeen(campaignId, ids)
      setSeen(new Set(ids))
    }
    setOpen((v) => !v)
  }
  if (q.isLoading || q.isError) return null
  const n = rules.length
  return (
    <div className="flex flex-col gap-2">
      <p className="paragraph-xs text-tertiary">
        {n ? `Mia is following ${n} rule${n === 1 ? '' : 's'} for this campaign` : `No rules for ${client} yet`}
        {fresh.length ? (
          <span className="ml-1.5 rounded-full bg-brand-solid px-1.5 py-0.5 label-xs text-primary-onbrand">{fresh.length} new</span>
        ) : null}
        {' · '}
        <button type="button" aria-expanded={open} onClick={toggle} className="underline hover:text-secondary">
          {open ? 'Hide' : n ? 'See them' : 'Add one'}
        </button>
      </p>
      {open ? <ClientRules client={client} campaignId={campaignId} readOnly={readOnly} /> : null}
    </div>
  )
}
