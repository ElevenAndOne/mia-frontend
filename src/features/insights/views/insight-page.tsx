import { useState, useEffect, useRef } from 'react'
import { useSession } from '../../../contexts/session-context'
import { TopBar } from '../../../components/top-bar'
import { MarkdownText } from '../../../components/markdown-text'
import { Spinner } from '../../../components/spinner'
import { getDateRangeDisplay } from '../../../utils/date-display'
import DateRangeSelector from '../../../components/date-range-selector'
import { INSIGHT_CONFIGS, type InsightType } from '../config/insight-definitions'
import { useStreamingInsightsParsed } from '../hooks/use-streaming-insights-parsed'
import type { ParsedInsight } from '../hooks/use-streaming-insights-parsed'

interface InsightPageProps {
  insightType: InsightType
  onBack?: () => void
  initialDateRange?: string
  platforms?: string[]
}

function InsightPage({ insightType, onBack, initialDateRange = '30_days', platforms }: InsightPageProps) {
  const config = INSIGHT_CONFIGS[insightType]
  const { sessionId, selectedAccount } = useSession()
  const [selectedDateRange, setSelectedDateRange] = useState<string>(initialDateRange)
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false)
  const datePickerButtonRef = useRef<HTMLButtonElement>(null)
  const {
    insights,
    currentInsightIndex,
    currentSection,
    isStreaming,
    isComplete,
    error,
    startStreaming,
    stopStreaming,
    reset
  } = useStreamingInsightsParsed()
  // Start streaming on mount and when date range changes
  useEffect(() => {
    if (sessionId) {
      reset()
      startStreaming(insightType, sessionId, selectedDateRange, platforms)
    }

    return () => {
      stopStreaming()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateRange, sessionId, stopStreaming, insightType])

  const handleRetry = () => {
    if (sessionId) {
      reset()
      startStreaming(insightType, sessionId, selectedDateRange, platforms)
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

  // Render a single insight card
  const renderInsightCard = (insight: ParsedInsight, index: number, isCurrentCard: boolean) => {
    const hasContent = insight.title || insight.insight || insight.interpretation || insight.action

    if (!hasContent) return null

    return (
      <div key={index} className="bg-primary border border-secondary rounded-lg p-5 space-y-3">
        {/* Number + Title */}
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-7 h-7 ${config.colors.badge} text-primary-onbrand rounded-full flex items-center justify-center label-sm`}>
            {index + 1}
          </div>
          <h3 className="flex-1 label-md text-primary leading-snug">
            {insight.title}
          </h3>
        </div>

        {/* Insight (Data) */}
        {(insight.insight || (isCurrentCard && currentSection === 'insight')) && (
          <div className="pl-10">
            <p className="paragraph-sm text-primary leading-relaxed">
              <MarkdownText
                text={insight.insight}
                metaAdsId={selectedAccount?.meta_ads_id}
              />
            </p>
          </div>
        )}

        {/* Interpretation */}
        {(insight.interpretation || (isCurrentCard && currentSection === 'interpretation')) && (
          <div className="pl-10">
            <p className="paragraph-sm text-secondary leading-relaxed italic">
              <MarkdownText
                text={insight.interpretation}
                metaAdsId={selectedAccount?.meta_ads_id}
              />
            </p>
          </div>
        )}

        {/* Action */}
        {(insight.action || (isCurrentCard && currentSection === 'action')) && (
          <div className={`pl-10 ${config.colors.actionBg} border-l-4 ${config.colors.actionBorder} p-3 rounded`}>
            <p className="paragraph-sm text-primary leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
              <span className={`label-sm ${config.colors.actionLabel}`}>Action:</span>{' '}
              <MarkdownText
                text={insight.action}
                metaAdsId={selectedAccount?.meta_ads_id}
              />
            </p>
          </div>
        )}
      </div>
    )
  }

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
        title={config.title}
        onBack={onBack}
        rightSlot={datePickerButton}
        className="relative z-20 border-b border-tertiary"
      />

      {/* Content Area */}
      <div className="flex-1 bg-primary p-6 safe-bottom overflow-y-auto">
        {/* Loading state - only show if no insights yet */}
        {isStreaming && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 max-w-3xl mx-auto w-full">
            <Spinner size="lg" variant="primary" className="mb-4" />
            <p className="paragraph-sm text-tertiary">{config.loadingMessage}</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-error-primary border border-error-subtle rounded-lg p-4 max-w-3xl mx-auto w-full">
            <p className="paragraph-sm text-error">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-3 px-4 py-2 bg-error-solid text-primary-onbrand rounded-lg subheading-md hover:bg-error-solid-hover"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Insights - show as they stream in */}
        {insights.length > 0 && !error && (
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            <div>
              <h2 className="label-bg text-primary mb-4">{config.sectionTitle}</h2>
              <div className="space-y-4">
                {insights.map((insight, index) =>
                  renderInsightCard(insight, index, index === currentInsightIndex)
                )}
              </div>
            </div>

            {/* Completion indicator */}
            {isComplete && (
              <div className="flex items-center justify-center gap-2 text-success py-4">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="subheading-md">Analysis complete</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default InsightPage
