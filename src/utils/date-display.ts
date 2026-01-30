/**
 * Format a date range string for display
 * Handles both preset ranges (7_days, 14_days, etc.) and custom ranges (YYYY-MM-DD_YYYY-MM-DD)
 */
export function getDateRangeDisplay(range: string): string {
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = date.toLocaleDateString('en-GB', { month: 'short' })
    return `${day} ${month}`
  }

  // Handle custom date range format: YYYY-MM-DD_YYYY-MM-DD
  if (range.includes('_') && range.match(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/)) {
    const [startStr, endStr] = range.split('_')
    const startDate = new Date(startStr)
    const endDate = new Date(endStr)
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  // Handle preset ranges
  const today = new Date()
  const daysMap: { [key: string]: number } = {
    '7_days': 7,
    '14_days': 14,
    '30_days': 30,
    '90_days': 90
  }

  const days = daysMap[range] || 30
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - (days - 1))

  return `${formatDate(startDate)} - ${formatDate(today)}`
}
