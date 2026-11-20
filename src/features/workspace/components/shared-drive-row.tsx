import { useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'
import { Row, RowButton } from './settings-ui'

// Settings → Workspace: the client's Shared Drive, where Mia makes each approved campaign's per-job folders and reads
// their _Delivery (naming step 4, 20 Nov 2026; GET/PUT /api/tenants/{t}/shared-drive). Shows the drive's name, or
// the problem and the address to add as a Contributor.

interface DriveState {
  drive_id: string | null
  name: string | null
  can_add: boolean | null
  problem: string | null
  mia_email: string | null
  url: string | null
}

async function read(res: Response): Promise<DriveState> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { detail?: string }).detail || 'That didn’t work. Try again.')
  return body as DriveState
}

export function SharedDriveRow({ tenantId, canManage }: { tenantId: string; canManage: boolean }) {
  const { sessionId } = useSession()
  const [state, setState] = useState<DriveState | null>(null)
  const [editing, setEditing] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let live = true
    apiFetch(`/api/tenants/${tenantId}/shared-drive`, { headers: { 'X-Session-ID': sessionId } })
      .then(read)
      .then((s) => live && setState(s))
      .catch(() => undefined) // the row just doesn't show
    return () => {
      live = false
    }
  }, [sessionId, tenantId])

  if (!state) return null
  const save = async (link: string) => {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    try {
      const s = await read(
        await apiFetch(`/api/tenants/${tenantId}/shared-drive`, {
          method: 'PUT',
          headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
          body: JSON.stringify({ link }),
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
  const who = state.mia_email || 'Mia'
  const problem =
    state.problem ||
    (state.drive_id && state.can_add === false
      ? `Mia can see ${state.name || 'this drive'} but can’t add folders to it. Make ${who} a Contributor there.`
      : null)

  const hint = editing ? (
    <span className="flex flex-col gap-1">
      <input
        aria-label="Shared Drive link"
        autoFocus
        value={typed}
        placeholder="https://drive.google.com/drive/folders/…"
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && typed.trim()) void save(typed)
          if (e.key === 'Escape') setEditing(false)
        }}
        className="w-full max-w-md rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary"
      />
      <span>First add {who} to the drive as a Contributor, then paste the drive’s link.</span>
      {error ? <span className="text-error">{error}</span> : null}
    </span>
  ) : !state.drive_id ? (
    'Not set · Mia makes each approved campaign’s folders here'
  ) : problem ? (
    <span className="text-error">{problem}</span>
  ) : (
    <>
      <span className="text-primary">{state.name}</span> · Mia makes each approved campaign’s folders here
    </>
  )

  return (
    <Row title="Shared Drive" hint={hint}>
      {editing ? (
        <>
          {state.drive_id ? (
            <RowButton tone="danger" onClick={() => void save('')} disabled={busy}>
              Remove
            </RowButton>
          ) : null}
          <RowButton onClick={() => setEditing(false)}>Cancel</RowButton>
          <RowButton onClick={() => void save(typed)} disabled={busy || !typed.trim()}>
            {busy ? 'Checking…' : 'Save'}
          </RowButton>
        </>
      ) : (
        <>
          {state.url && !problem ? (
            <a
              href={state.url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg paragraph-sm border border-secondary text-secondary hover:bg-tertiary hover:text-primary transition-colors"
            >
              Open
            </a>
          ) : null}
          {canManage ? (
            <RowButton
              onClick={() => {
                setTyped('')
                setError(null)
                setEditing(true)
              }}
            >
              {state.drive_id ? 'Change' : 'Add'}
            </RowButton>
          ) : null}
        </>
      )}
    </Row>
  )
}
