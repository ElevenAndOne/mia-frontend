/**
 * API utility for handling base URL configuration
 * Uses environment variable for production deployment
 */

import { clearSessionStorage } from './session'

// Get API base URL from environment variable with localhost fallback
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Track if we're already handling an auth error to prevent redirect loops
let isHandlingAuthError = false

/**
 * Handle 401/403 responses by clearing session and redirecting to login
 */
function handleAuthError(): void {
  if (isHandlingAuthError) return
  isHandlingAuthError = true

  console.warn('[API] Session expired or unauthorized - redirecting to login')
  clearSessionStorage()

  // Only redirect if not already on login/landing page or public invite page
  if (
    !window.location.pathname.startsWith('/login') &&
    !window.location.pathname.startsWith('/invite/') &&
    window.location.pathname !== '/'
  ) {
    window.location.href = '/'
  }

  // Reset flag after a delay to allow future auth errors to be handled
  setTimeout(() => {
    isHandlingAuthError = false
  }, 5000)
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

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    handleAuthError()
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