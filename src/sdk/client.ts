/**
 * Core HTTP Client
 * 
 * Provides low-level HTTP methods with consistent error handling,
 * session management, and response parsing.
 */

import { SDKConfig, RequestOptions, APIResponse } from './types'

export class APIClient {
  private baseURL: string
  private sessionId: string | null = null
  private debug: boolean = false

  constructor(config: SDKConfig = {}) {
    this.baseURL = config.baseURL || this.getDefaultBaseURL()
    this.sessionId = config.sessionId || this.getStoredSessionId()
    this.debug = config.debug || false
  }

  /**
   * Get default base URL with environment and deployment detection
   */
  private getDefaultBaseURL(): string {
    // Check environment variable first
    const apiUrl = import.meta?.env?.VITE_API_BASE_URL
    if (apiUrl) {
      return apiUrl
    }

    // Check if running on DigitalOcean
    if (typeof window !== 'undefined' && window.location.hostname.includes('ondigitalocean.app')) {
      return 'https://dolphin-app-b869e.ondigitalocean.app'
    }

    // Default to localhost
    return 'http://localhost:8000'
  }

  /**
   * Get or create session ID from storage
   */
  private getStoredSessionId(): string | null {
    if (typeof window === 'undefined') return null

    // Check localStorage first
    let sessionId = localStorage.getItem('mia_session_id')
    
    // Fallback to sessionStorage
    if (!sessionId) {
      sessionId = sessionStorage.getItem('session_id')
    }

    // Generate new session ID if none exists
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('mia_session_id', sessionId)
    }

    return sessionId
  }

  /**
   * Set session ID and persist to storage
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId
    if (typeof window !== 'undefined') {
      localStorage.setItem('mia_session_id', sessionId)
      sessionStorage.setItem('session_id', sessionId)
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Clear session ID from storage
   */
  clearSessionId(): void {
    this.sessionId = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mia_session_id')
      sessionStorage.removeItem('session_id')
    }
  }

  /**
   * Build full URL with optional query parameters
   */
  private buildURL(path: string, params?: Record<string, string | number | boolean>): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const url = new URL(`${this.baseURL}/${cleanPath}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }

    return url.toString()
  }

  /**
   * Build headers with session ID and common defaults
   */
  private buildHeaders(customHeaders?: Record<string, string>): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...customHeaders
    })

    // Add session ID if available
    if (this.sessionId) {
      headers.set('X-Session-ID', this.sessionId)
    }

    return headers
  }

  /**
   * Handle fetch response with consistent error handling
   */
  private async handleResponse<T>(response: Response): Promise<APIResponse<T>> {
    try {
      // Try to parse JSON response
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.detail || `HTTP ${response.status}: ${response.statusText}`,
          data: data
        }
      }

      // Handle different response formats
      if (typeof data === 'object' && data !== null) {
        // If response already has success field, use it
        if ('success' in data) {
          return data
        }

        // If response has data field, wrap it
        if ('data' in data) {
          return {
            success: true,
            data: data.data
          }
        }

        // Otherwise return the whole response as data
        return {
          success: true,
          data: data as T
        }
      }

      return {
        success: true,
        data: data as T
      }
    } catch (error) {
      // Handle non-JSON responses or network errors
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Log debug information if enabled
   */
  private log(method: string, path: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[SDK ${method}]`, path, data)
    }
  }

  /**
   * Perform GET request
   */
  async get<T = unknown>(path: string, options: RequestOptions = {}): Promise<APIResponse<T>> {
    const { params, headers, ...fetchOptions } = options
    const url = this.buildURL(path, params)
    
    this.log('GET', path, params)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method: 'GET',
        headers: this.buildHeaders(headers),
        credentials: 'include'
      })

      return this.handleResponse<T>(response)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  /**
   * Perform POST request
   */
  async post<T = unknown>(path: string, body?: unknown, options: RequestOptions = {}): Promise<APIResponse<T>> {
    const { params, headers, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    this.log('POST', path, body)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method: 'POST',
        headers: this.buildHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include'
      })

      return this.handleResponse<T>(response)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  /**
   * Perform PUT request
   */
  async put<T = unknown>(path: string, body?: unknown, options: RequestOptions = {}): Promise<APIResponse<T>> {
    const { params, headers, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    this.log('PUT', path, body)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method: 'PUT',
        headers: this.buildHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include'
      })

      return this.handleResponse<T>(response)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  /**
   * Perform DELETE request
   */
  async delete<T = unknown>(path: string, options: RequestOptions = {}): Promise<APIResponse<T>> {
    const { params, headers, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    this.log('DELETE', path)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method: 'DELETE',
        headers: this.buildHeaders(headers),
        credentials: 'include'
      })

      return this.handleResponse<T>(response)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  /**
   * Perform PATCH request
   */
  async patch<T = unknown>(path: string, body?: unknown, options: RequestOptions = {}): Promise<APIResponse<T>> {
    const { params, headers, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    this.log('PATCH', path, body)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method: 'PATCH',
        headers: this.buildHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include'
      })

      return this.handleResponse<T>(response)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }
}
