import { apiFetch } from '../utils/api'
import { useState, useEffect } from 'react'
import { useSession } from '../contexts/SessionContext'
import DateRangeSelector from './DateRangeSelector'

interface SummaryInsightsProps {
  onBack?: () => void
}

interface SummaryResponse {
  success: boolean
  type: string
  summary: string
}

const SummaryInsights = ({ onBack }: SummaryInsightsProps) => {
  const { sessionId, selectedAccount } = useSession()
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<string>('30_days')
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false)

  // Helper function to calculate and format date range
  const getDateRangeDisplay = (range: string): string => {
    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, '0')
      const month = date.toLocaleDateString('en-GB', { month: 'short' })
      return `${day} ${month}`
    }

    // Check if it's a custom date range (format: YYYY-MM-DD_YYYY-MM-DD)
    if (range.includes('_') && range.match(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/)) {
      const [startStr, endStr] = range.split('_')
      const startDate = new Date(startStr)
      const endDate = new Date(endStr)
      return `${formatDate(startDate)} - ${formatDate(endDate)}`
    }

    // Handle preset date ranges
    const today = new Date()
    const daysMap: { [key: string]: number } = {
      '7_days': 7,
      '14_days': 14,
      '30_days': 30,
      '90_days': 90
    }

    const days = daysMap[range] || 30
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - (days - 1))  // Match backend: days - 1 for inclusive count

    return `${formatDate(startDate)} - ${formatDate(today)}`
  }

  useEffect(() => {
    fetchSummary()
  }, [selectedDateRange])

  const fetchSummary = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!sessionId) {
        throw new Error('No session found. Please log in again.')
      }

      const response = await apiFetch('/api/quick-insights/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          date_range: selectedDateRange
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: SummaryResponse = await response.json()

      if (result.success) {
        setSummary(result.summary)
      } else {
        throw new Error('Failed to fetch summary')
      }

    } catch (error) {
      console.error('[SUMMARY-INSIGHTS] Error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full h-full relative flex flex-col" style={{ backgroundColor: '#290068' }}>
      {/* Date Range Selector */}
      <DateRangeSelector
        isOpen={isDateSelectorOpen}
        onClose={() => setIsDateSelectorOpen(false)}
        selectedRange={selectedDateRange}
        onApply={setSelectedDateRange}
      />

      {/* Header */}
      <div className="flex items-center px-4 py-3 relative z-20 flex-shrink-0 bg-white">
        <div className="flex-1 flex justify-start pl-2">
          {/* Empty space for symmetry */}
        </div>

        <h1 className="text-xl font-normal text-black text-center" style={{ fontFamily: 'Geologica, sans-serif', fontSize: '20px', fontWeight: 400, lineHeight: '110%' }}>
          Summary
        </h1>

        <div className="flex-1 flex justify-end pr-2">
          <div className="relative">
            <button
              onClick={() => setIsDateSelectorOpen(!isDateSelectorOpen)}
              className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity active:scale-90"
            >
              <img src="/icons/calendar.svg" alt="Calendar" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Gradient Header */}
      <div
        className="relative flex items-center justify-between px-4 py-4 overflow-hidden"
        style={{ minHeight: '100px' }}
      >
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #290068 0%, #4A148C 50%, #6A1B9A 100%)',
            zIndex: 0
          }}
        />

        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center justify-center active:scale-90 transition-all duration-100"
          style={{
            color: '#FFF',
            padding: '12px',
            marginLeft: '-8px',
            minWidth: '44px',
            minHeight: '44px',
            position: 'relative',
            transform: 'translateY(-5px) translateX(15px)',
            zIndex: 20
          }}
        >
          <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
            <path d="M7.18572 13L0.822088 6.63636L7.18572 0.272727L8.27947 1.35227L3.77663 5.85511H15.4386V7.41761H3.77663L8.27947 11.9062L7.18572 13Z" fill="white"/>
          </svg>
        </button>

        <div className="flex flex-col items-end" style={{ zIndex: 10, position: 'relative', transform: 'translateY(-5px) translateX(-20px)' }}>
          <span className="text-white font-medium text-lg">{getDateRangeDisplay(selectedDateRange)}</span>
          {selectedAccount && (
            <span className="text-white/80 text-sm font-normal mt-0.5">{selectedAccount.name}</span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white p-6 pb-6 safe-bottom overflow-y-auto rounded-t-2xl -mt-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-sm">Generating executive summary...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={fetchSummary}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {summary && !isLoading && !error && (
          <div className="space-y-6">
            {/* Executive Summary Box */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 16C6.68629 16 4 13.3137 4 10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16Z" fill="#2563EB"/>
                  <path d="M10 6C9.44772 6 9 6.44772 9 7V11C9 11.5523 9.44772 12 10 12C10.5523 12 11 11.5523 11 11V7C11 6.44772 10.5523 6 10 6Z" fill="#2563EB"/>
                  <path d="M10 13C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15C10.5523 15 11 14.5523 11 14C11 13.4477 10.5523 13 10 13Z" fill="#2563EB"/>
                </svg>
                Executive Summary
              </h2>
              <p className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">{summary}</p>
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">Quick snapshot</span> covering your biggest growth opportunities, optimisation needs, and protection strategies. For detailed insights, visit the Grow, Optimise, or Protect pages.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SummaryInsights
