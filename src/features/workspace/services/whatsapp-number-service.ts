/**
 * Registering a WhatsApp number (docs2/BASIC_WHATSAPP_PLAN.md T3, §6.1).
 *
 * A number typed here is a claim; a number that answered a six-digit code is proof. Only
 * the second lets someone send Mia a photo and get posts back, because the end of that flow
 * publishes to the workspace's real Facebook Page.
 *
 * Every call can come back 403 while WhatsApp is still being built — the backend serves
 * only the workspaces on its pilot allowlist. That is a normal state to render, not an
 * error to shout about, so it is surfaced as a typed flag rather than a thrown message.
 */
import { apiFetch } from '../../../utils/api'

export interface WhatsAppNumberState {
  whatsapp_number: string | null
  verified: boolean
  verified_at: string | null
  /** A code has been sent and is waiting to be typed back. */
  awaiting_code: boolean
  alerts_subscribed: boolean
  /** True when this workspace is not on the WhatsApp pilot allowlist yet. */
  unavailable?: boolean
  /** A wa.me link that opens WhatsApp with Mia's number and a message ready to send. */
  start_chat_url?: string | null
}

const headers = (sessionId: string) => ({
  'X-Session-ID': sessionId,
  'Content-Type': 'application/json',
})

/** Reads the error body the backend sent, falling back to something a person can act on. */
const detailOf = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = await response.json()
    return typeof body?.detail === 'string' ? body.detail : fallback
  } catch {
    return fallback
  }
}

export const fetchWhatsAppNumber = async (
  sessionId: string
): Promise<WhatsAppNumberState> => {
  const response = await apiFetch('/api/whatsapp/me/number', {
    headers: { 'X-Session-ID': sessionId },
  })
  if (response.status === 403) {
    return {
      whatsapp_number: null,
      verified: false,
      verified_at: null,
      awaiting_code: false,
      alerts_subscribed: false,
      unavailable: true,
    }
  }
  if (!response.ok) throw new Error(await detailOf(response, 'Could not load your number'))
  return response.json()
}

/** Attach a number and send it a code. The code goes to that phone, never to the caller. */
export const startWhatsAppVerification = async (
  sessionId: string,
  whatsappNumber: string
): Promise<{ delivered: boolean; message: string }> => {
  const response = await apiFetch('/api/whatsapp/me/number/start', {
    method: 'POST',
    headers: headers(sessionId),
    body: JSON.stringify({ whatsapp_number: whatsappNumber }),
  })
  if (!response.ok) throw new Error(await detailOf(response, 'Could not send the code'))
  return response.json()
}

export const confirmWhatsAppVerification = async (
  sessionId: string,
  code: string
): Promise<{ message: string }> => {
  const response = await apiFetch('/api/whatsapp/me/number/confirm', {
    method: 'POST',
    headers: headers(sessionId),
    body: JSON.stringify({ code }),
  })
  if (!response.ok) throw new Error(await detailOf(response, 'That code did not work'))
  return response.json()
}

export const removeWhatsAppNumber = async (sessionId: string): Promise<void> => {
  const response = await apiFetch('/api/whatsapp/me/number', {
    method: 'DELETE',
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) throw new Error(await detailOf(response, 'Could not remove your number'))
}
