import { apiFetch } from '../../../utils/api'
import { useState, useEffect, useRef } from 'react'
import { useSession } from '../../../contexts/session-context'
import { TopBar } from '../../../components/top-bar'
import { Spinner } from '../../../components/spinner'
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
  const { sessionId } = useSession()
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
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-tertiary transition-colors active:scale-95"
    >
      <img src="/icons/calendar.svg" alt="" className="w-5 h-5" />
      <span className="subheading-md text-secondary">
        {getDateRangeDisplay(selectedDateRange)}
      </span>
    </button>
  )

  return (
    <div className="w-full h-full relative flex flex-col bg-primary">
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
        className="relative z-20 border-b border-tertiary"
      />

      {/* Content Area */}
      <div className="flex-1 bg-primary p-6 safe-bottom overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 max-w-3xl mx-auto w-full">
            <Spinner size="lg" variant="primary" className="mb-4" />
            <p className="paragraph-sm text-tertiary">Generating executive summary...</p>
          </div>
        )}

        {error && (
          <div className="bg-error-primary border border-error-subtle rounded-lg p-4 max-w-3xl mx-auto w-full">
            <p className="paragraph-sm text-error">{error}</p>
            <button
              onClick={fetchSummary}
              className="mt-3 px-4 py-2 bg-error-solid text-primary-onbrand rounded-lg subheading-md hover:bg-error-solid-hover"
            >
              Try Again
            </button>
          </div>
        )}

        {summary && !isLoading && !error && (
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            {/* Executive Summary Box */}
            <div className="bg-linear-to-r from-utility-info-100 to-utility-brand-100 border border-utility-info-300 rounded-lg p-6">
              <h2 className="label-bg text-primary mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-utility-info-600" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 16C6.68629 16 4 13.3137 4 10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16Z" />
                  <path d="M10 6C9.44772 6 9 6.44772 9 7V11C9 11.5523 9.44772 12 10 12C10.5523 12 11 11.5523 11 11V7C11 6.44772 10.5523 6 10 6Z" />
                  <path d="M10 13C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15C10.5523 15 11 14.5523 11 14C11 13.4477 10.5523 13 10 13Z" />
                </svg>
                Executive Summary
              </h2>
              <p className="paragraph-md text-secondary leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>

            {/* Info Box */}
            <div className="bg-secondary border border-secondary rounded-lg p-4">
              <p className="paragraph-sm text-tertiary">
                <span className="label-sm text-primary">Quick snapshot</span> covering your biggest growth opportunities, optimisation needs, and protection strategies. For detailed insights, visit the Grow, Optimise, or Protect pages.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SummaryInsights
