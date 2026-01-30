import { useState, useEffect, useRef } from 'react'
import { useSession } from '../../../contexts/session-context'
import { TopBar } from '../../../components/top-bar'
import { MarkdownText } from '../../../components/markdown-text'
import { getDateRangeDisplay } from '../../../utils/date-display'
import DateRangeSelector from '../../../components/date-range-selector'
import { useStreamingInsightsParsed } from '../hooks/use-streaming-insights-parsed'
import type { ParsedInsight } from '../hooks/use-streaming-insights-parsed'

export type InsightType = 'grow' | 'optimize' | 'protect'

interface InsightConfig {
  title: string
  sectionTitle: string
  loadingMessage: string
  backgroundImage: string
  gradient: string
  colors: {
    badge: string
    actionBg: string
    actionBorder: string
    actionLabel: string
    spinner: string
  }
}

const INSIGHT_CONFIGS: Record<InsightType, InsightConfig> = {
  grow: {
    title: 'Grow',
    sectionTitle: 'Key Growth Opportunities',
    loadingMessage: 'Analyzing your growth opportunities...',
    backgroundImage: '/images/Grow Nav.png',
    gradient: 'linear-gradient(135deg, #290068 0%, #4A148C 50%, #6A1B9A 100%)',
    colors: {
      badge: 'bg-cyan-500',
      actionBg: 'bg-cyan-50',
      actionBorder: 'border-cyan-500',
      actionLabel: 'text-cyan-700',
      spinner: 'border-t-purple-600'
    }
  },
  optimize: {
    title: 'Optimise',
    sectionTitle: 'Key Optimization Opportunities',
    loadingMessage: 'Analyzing optimization opportunities...',
    backgroundImage: '/images/Optimise Nav.png',
    gradient: 'linear-gradient(135deg, #1565C0 0%, #1976D2 50%, #2196F3 100%)',
    colors: {
      badge: 'bg-blue-500',
      actionBg: 'bg-blue-50',
      actionBorder: 'border-blue-500',
      actionLabel: 'text-blue-700',
      spinner: 'border-t-blue-600'
    }
  },
  protect: {
    title: 'Protect',
    sectionTitle: 'Key Risk Areas',
    loadingMessage: 'Analyzing potential risks...',
    backgroundImage: '/images/Protect Nav.png',
    gradient: 'linear-gradient(135deg, #2E7D32 0%, #388E3C 50%, #43A047 100%)',
    colors: {
      badge: 'bg-green-500',
      actionBg: 'bg-green-50',
      actionBorder: 'border-green-500',
      actionLabel: 'text-green-700',
      spinner: 'border-t-green-600'
    }
  }
}

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
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
    >
      <img src="/icons/calendar.svg" alt="" className="w-5 h-5" />
      <span className="text-sm font-medium text-gray-700">
        {getDateRangeDisplay(selectedDateRange)}
      </span>
    </button>
  )

  // Render a single insight card
  const renderInsightCard = (insight: ParsedInsight, index: number, isCurrentCard: boolean) => {
    const hasContent = insight.title || insight.insight || insight.interpretation || insight.action

    if (!hasContent) return null

    return (
      <div key={index} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        {/* Number + Title */}
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-7 h-7 ${config.colors.badge} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
            {index + 1}
          </div>
          <h3 className="flex-1 text-base font-semibold text-gray-900 leading-snug">
            {insight.title}
          </h3>
        </div>

        {/* Insight (Data) */}
        {(insight.insight || (isCurrentCard && currentSection === 'insight')) && (
          <div className="pl-10">
            <p className="text-sm text-gray-800 leading-relaxed font-medium">
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
            <p className="text-sm text-gray-700 leading-relaxed italic">
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
            <p className="text-sm text-gray-900 leading-relaxed font-medium" style={{ whiteSpace: 'pre-line' }}>
              <span className={`font-bold ${config.colors.actionLabel}`}>Action:</span>{' '}
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
        title={config.title}
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
            background: config.gradient,
            backgroundImage: `url("${config.backgroundImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {selectedAccount && (
          <span
            className="text-white/80 text-sm font-normal relative z-10"
          >
            {selectedAccount.name}
          </span>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white p-6 pb-6 safe-bottom overflow-y-auto rounded-t-2xl -mt-4 relative z-10">
        {/* Loading state - only show if no insights yet */}
        {isStreaming && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 max-w-3xl mx-auto w-full">
            <div className={`w-12 h-12 border-4 border-gray-200 ${config.colors.spinner} rounded-full animate-spin mb-4`}></div>
            <p className="text-gray-600 text-sm">{config.loadingMessage}</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-3xl mx-auto w-full">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Insights - show as they stream in */}
        {insights.length > 0 && !error && (
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{config.sectionTitle}</h2>
              <div className="space-y-4">
                {insights.map((insight, index) =>
                  renderInsightCard(insight, index, index === currentInsightIndex)
                )}
              </div>
            </div>

            {/* Completion indicator */}
            {isComplete && (
              <div className="flex items-center justify-center gap-2 text-green-600 py-4">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Analysis complete</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default InsightPage
