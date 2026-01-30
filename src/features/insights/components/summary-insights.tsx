import { apiFetch } from '../../../utils/api'
import { useState, useEffect, useRef } from 'react'
import { useSession } from '../../../contexts/session-context'
import { TopBar } from '../../../components/top-bar'
import { getDateRangeDisplay } from '../../../utils/date-display'
import DateRangeSelector from '../../../components/date-range-selector'

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
  const datePickerButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fetchSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Date picker button for TopBar right slot
  const datePickerButton = (
    <button
      ref={datePickerButtonRef}
      type="button"
      onClick={() => setIsDateSelectorOpen(!isDateSelectorOpen)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
    >
      <img src="/icons/calendar.svg" alt="" className="w-5 h-5" />
      <span className="text-sm font-medium text-gray-700">
        {getDateRangeDisplay(selectedDateRange)}
      </span>
    </button>
  )

  return (
    <div className="w-full h-full relative flex flex-col bg-white">
      {/* Date Range Selector */}
      <DateRangeSelector
        isOpen={isDateSelectorOpen}
        onClose={() => setIsDateSelectorOpen(false)}
        selectedRange={selectedDateRange}
        onApply={setSelectedDateRange}
        anchorRef={datePickerButtonRef}
      />

      {/* Top Bar */}
      <TopBar
        title="Summary"
        onBack={onBack}
        rightSlot={datePickerButton}
        className="relative z-20 border-b border-gray-100"
      />

      {/* Gradient Hero Section */}
      <div
        className="relative flex items-center justify-center px-4 py-6 overflow-hidden"
        style={{ minHeight: '80px' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #290068 0%, #4A148C 50%, #6A1B9A 100%)'
          }}
        />
        {selectedAccount && (
          <span className="text-white/80 text-sm font-normal relative z-10">
            {selectedAccount.name}
          </span>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white p-6 pb-6 safe-bottom overflow-y-auto rounded-t-2xl -mt-4 relative z-10">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 max-w-3xl mx-auto w-full">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-sm">Generating executive summary...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-3xl mx-auto w-full">
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
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            {/* Executive Summary Box */}
            <div className="bg-linear-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
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
