import { useState, type FormEvent } from 'react'
import { createApiUrl } from '../../../utils/api'
import { storeSessionId } from '../../../utils/session'
import { logger } from '../../../utils/logger'
import { clearPending, readPending, savePending } from '../utils/email-sign-in-pending'

// Sign in with an email code (18 Nov 2026, backend docs2/EMAIL_CODE_SIGN_IN_PLAN_2026-11-18.md).
// For people whose email is not a Google account — an invite to a work address could not be
// accepted at all before this. They type their email, Mia emails a 6-digit code, they type it.
//
// Plain fetch, not apiFetch: these two calls are made signed-out, and apiFetch treats any
// 401/403 as "your session died" and runs the logout check. A refused code is not that.

const FIELD =
  'w-full rounded-lg border border-primary bg-primary px-3 py-2.5 paragraph-sm text-primary placeholder:text-quaternary'
const PRIMARY =
  'w-full rounded-lg bg-brand-solid px-4 py-3 paragraph-sm font-semibold text-primary-onbrand hover:bg-brand-solid-hover disabled:opacity-50'
const LINK = 'paragraph-xs text-quaternary hover:text-secondary disabled:opacity-50'

interface EmailSignInProps {
  /** The invite being accepted, so a shareable link (no email on it) can let them in. */
  inviteId?: string
  /** Called with the new session id. The caller reloads into it. */
  onSignedIn: (sessionId: string) => void
  onCancel?: () => void
}

const post = (path: string, body: unknown) =>
  fetch(createApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'any' },
    body: JSON.stringify(body),
  })

export const EmailSignIn = ({ inviteId, onSignedIn, onCancel }: EmailSignInProps) => {
  const [email, setEmail] = useState(() => readPending(inviteId)?.email ?? '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>(() =>
    readPending(inviteId) ? 'code' : 'email'
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  const sendCode = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await post('/api/auth/email/start', { email: email.trim(), invite_id: inviteId })
      if (!r.ok) throw new Error(String(r.status))
      savePending(email.trim(), inviteId)
      setStep('code')
    } catch (err) {
      logger.error('[EMAIL-SIGNIN] start failed:', err)
      setError("Couldn't send a code just now. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const onEmail = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim().includes('@')) {
      setError('Type the email address the invite was sent to.')
      return
    }
    void sendCode()
  }

  const onCode = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await post('/api/auth/email/verify', {
        email: email.trim(),
        code: code.trim(),
        invite_id: inviteId,
      })
      const data = await r.json().catch(() => null)
      if (r.ok && data?.session_id) {
        clearPending()
        storeSessionId(data.session_id)
        onSignedIn(data.session_id)
        return
      }
      const message = data?.detail?.message
      setError(typeof message === 'string' ? message : 'Something went wrong. Please try again.')
    } catch (err) {
      logger.error('[EMAIL-SIGNIN] verify failed:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'email') {
    return (
      <form onSubmit={onEmail} className="space-y-3 text-left">
        <label htmlFor="email-signin-address" className="paragraph-sm text-secondary block">
          Your email address
        </label>
        <input
          id="email-signin-address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          autoComplete="email"
          autoFocus
          className={FIELD}
        />
        {error && <p className="paragraph-xs text-error-primary">{error}</p>}
        <button type="submit" disabled={busy || !email.trim()} className={PRIMARY}>
          {busy ? 'Sending…' : 'Email me a code'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={() => {
              clearPending()
              onCancel()
            }}
            disabled={busy}
            className={`${LINK} w-full`}
          >
            Back
          </button>
        )}
      </form>
    )
  }

  return (
    <form onSubmit={(e) => void onCode(e)} className="space-y-3 text-left">
      <p className="paragraph-sm text-secondary">
        If <span className="font-semibold">{email.trim()}</span> can use Mia, a 6-digit code is on
        its way. It can take a minute, and may land in spam.
      </p>
      <input
        id="email-signin-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
        placeholder="6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        className={FIELD}
      />
      {error && <p className="paragraph-xs text-error-primary">{error}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className={PRIMARY}>
        {busy ? 'Checking…' : 'Sign in'}
      </button>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className={LINK}
          disabled={busy}
          onClick={() => {
            clearPending()
            setCode('')
            setStep('email')
            setError(null)
            setResent(false)
          }}
        >
          Use a different email
        </button>
        <button
          type="button"
          className={LINK}
          disabled={busy || resent}
          onClick={() => {
            setResent(true)
            setCode('')
            void sendCode()
          }}
        >
          {resent ? 'New code sent' : 'Send a new code'}
        </button>
      </div>
      <p className="paragraph-xs text-quaternary">
        No code? There's only one if this email was invited to Mia or already signs in with a code.
      </p>
    </form>
  )
}
