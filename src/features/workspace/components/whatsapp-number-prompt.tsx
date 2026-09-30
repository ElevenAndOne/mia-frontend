import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import { Modal } from '../../overlay'
import { useExperience } from '../hooks/use-experience'
import { setWhatsAppPromptGate } from '../hooks/whatsapp-prompt-gate'
import {
  confirmWhatsAppVerification,
  fetchWhatsAppNumber,
  startWhatsAppVerification,
  type WhatsAppNumberState,
} from '../services/whatsapp-number-service'

const DISMISS_DAYS = 7
const key = (tenantId: string) => `mia_wa_prompt_dismissed_${tenantId}`
const field =
  'w-full px-3 py-2.5 rounded-lg border border-primary bg-primary paragraph-sm text-primary placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-utility-info-500'

type Stage = 'number' | 'code' | 'done'

/**
 * Mia on a Basic workspace works on WhatsApp, so a member without a verified number is
 * holding an app they were never meant to live in. The first time they land (an invited
 * colleague, or an owner who skipped the number in onboarding) this asks once, and takes
 * the number and the six-digit code right here: invited → modal → number → code → Mia's
 * first message arrives on their phone, without a trip to workspace settings (Josh, 29 Sep
 * 2026). The number is stored on the workspace like one added from the settings card.
 * Dismissing it is remembered for a week per workspace. Not on onboarding or invite pages,
 * where the number is part of the flow already.
 */
export const WhatsAppNumberPrompt = () => {
  const { sessionId, activeWorkspace } = useSession()
  const { isBasic } = useExperience()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<Stage>('number')
  const [state, setState] = useState<WhatsAppNumberState | null>(null)
  const [number, setNumber] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const tenantId = activeWorkspace?.tenant_id ?? null
  const offFlow = /^\/(onboarding|invite|login|settings\/workspace)/.test(location.pathname)

  useEffect(() => {
    // The canvas on Home waits for this decision (whatsapp-prompt-gate). Not Basic, or not
    // a page the prompt belongs on: nothing to wait for.
    if (!isBasic || offFlow) {
      setWhatsAppPromptGate('done')
      return
    }
    if (!sessionId || !tenantId) return
    let dismissedAt = 0
    try {
      dismissedAt = Number(localStorage.getItem(key(tenantId)) || 0)
    } catch {
      /* no storage: ask once per load */
    }
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 3600 * 1000) {
      setWhatsAppPromptGate('done')
      return
    }
    let live = true
    fetchWhatsAppNumber(sessionId)
      .then((s) => {
        if (!live) return
        if (!s || s.unavailable || s.verified) {
          setWhatsAppPromptGate('done')
          return
        }
        setState(s)
        // A code already in flight (they started on the settings card) resumes at the code.
        if (s.awaiting_code && s.whatsapp_number) {
          setNumber(s.whatsapp_number)
          setStage('code')
        } else if (s.whatsapp_number) {
          setNumber(s.whatsapp_number)
        }
        setWhatsAppPromptGate('open')
        setOpen(true)
      })
      .catch(() => {
        setWhatsAppPromptGate('done') /* nothing to ask about if the read failed */
      })
    return () => {
      live = false
    }
  }, [isBasic, sessionId, tenantId, offFlow])

  const dismiss = () => {
    setOpen(false)
    setWhatsAppPromptGate('done')
    if (tenantId) {
      try {
        localStorage.setItem(key(tenantId), String(Date.now()))
      } catch {
        /* fine */
      }
    }
  }

  const finish = () => {
    setOpen(false)
    setWhatsAppPromptGate('done')
  }

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
      const res = await startWhatsAppVerification(sessionId, number.trim())
      setNotice(
        res.delivered
          ? `Code sent to ${number.trim()} on WhatsApp. It expires in 10 minutes.`
          : `Code created for ${number.trim()}, but WhatsApp could not deliver it yet. Check the number.`
      )
      setCode('')
      setStage('code')
    })

  const confirm = () =>
    run(async () => {
      if (!sessionId) return
      await confirmWhatsAppVerification(sessionId, code.trim())
      const next = await fetchWhatsAppNumber(sessionId)
      setState(next)
      setStage('done')
    })

  if (!open) return null
  return (
    <Modal
      isOpen
      onClose={stage === 'done' ? finish : dismiss}
      title="Mia works on WhatsApp"
      size="sm"
    >
      <div className="p-6 flex flex-col gap-4">
        {stage === 'number' && (
          <>
            <p className="paragraph-sm text-secondary">
              Send Mia a photo on WhatsApp and she writes your posts, ready to go out. Add your
              number and she'll text you a code to check it's your phone.
            </p>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="082 123 4567"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && number.trim().length >= 8 && !busy) void sendCode()
              }}
              className={field}
            />
            {error && <p className="paragraph-xs text-error-primary">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
                Later
              </Button>
              <Button size="sm" onClick={sendCode} disabled={busy || number.trim().length < 8}>
                {busy ? 'Sending…' : 'Send me the code'}
              </Button>
            </div>
          </>
        )}

        {stage === 'code' && (
          <>
            <p className="paragraph-sm text-secondary">
              {notice ?? `We sent a six-digit code to ${number} on WhatsApp.`}
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.trim().length >= 4 && !busy) void confirm()
              }}
              className={field}
            />
            {error && <p className="paragraph-xs text-error-primary">{error}</p>}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={sendCode}
                disabled={busy}
                className="paragraph-xs text-quaternary hover:text-secondary"
              >
                Send a new code
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage('number')
                  setCode('')
                  setError(null)
                  setNotice(null)
                }}
                disabled={busy}
                className="paragraph-xs text-quaternary hover:text-secondary"
              >
                Use a different number
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
                Later
              </Button>
              <Button size="sm" onClick={confirm} disabled={busy || code.trim().length < 4}>
                {busy ? 'Checking…' : 'Confirm'}
              </Button>
            </div>
          </>
        )}

        {stage === 'done' && (
          <>
            <p className="paragraph-sm text-secondary">
              That's your phone. Mia has just messaged you on WhatsApp: reply there and send her
              a photo whenever you're ready. Your number is saved under workspace settings.
            </p>
            <div className="flex gap-2 justify-end">
              {state?.start_chat_url && (
                <a
                  href={state.start_chat_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-lg border border-primary bg-primary px-3 py-2 paragraph-sm text-secondary hover:bg-tertiary transition-colors"
                >
                  Open WhatsApp
                </a>
              )}
              <Button size="sm" onClick={finish}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
