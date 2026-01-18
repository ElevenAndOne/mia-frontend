import { useState, useEffect } from 'react'
import { useSession } from '@/contexts/session-context-shim'
import DateRangeSelector from '@/components/ui/date-range-selector'
import { useStreamingInsightsParsed, ParsedInsight } from '../hooks/use-streaming-insights-parsed'
import { cn } from '@/utils/utils'

// Insight type configuration
type InsightType = 'grow' | 'optimize' | 'protect'

interface InsightConfig {
  title: string
  sectionTitle: string
  loadingMessage: string
  bgColor: string
  accentColor: string
  borderColor: string
  textColor: string
  spinnerColor: string
  backgroundImage: string
  gradient: string
}

const insightConfigs: Record<InsightType, InsightConfig> = {
  grow: {
    title: 'Grow',
    sectionTitle: 'Key Growth Opportunities',
    loadingMessage: 'Analyzing your growth opportunities...',
    bgColor: 'bg-cyan-50',
    accentColor: 'bg-cyan-500',
    borderColor: 'border-cyan-500',
    textColor: 'text-cyan-700',
    spinnerColor: 'border-t-purple-600',
    backgroundImage: '/images/Grow Nav.png',
    gradient: 'linear-gradient(135deg, #290068 0%, #4A148C 50%, #6A1B9A 100%)',
  },
  optimize: {
    title: 'Optimize',
    sectionTitle: 'Key Optimization Opportunities',
    loadingMessage: 'Analyzing optimization opportunities...',
    bgColor: 'bg-yellow-50',
    accentColor: 'bg-yellow-500',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-700',
    spinnerColor: 'border-t-yellow-600',
    backgroundImage: '/images/Optimize Nav.png',
    gradient: 'linear-gradient(135deg, #F57F17 0%, #FF8F00 50%, #FFA000 100%)',
  },
  protect: {
    title: 'Protect',
    sectionTitle: 'Key Risk Areas',
    loadingMessage: 'Analyzing potential risks...',
    bgColor: 'bg-green-50',
    accentColor: 'bg-green-500',
    borderColor: 'border-green-500',
    textColor: 'text-green-700',
    spinnerColor: 'border-t-green-600',
    backgroundImage: '/images/Protect Nav.png',
    gradient: 'linear-gradient(135deg, #2E7D32 0%, #388E3C 50%, #43A047 100%)',
  },
}

