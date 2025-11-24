/**
 * Lightweight fetch wrapper that mirrors the legacy apiFetch helper.
 * - Prefixes relative URLs with the API base URL
 * - Attaches the current session ID to headers
 * - Defaults to sending credentials for cookie-based flows
 */
const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.origin) ||
  'http://localhost:8000'

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = input.startsWith('http') ? input : `${API_BASE_URL}${input.startsWith('/') ? '' : '/'}${input}`

  const headers = new Headers(init.headers)
  const sessionId = typeof window !== 'undefined'
    ? (localStorage.getItem('mia_session_id') || sessionStorage.getItem('session_id'))
    : null

  if (sessionId && !headers.has('X-Session-ID')) {
    headers.set('X-Session-ID', sessionId)
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: init.credentials || 'include'
  })
}
