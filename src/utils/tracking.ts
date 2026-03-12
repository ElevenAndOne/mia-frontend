import { apiFetch } from './api'

/**
 * Fire-and-forget event tracking.
 * Sends to POST /api/track — never throws, never blocks UI.
 */
export const trackEvent = (
  sessionId: string | null,
  eventType: string,
  page?: string,
  data?: Record<string, unknown>
) => {
  if (!sessionId) return

  apiFetch('/api/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({
      session_id: sessionId,
      event_type: eventType,
      page,
      data,
    }),
  }).catch(() => {
    // Silently ignore tracking failures
  })
}
