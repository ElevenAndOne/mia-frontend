import { useCallback, useEffect, useState } from 'react'
import { MessageChatSquare } from '../../../components/icon/message-chat-square'
import {
  confirmWhatsAppVerification,
  fetchWhatsAppNumber,
  removeWhatsAppNumber,
  startWhatsAppVerification,
  type WhatsAppNumberState,
} from '../services/whatsapp-number-service'

const ghost =
  'px-2.5 py-1.5 border border-primary rounded-lg paragraph-xs text-secondary hover:bg-tertiary transition-colors disabled:opacity-50'
const solid =
  'px-2.5 py-1.5 rounded-lg paragraph-xs bg-brand-solid text-primary-onbrand hover:opacity-90 transition-opacity disabled:opacity-50'
const field =
  'w-full px-3 py-2 rounded-lg border border-primary bg-primary paragraph-sm text-primary placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-utility-info-500'

/**
 * Add the phone number that can send Mia photos on WhatsApp.
 *
 * Three states, because there are genuinely three: no number, a code in flight, a verified
 * number. The middle one is the point of the whole component — typing a number proves
 * nothing, and the code is sent to that phone rather than shown here, so adding a
 * colleague's number by mistake (or on purpose) gets you nowhere.
 *
 * Any member of the workspace can add their own (D1); only owners and admins can schedule
 * what comes back (D16), which the flow itself enforces, not this form.
 */
export const WhatsAppNumberCard = ({
  sessionId,
  messagesSlot,
  mode = 'full',
}: {
  sessionId: string | null
  /** The workspace-level "may Mia message you" switch. Rendered here so WhatsApp is one
   *  place: your number coming in, Mia's messages going out. */
  messagesSlot?: React.ReactNode
  /**
   * `full` — this card owns the number (Basic, where it is the only WhatsApp field).
   *
   * `confirm` — the number is owned by the alerts form beside it; this card only adds
   * proof. Team and Agency have received alerts on unverified numbers for years, and
   * alerts are outbound only so they never needed proof. Demanding a code to receive an
   * alert would sign out every existing subscriber — so confirming is an extra step on a
   * number they already saved, never a gate in front of it.
   */
  mode?: 'full' | 'confirm'
}) => {
  const [state, setState] = useState<WhatsAppNumberState | null>(null)
  const [number, setNumber] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    try {
      const next = await fetchWhatsAppNumber(sessionId)
      setState(next)
      if (next.whatsapp_number) setNumber(next.whatsapp_number)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your number')
    }
  }, [sessionId])

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

  const sendCode = () =>
    run(async () => {
      if (!sessionId) return
      const target = mode === 'confirm' ? state?.whatsapp_number || number : number
      const res = await startWhatsAppVerification(sessionId, target)
      setNotice(
        res.delivered
          ? `Code sent to ${target}. It expires in 10 minutes.`
          : `Code created for ${target}, but WhatsApp could not deliver it yet.`
      )
      setCode('')
      await load()
    })

  const confirm = () =>
    run(async () => {
      if (!sessionId) return
      const res = await confirmWhatsAppVerification(sessionId, code)
      setNotice(res.message)
      setCode('')
      await load()
    })

  const remove = () =>
    run(async () => {
      if (!sessionId) return
      await removeWhatsAppNumber(sessionId)
      setNumber('')
      setCode('')
      setNotice('Number removed.')
      await load()
    })

  // Not on the pilot allowlist yet. A plain statement beats an input that would 403.
  if (state?.unavailable) {
    return (
      <Shell mode={mode}>
        <p className="paragraph-xs text-quaternary">
          Sending photos to Mia is not switched on for this workspace yet.
        </p>
        {messagesSlot}
      </Shell>
    )
  }

  return (
    <Shell mode={mode}>
      {state?.verified ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="paragraph-sm text-primary">{state.whatsapp_number}</span>
          <span className="paragraph-xs text-success-primary">· confirmed</span>
          <button type="button" onClick={remove} disabled={busy} className={`${ghost} ml-auto`}>
            Remove
          </button>
        </div>
      ) : state?.awaiting_code ? (
        <div className="flex flex-col gap-2">
          <p className="paragraph-xs text-quaternary">
            We sent a six-digit code to {state.whatsapp_number} on WhatsApp.
          </p>
          <div className="flex gap-2">
            <input
              id="whatsapp-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={field}
            />
            <button
              type="button"
              onClick={confirm}
              disabled={busy || code.trim().length < 4}
              className={solid}
            >
              Confirm
            </button>
          </div>
          <button
            type="button"
            onClick={sendCode}
            disabled={busy}
            className="paragraph-xs text-quaternary hover:text-secondary self-start"
          >
            Send a new code
          </button>
        </div>
      ) : mode === 'confirm' ? (
        state?.whatsapp_number ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="paragraph-sm text-primary">{state.whatsapp_number}</span>
            <span className="paragraph-xs text-quaternary">· not confirmed yet</span>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy}
              className={`${solid} ml-auto`}
            >
              Confirm this number
            </button>
          </div>
        ) : (
          <p className="paragraph-xs text-quaternary">
            Save your number above, then confirm it here to send Mia photos.
          </p>
        )
      ) : (
        <div className="flex gap-2">
          <input
            id="whatsapp-number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+27 82 123 4567"
            inputMode="tel"
            autoComplete="tel"
            className={field}
          />
          <button
            type="button"
            onClick={sendCode}
            disabled={busy || number.trim().length < 8}
            className={solid}
          >
            Send code
          </button>
        </div>
      )}

      {notice && <p className="paragraph-xs text-quaternary">{notice}</p>}
      {error && <p className="paragraph-xs text-error-primary">{error}</p>}
      {messagesSlot}
    </Shell>
  )
}

const Shell = ({
  children,
  mode = 'full',
}: {
  children: React.ReactNode
  mode?: 'full' | 'confirm'
}) => (
  <div className="flex items-start gap-3 px-3 py-3">
    <div className="w-8 h-8 rounded-lg bg-tertiary flex items-center justify-center shrink-0 text-secondary">
      <MessageChatSquare size={16} />
    </div>
    <div className="min-w-0 flex-1 flex flex-col gap-2">
      <div>
        <p className="subheading-md text-primary">
          {mode === 'confirm' ? 'Send Mia photos' : 'WhatsApp'}
        </p>
        <p className="paragraph-xs text-quaternary">
          {mode === 'confirm'
            ? 'Confirm your number and you can send Mia a photo on WhatsApp — she drafts posts from it.'
            : "Send Mia a photo and she'll draft posts from it. Everyone here can add their own number."}
        </p>
      </div>
      {children}
    </div>
  </div>
)
