import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import * as api from '../api'
import { Card, Chip } from './parts'

// Rules for this client (A3): what holds for every campaign of this client, followed in every plan and
// every word. A PM adds one here or just tells Mia in the chat ("never say stockist for them"); rules
// Mia learned from corrections show too, read only (they're managed where they were learned).

export function ClientRules({ client, readOnly }: { client: string; readOnly: boolean }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const qc = useQueryClient()
  const key = ['client-rules', tenantId]
  const q = useQuery({ queryKey: key, queryFn: () => api.fetchRules(sessionId!, tenantId!), enabled: !!sessionId && !!tenantId })
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rules = q.data?.rules ?? []

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await qc.invalidateQueries({ queryKey: key })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="subheading-sm text-primary">Rules for {client}</p>
        <p className="paragraph-xs text-tertiary">Followed in every plan and every word, for every campaign of this client.</p>
      </div>
      {rules.length ? (
        <ul className="flex flex-col gap-1.5">
          {rules.map((r) => (
            <li key={r.rule_id} className="flex flex-wrap items-start justify-between gap-2 paragraph-sm text-primary [overflow-wrap:anywhere]">
              <span className="min-w-0 flex-1">
                {r.text}{' '}
                {r.origin === 'learned' ? <Chip tone="mia">learned from corrections</Chip> : null}
              </span>
              {r.origin === 'person' && !readOnly ? (
                <button
                  type="button"
                  className="paragraph-xs text-tertiary hover:text-primary disabled:opacity-50"
                  disabled={busy}
                  onClick={() => run(() => api.removeRule(sessionId!, tenantId!, r.rule_id))}
                >
                  Stop following
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : q.isPending ? null : (
        <p className="paragraph-sm text-secondary">
          None yet. When you correct Mia in a way that holds for every campaign, she saves it here, or add one yourself.
        </p>
      )}
      {readOnly ? null : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) void run(() => api.addRule(sessionId!, tenantId!, text.trim())).then(() => setText(''))
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary"
            placeholder="e.g. Never use the word stockist"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
          />
          <Button size="sm" type="submit" loading={busy} disabled={!text.trim()}>
            Add rule
          </Button>
        </form>
      )}
      {error ? <p className="paragraph-xs text-utility-warning-700">{error}</p> : null}
    </Card>
  )
}
