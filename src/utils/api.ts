/**
 * API utility for handling base URL configuration
 * Uses environment variable for production deployment
 */

import { clearSessionStorage, getStoredSessionId } from './session'

// Get API base URL from environment variable with localhost fallback
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Track if we're already handling an auth error to prevent redirect loops
let isHandlingAuthError = false

/**
 * Authoritatively check whether the user's Mia session is still valid.
 *
 * /api/session/validate always responds 200 with {valid: true|false}, so it
 * can never itself trigger a logout loop. Returns true on a network error too:
 * if we can't reach the server we must NOT assume the session is dead.
 */
async function isSessionStillValid(): Promise<boolean> {
  const sessionId = getStoredSessionId()
  if (!sessionId) return false
  try {
    const resp = await fetch(
      createApiUrl(`/api/session/validate?session_id=${encodeURIComponent(sessionId)}`)
    )
    if (!resp.ok) return false
    const data = await resp.json()
    return data?.valid === true
  } catch {
    return true // transient network blip — don't punish the user with a logout
  }
}

function forceLogout(): void {
  console.warn('[API] Mia session invalid - redirecting to login')
  clearSessionStorage()

  // Only redirect if not already on login/landing page or public invite page
  if (
    !window.location.pathname.startsWith('/login') &&
    !window.location.pathname.startsWith('/invite/') &&
    window.location.pathname !== '/'
  ) {
    window.location.href = '/'
  }
}

/**
 * Handle 401/403 responses.
 *
 * A 401/403 used to log the user out unconditionally. But third-party data
 * endpoints (HubSpot, Figma, Brevo, LinkedIn) return 401/403 when THEIR token
 * is dead — that must never log the user out of Mia. So we only log out when
 * Mia's own session actually fails to validate.
 */
async function handleAuthError(): Promise<void> {
  if (isHandlingAuthError) return
  isHandlingAuthError = true

  try {
    if (await isSessionStillValid()) {
      console.warn(
        '[API] 401/403 from a downstream service, but Mia session is valid - not logging out'
      )
    } else {
      forceLogout()
    }
  } finally {
    // Reset flag after a delay to allow future auth errors to be handled
    setTimeout(() => {
      isHandlingAuthError = false
    }, 5000)
  }
}

/**
 * Create a full API URL from a relative path
 * @param path - API path starting with /api/
 * @returns Full API URL
 */
export function createApiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${API_BASE_URL}/${cleanPath}`
}

/**
 * Create standard API headers with session ID
 * @param sessionId - Session ID to include
 * @param includeContentType - Whether to include Content-Type: application/json
 * @returns Headers object
 */
export function createSessionHeaders(
  sessionId?: string | null,
  includeContentType = false
): HeadersInit {
  const headers: Record<string, string> = {}

  if (sessionId) {
    headers['X-Session-ID'] = sessionId
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

/**
 * Fetch wrapper that automatically uses the correct API base URL
 * Handles 401/403 responses by clearing session and redirecting to login
 * @param path - API path (e.g., '/api/oauth/meta/auth-url')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(createApiUrl(path), options)

  // Handle authentication errors (validates Mia session before any logout)
  if (response.status === 401 || response.status === 403) {
    void handleAuthError()
  }

  return response
}

/**
 * Safe JSON parsing that won't throw on non-JSON responses
 * @param response - Fetch response
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed JSON or fallback
 */
export async function safeJson<T>(response: Response, fallback: T): Promise<T> {
  try {
    return await response.json()
  } catch {
    return fallback
  }
}
