import { formatDateRangeDisplay } from './date-range'

/**
 * Format a date range string for display.
 * Wrapper around shared date-range utilities for backward compatibility.
 */
export function getDateRangeDisplay(range: string): string {
  return formatDateRangeDisplay(range, 'range')
}
