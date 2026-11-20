import { useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'
import { Row, RowButton } from './settings-ui'

// Settings → Workspace: the client's code in every name Mia writes (Y26_DFSA_..._MK7Q2X; naming + tracking step 1,
// 20 Nov 2026). Shows the saved code, or the one Mia would use at the first approve; locked once a campaign named
// with it is out (ads and Flex tasks carry it).

interface CodeState {
  code: string | null
  suggested: string
  locked: boolean
}

async function read(res: Response): Promise<CodeState> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { detail?: string }).detail || 'That didn’t work. Try again.')
  return body as CodeState
}

export function ClientCodeRow({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  const { sessionId } = useSession()
  const [state, setState] = useState<CodeState | null>(null)
  const [editing, setEditing] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let live = true
    apiFetch(`/api/tenants/${tenantId}/client-code`, { headers: { 'X-Session-ID': sessionId } })
      .then(read)
      .then((s) => live && setState(s))
      .catch(() => undefined) // the row just doesn't show
    return () => {
      live = false
    }
  }, [sessionId, tenantId])

  if (!state) return null
  const save = async () => {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    try {
      const s = await read(
        await apiFetch(`/api/tenants/${tenantId}/client-code`, {
          method: 'PUT',
          headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: typed }),
        }),
      )
      setState(s)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t work. Try again.')
    } finally {
      setBusy(false)
    }
  }
  const shown = state.code ?? state.suggested
  const hint = editing ? (
    <span className="flex flex-col gap-1">
      <input
        aria-label="Client code"
        autoFocus
        value={typed}
        maxLength={5}
        onChange={(e) => setTyped(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="w-28 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary uppercase"
      />
      {error ? <span className="text-error">{error}</span> : null}
    </span>
  ) : (
    <>
      <span className="text-primary tabular-nums">{shown}</span>
      {state.code ? null : ' · suggested, saved at the first approve'}
      {state.locked ? ' · fixed: campaigns named with it are out' : ''}
    </>
  )
  return (
    <Row title="Client code" hint={hint}>
      {canManage && !state.locked ? (
        editing ? (
          <>
            <RowButton onClick={() => setEditing(false)}>Cancel</RowButton>
            <RowButton onClick={() => void save()} disabled={busy || typed.trim().length < 2}>
              {busy ? 'Saving…' : 'Save'}
            </RowButton>
          </>
        ) : (
          <RowButton
            onClick={() => {
              setTyped(shown)
              setError(null)
              setEditing(true)
            }}
          >
            {state.code ? 'Change' : 'Set'}
          </RowButton>
        )
      ) : null}
    </Row>
  )
}