// Markdown text renderer with deep link support
const MarkdownText = ({
  text,
  googleAdsId,
  metaAdsId,
}: {
  text: string
  googleAdsId?: string
  metaAdsId?: string
}) => {
  const convertDeepLink = (linkUrl: string): string => {
    if (linkUrl.startsWith('DEEPLINK:')) {
      const campaignId = linkUrl.replace('DEEPLINK:', '').trim()
      if (/^\d{13,}$/.test(campaignId) && metaAdsId) {
        return `https://business.facebook.com/adsmanager/manage/campaigns?act=${metaAdsId}&selected_campaign_ids=${campaignId}`
      }
      return ''
    }
    return linkUrl
  }

  const cleanText = text
    .replace(/\[Title\]:/g, '')
    .replace(/\[Insight\]:/g, '')
    .replace(/\[Interpretation\]:/g, '')
    .replace(/\[Action\]:/g, '')
    .replace(/^- /gm, '• ')
    .replace(/\n- /g, '\n• ')
    .trim()

  const parts = cleanText.split(/(\[.*?\]\((?:https?:\/\/.*?|DEEPLINK:.*?)\)|https?:\/\/[^\s]+)/)

  return (
    <>
      {parts.map((part, index) => {
        const linkMatch = part.match(/\[(.*?)\]\(((?:https?:\/\/|DEEPLINK:).*?)\)/)
        if (linkMatch) {
          const [, linkText, linkUrl] = linkMatch
          const actualUrl = convertDeepLink(linkUrl)
          if (!actualUrl) return <span key={index}>{linkText}</span>
          return (
            <a
              key={index}
              href={actualUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              {linkText}
            </a>
          )
        }
        if (part.match(/^https?:\/\//)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              {part}
            </a>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

interface InsightsStreamingProps {
  type: InsightType
  onBack?: () => void
  initialDateRange?: string
  platforms?: string[]
}

export const InsightsStreaming = ({
  type,
  onBack,
  initialDateRange = '30_days',
  platforms,
}: InsightsStreamingProps) => {
  const config = insightConfigs[type]
  const { sessionId, selectedAccount } = useSession()
  const [selectedDateRange, setSelectedDateRange] = useState(initialDateRange)
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false)

  const {
    insights,
    currentInsightIndex,
    currentSection,
    isStreaming,
    isComplete,
    error,
    startStreaming,
    stopStreaming,
    reset,
  } = useStreamingInsightsParsed()

  const getDateRangeDisplay = (range: string): string => {
    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, '0')
      const month = date.toLocaleDateString('en-GB', { month: 'short' })
      return `${day} ${month}`
    }

    if (range.match(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/)) {
      const [startStr, endStr] = range.split('_')
      return `${formatDate(new Date(startStr))} - ${formatDate(new Date(endStr))}`
    }

    const daysMap: Record<string, number> = { '7_days': 7, '14_days': 14, '30_days': 30, '90_days': 90 }
    const days = daysMap[range] || 30
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - (days - 1))
    return `${formatDate(startDate)} - ${formatDate(today)}`
  }

  useEffect(() => {
    if (sessionId) {
      reset()
      startStreaming(type, sessionId, selectedDateRange, platforms)
    }
    return () => stopStreaming()
  }, [selectedDateRange, sessionId, type])

  const handleRetry = () => {
    if (sessionId) {
      reset()
      startStreaming(type, sessionId, selectedDateRange, platforms)
    }
  }

  const renderInsightCard = (insight: ParsedInsight, index: number, isCurrentCard: boolean) => {
    if (!insight.title && !insight.insight && !insight.interpretation && !insight.action) return null

    return (
      <div key={index} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn('shrink-0 w-7 h-7 text-white rounded-full flex items-center justify-center text-sm font-bold', config.accentColor)}>
            {index + 1}
          </div>
          <h3 className="flex-1 text-base font-semibold text-gray-900 leading-snug">{insight.title}</h3>
        </div>

        {(insight.insight || (isCurrentCard && currentSection === 'insight')) && (
          <div className="pl-10">
            <p className="text-sm text-gray-800 leading-relaxed font-medium">
              <MarkdownText text={insight.insight} googleAdsId={selectedAccount?.google_ads_id} metaAdsId={selectedAccount?.meta_ads_id} />
            </p>
          </div>
        )}

        {(insight.interpretation || (isCurrentCard && currentSection === 'interpretation')) && (
          <div className="pl-10">
            <p className="text-sm text-gray-700 leading-relaxed italic">
              <MarkdownText text={insight.interpretation} googleAdsId={selectedAccount?.google_ads_id} metaAdsId={selectedAccount?.meta_ads_id} />
            </p>
          </div>
        )}

        {(insight.action || (isCurrentCard && currentSection === 'action')) && (
          <div className={cn('pl-10 p-3 rounded-sm border-l-4', config.bgColor, config.borderColor)}>
            <p className="text-sm text-gray-900 leading-relaxed font-medium" style={{ whiteSpace: 'pre-line' }}>
              <span className={cn('font-bold', config.textColor)}>Action:</span>{' '}
              <MarkdownText text={insight.action} googleAdsId={selectedAccount?.google_ads_id} metaAdsId={selectedAccount?.meta_ads_id} />
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full relative flex flex-col" style={{ backgroundColor: '#290068' }}>
      <DateRangeSelector
        isOpen={isDateSelectorOpen}
        onClose={() => setIsDateSelectorOpen(false)}
        selectedRange={selectedDateRange}
        onApply={setSelectedDateRange}
      />

      {/* Header */}
      <div className="flex items-center px-4 py-3 relative z-20 shrink-0 bg-white">
        <div className="flex-1" />
        <h1 className="text-xl font-normal text-black text-center" style={{ fontFamily: 'Geologica, sans-serif', fontSize: '20px', fontWeight: 400 }}>
          {config.title}
        </h1>
        <div className="flex-1 flex justify-end pr-2">
          <button onClick={() => setIsDateSelectorOpen(!isDateSelectorOpen)} className="w-6 h-6 flex items-center justify-center hover:opacity-70 active:scale-90">
            <img src="/icons/calendar.svg" alt="Calendar" className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Gradient Header */}
      <div className="relative flex items-center justify-between px-4 py-4 overflow-hidden" style={{ minHeight: '100px' }}>
        <div
          className="absolute inset-0"
          style={{
            background: config.gradient,
            backgroundImage: `url("${config.backgroundImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
        <button
          onClick={onBack}
          className="flex items-center justify-center active:scale-90 transition-all"
          style={{ color: '#FFF', padding: '12px', marginLeft: '-8px', minWidth: '44px', minHeight: '44px', position: 'relative', transform: 'translateY(-5px) translateX(15px)', zIndex: 20 }}
        >
          <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
            <path d="M7.18572 13L0.822088 6.63636L7.18572 0.272727L8.27947 1.35227L3.77663 5.85511H15.4386V7.41761H3.77663L8.27947 11.9062L7.18572 13Z" fill="white" />
          </svg>
        </button>
        <div className="flex flex-col items-end" style={{ zIndex: 10, position: 'relative', transform: 'translateY(-5px) translateX(-20px)' }}>
          <span className="text-white font-medium text-lg">{getDateRangeDisplay(selectedDateRange)}</span>
          {selectedAccount && <span className="text-white/80 text-sm font-normal mt-0.5">{selectedAccount.name}</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white p-6 pb-32 overflow-y-auto rounded-t-2xl -mt-4">
        {isStreaming && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className={cn('w-12 h-12 border-4 border-gray-200 rounded-full animate-spin mb-4', config.spinnerColor)} />
            <p className="text-gray-600 text-sm">{config.loadingMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={handleRetry} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
              Try Again
            </button>
          </div>
        )}

        {insights.length > 0 && !error && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{config.sectionTitle}</h2>
              <div className="space-y-4">
                {insights.map((insight, index) => renderInsightCard(insight, index, index === currentInsightIndex))}
              </div>
            </div>

            {isComplete && (
              <div className={cn('flex items-center justify-center gap-2 py-4', config.textColor.replace('text-', 'text-'))}>
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

// Named exports for backwards compatibility
export const GrowInsightsStreaming = (props: Omit<InsightsStreamingProps, 'type'>) => <InsightsStreaming type="grow" {...props} />
export const OptimizeInsightsStreaming = (props: Omit<InsightsStreamingProps, 'type'>) => <InsightsStreaming type="optimize" {...props} />
export const ProtectInsightsStreaming = (props: Omit<InsightsStreamingProps, 'type'>) => <InsightsStreaming type="protect" {...props} />

export default InsightsStreaming
