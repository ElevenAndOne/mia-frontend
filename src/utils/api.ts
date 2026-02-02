/**
 * API utility for handling base URL configuration
 * Uses environment variable for production deployment
 */

// Get API base URL from environment variable with smart defaults
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('ondigitalocean.app')
    ? 'https://dolphin-app-b869e.ondigitalocean.app'
    : 'http://localhost:8000')

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
 * @param path - API path (e.g., '/api/oauth/meta/auth-url')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(createApiUrl(path), options)
}