// Referrals, the small part (P2, mia-backend services/referrals): a ?ref= code survives the
// Meta sign-in redirect in localStorage (like PENDING_INVITE), shows "Lesley invited you" on the
// landing screen, and is sent when the first workspace is created.

import { apiFetch } from '../../utils/api'
import { StorageKey } from '../../constants/storage-keys'

export interface Inviter {
  first_name: string | null
  business: string
}

/** Keep a ?ref= from the address bar. Called once on load. */
export const captureReferral = (): void => {
  try {
    const code = new URLSearchParams(window.location.search).get('ref')
    if (code && /^[a-z0-9]{4,16}$/i.test(code)) localStorage.setItem(StorageKey.PENDING_REFERRAL, code.toLowerCase())
  } catch {
    /* private windows: the invite is simply not carried */
  }
}

export const pendingReferral = (): string | null => {
  try {
    return localStorage.getItem(StorageKey.PENDING_REFERRAL)
  } catch {
    return null
  }
}

export const clearReferral = (): void => {
  try {
    localStorage.removeItem(StorageKey.PENDING_REFERRAL)
  } catch {
    /* see above */
  }
}

export const fetchInviter = async (code: string): Promise<Inviter | null> => {
  try {
    const r = await apiFetch(`/api/referrals/${encodeURIComponent(code)}`)
    return r.ok ? ((await r.json()) as Inviter) : null
  } catch {
    return null
  }
}
