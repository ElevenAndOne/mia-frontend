/**
 * Session ID generation utilities
 */

/**
 * Generate a unique session ID
 * Format: session_{timestamp}_{random9chars}
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Detect if running on mobile device
 * Used to determine OAuth flow (popup vs redirect)
 */
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
