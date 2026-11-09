import { formatDateRangeDisplay } from './date-range'

/**
 * Format a date range string for display.
 * Wrapper around shared date-range utilities for backward compatibility.
 */
export function getDateRangeDisplay(range: string): string {
  return formatDateRangeDisplay(range, 'range')
}

/**
 * Format an ISO timestamp into a relative "time ago" string.
 * No timestamp (or an unreadable one) gives '' so callers show nothing. It used to say
 * "Just now", and the backend sends no sync time, so every integration card read
 * "Last synced: Just now", even one whose login had stopped working.
 */
export function getTimeAgo(isoTimestamp?: string): string {
  if (!isoTimestamp) return ''

  try {
    const utcTimestamp = isoTimestamp.endsWith('Z') ? isoTimestamp : `${isoTimestamp}Z`
    const now = new Date()
    const then = new Date(utcTimestamp)
    if (Number.isNaN(then.getTime())) return ''
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } catch {
    return ''
  }
}
