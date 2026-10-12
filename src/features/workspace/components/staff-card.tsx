import { useCallback, useEffect, useState } from 'react'
import { MessageChatSquare } from '../../../components/icon/message-chat-square'
import {
  addStaff,
  fetchStaff,
  removeStaff,
  resendStaffAsk,
  saveStaffSettings,
  type StaffMember,
  type StaffState,
} from '../services/staff-service'

const ghost =
  'px-2.5 py-1.5 border border-primary rounded-lg paragraph-xs text-secondary hover:bg-tertiary transition-colors disabled:opacity-50'
const solid =
  'px-2.5 py-1.5 rounded-lg paragraph-xs bg-brand-solid text-primary-onbrand hover:opacity-90 transition-opacity disabled:opacity-50'
const field =
  'w-full px-3 py-2 rounded-lg border border-primary bg-primary paragraph-sm text-primary placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-utility-info-500'

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''

/**
 * Staff on WhatsApp (Oct 2026): the people on the floor who send Mia photos and ideas, with no
 * login. The owner types a name and a number; Mia asks that phone to join; their YES makes
 * them a viewer. Removing them stops the number at once. The two switches are the owner's:
 * whether staff may have Mia write posts, and how many photos / drawn pictures a day each.
 */
export const StaffCard = ({ sessionId, tenantId }: { sessionId: string | null; tenantId: string }) => {
  const [state, setState] = useState<StaffState | null>(null)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [role, setRole] = useState<'viewer' | 'admin'>('viewer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    if (!sessionId) return
    try {
      setState(await fetchStaff(sessionId, tenantId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your staff')
    }
  }, [sessionId, tenantId])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const add = () =>
    run(async () => {
      if (!sessionId) return
      const res = await addStaff(sessionId, tenantId, { name: name.trim(), whatsapp_number: number.trim(), role })
      setNotice(res.message)
      setName('')
      setNumber('')
      setShowForm(false)
      await load()
    })

  const resend = (m: StaffMember) =>
    run(async () => {
      if (!sessionId) return
      const res = await resendStaffAsk(sessionId, tenantId, m.user_id)
      setNotice(res.message)
    })

  const remove = (m: StaffMember) =>
    run(async () => {
      if (!sessionId) return
      if (!window.confirm(`Remove ${m.name}? Their number stops working with Mia straight away.`)) return
      await removeStaff(sessionId, tenantId, m.user_id)
      setNotice(`${m.name} removed.`)
      await load()
    })

  const save = (patch: Parameters<typeof saveStaffSettings>[2]) =>
    run(async () => {
      if (!sessionId || !state) return
      const next = await saveStaffSettings(sessionId, tenantId, patch)
      setState({ ...state, ...next })
    })

  if (state?.unavailable) {
    return (
      <Shell>
        <p className="paragraph-xs text-quaternary">Staff on WhatsApp is not part of this workspace's plan.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      {state && state.staff.length > 0 && (
        <ul className="flex flex-col divide-y divide-tertiary">
          {state.staff.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="paragraph-sm text-primary truncate">
                  {m.name}
                  <span className="paragraph-xs text-quaternary"> · {m.role === 'admin' ? 'can approve' : 'sends ideas'}</span>
                </p>
                <p className="paragraph-xs text-quaternary truncate">
                  {m.whatsapp_number}
                  {m.status === 'joined'
                    ? ` · joined${m.joined_at ? ` ${fmt(m.joined_at)}` : ''}`
                    : ` · asked${m.invited_at ? ` ${fmt(m.invited_at)}` : ''}, not joined yet`}
                </p>
              </div>
              {m.status === 'invited' && (
                <button type="button" onClick={() => void resend(m)} disabled={busy} className={ghost}>
                  Ask again
                </button>
              )}
              <button type="button" onClick={() => void remove(m)} disabled={busy} className={`${ghost} text-error`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {state && state.staff.length === 0 && !showForm && (
        <p className="paragraph-xs text-quaternary">
          Nobody yet. Add the people who see the good moments; they send Mia photos on WhatsApp and you approve what goes out.
        </p>
      )}

      {showForm ? (
        <div className="flex flex-col gap-2">
          <input
            id="staff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Their first name"
            className={field}
          />
          <input
            id="staff-number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="WhatsApp number, e.g. 082 123 4567"
            inputMode="tel"
            className={field}
          />
          <label className="paragraph-xs text-quaternary flex items-center gap-2">
            <input id="staff-admin" type="checkbox" checked={role === 'admin'} onChange={(e) => setRole(e.target.checked ? 'admin' : 'viewer')} />
            They may approve posts too (admin)
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void add()} disabled={busy || !name.trim() || !number.trim()} className={solid}>
              {busy ? 'Asking…' : 'Ask them to join'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} disabled={busy} className={ghost}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)} disabled={busy || !state} className={`${ghost} self-start`}>
          Add a staff member
        </button>
      )}

      {state && (
        <div className="flex flex-col gap-2 pt-3 border-t border-tertiary">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="paragraph-sm text-primary">Staff can have Mia write posts</p>
              <p className="paragraph-xs text-quaternary">Off means their photos are kept as ideas only.</p>
            </div>
            <button
              type="button"
              onClick={() => void save({ staff_posts_enabled: !state.staff_posts_enabled })}
              disabled={busy}
              className={ghost}
              aria-pressed={state.staff_posts_enabled}
            >
              {state.staff_posts_enabled ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="paragraph-sm text-primary">Photos a day, each</p>
            <input
              id="staff-photo-cap"
              type="number"
              min={1}
              max={200}
              defaultValue={state.staff_daily_photo_cap}
              onBlur={(e) => {
                const v = Number(e.target.value)
                if (v && v !== state.staff_daily_photo_cap) void save({ staff_daily_photo_cap: v })
              }}
              className={`${field} w-20 text-right`}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="paragraph-sm text-primary">Pictures Mia draws a day, each</p>
              <p className="paragraph-xs text-quaternary">These cost money. 0 switches drawing off for staff.</p>
            </div>
            <input
              id="staff-picture-cap"
              type="number"
              min={0}
              max={50}
              defaultValue={state.staff_daily_picture_cap}
              onBlur={(e) => {
                const v = Number(e.target.value)
                if (!Number.isNaN(v) && v !== state.staff_daily_picture_cap) void save({ staff_daily_picture_cap: v })
              }}
              className={`${field} w-20 text-right`}
            />
          </div>
        </div>
      )}

      {notice && <p className="paragraph-xs text-success-primary">{notice}</p>}
      {error && <p className="paragraph-xs text-error">{error}</p>}
    </Shell>
  )
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <section id="staff-whatsapp" className="settings-card rounded-lg border border-tertiary bg-secondary p-3 flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-tertiary flex items-center justify-center shrink-0 text-secondary">
        <MessageChatSquare size={16} />
      </div>
      <div className="min-w-0">
        <p className="subheading-md text-primary">Staff on WhatsApp</p>
        <p className="paragraph-xs text-quaternary">They send photos and ideas; you approve what goes out. No login needed.</p>
      </div>
    </div>
    {children}
  </section>
)
