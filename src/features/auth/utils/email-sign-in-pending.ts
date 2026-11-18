// Where they are survives a reload (18 Nov 2026). Trystin's first try: the code arrived, he
// switched to his inbox, came back, the page had reloaded and the form was back at "your
// email" with nowhere to type the code. sessionStorage is per tab and outlives a reload; the
// 10 minutes match the code's life. Every access guarded: storage can throw or be empty.
const PENDING_KEY = 'mia_email_signin_pending'
const PENDING_MS = 10 * 60 * 1000

interface Pending {
  email: string
  inviteId: string | null
  at: number
}

export const readPending = (inviteId?: string): Pending | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Pending
    if (!p?.email || Date.now() - p.at > PENDING_MS) return null
    if ((p.inviteId ?? null) !== (inviteId ?? null)) return null
    return p
  } catch {
    return null
  }
}

export const savePending = (email: string, inviteId?: string) => {
  try {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ email, inviteId: inviteId ?? null, at: Date.now() } satisfies Pending)
    )
  } catch {
    // no storage: the form still works, it just won't survive a reload
  }
}

export const clearPending = () => {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // ignore
  }
}

/** A code was sent from this tab in the last 10 minutes (for this invite, or for the
 * login page when inviteId is undefined): open the form straight on the code step. */
export const hasPendingEmailSignIn = (inviteId?: string): boolean => readPending(inviteId) !== null
