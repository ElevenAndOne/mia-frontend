import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from '../../../contexts/session-context'
import { TopBar } from '../../../components/top-bar'
import { MarkdownText } from '../../../components/markdown-text'
import { Spinner } from '../../../components/spinner'
import { shareViaWhatsApp } from '../../../utils/whatsapp-share'
import { getDateRangeDisplay } from '../../../utils/date-display'
import DateRangeSelector from '../../../components/date-range-selector'
import { INSIGHT_CONFIGS, type InsightType } from '../config/insight-definitions'
import { useStreamingInsightsParsed } from '../hooks/use-streaming-insights-parsed'
import type { ParsedInsight } from '../hooks/use-streaming-insights-parsed'
import { StorageKey } from '../../../constants/storage-keys'
import { trackEvent } from '../../../utils/tracking'

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

  // Track page visit
  const insightTracked = useRef(false)
  useEffect(() => {
    if (!insightTracked.current && sessionId) {
      insightTracked.current = true
      trackEvent(sessionId, 'page_visit', `insight_${insightType}`)
    }
  }, [sessionId, insightType])

  // Persist date range changes to localStorage
  const handleDateRangeChange = useCallback((range: string) => {
    setSelectedDateRange(range)
    localStorage.setItem(StorageKey.DATE_RANGE, range)
  }, [])
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

    const shareText = [
      insight.title && `*${insight.title}*`,
      insight.insight,
      insight.interpretation && `_${insight.interpretation}_`,
      insight.action && `Action: ${insight.action}`,
    ].filter(Boolean).join('\n\n')

    return (
      <div key={index}>
        <div className="bg-primary border border-secondary rounded-lg p-5 space-y-3">
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

        {/* Action buttons — outside the card, shown when card is complete */}
        {(!isCurrentCard || isComplete) && shareText && (
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  [insight.title, insight.insight, insight.interpretation, insight.action && `Action: ${insight.action}`]
                    .filter(Boolean).join('\n\n')
                )
              }}
              className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
              title="Copy"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button
              onClick={() => shareViaWhatsApp(shareText)}
              className="p-2 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
              title="Share via WhatsApp"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
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
        onApply={handleDateRangeChange}
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
