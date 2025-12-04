import { useState, useEffect } from 'react'
import { useSession } from '../contexts/SessionContext'
import DateRangeSelector from './DateRangeSelector'
import { useStreamingInsightsParsed, ParsedInsight } from '../hooks/useStreamingInsightsParsed'

// Helper component to render text with markdown links and campaign deep links
const MarkdownText = ({ text, className = '', googleAdsId, metaAdsId }: { text: string; className?: string; googleAdsId?: string; metaAdsId?: string }) => {
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

  // Convert "- " at start of lines to bullet points
  const convertBullets = (str: string): string => {
    return str.replace(/^- /gm, '• ').replace(/\n- /g, '\n• ')
  }

  // Strip out any marker tags that might briefly appear
  const stripMarkers = (str: string): string => {
    return str
      .replace(/\[Title\]:/g, '')
      .replace(/\[Insight\]:/g, '')
      .replace(/\[Interpretation\]:/g, '')
      .replace(/\[Action\]:/g, '')
      .trim()
  }

  const renderWithLinks = (text: string) => {
    const cleanText = stripMarkers(text)
    const bulletText = convertBullets(cleanText)
    const parts = bulletText.split(/(\[.*?\]\((?:https?:\/\/.*?|DEEPLINK:.*?)\)|https?:\/\/[^\s]+)/)
    return parts.map((part, index) => {
      const linkMatch = part.match(/\[(.*?)\]\(((?:https?:\/\/|DEEPLINK:).*?)\)/)
      if (linkMatch) {
        const [, linkText, linkUrl] = linkMatch
        const actualUrl = convertDeepLink(linkUrl)
        if (!actualUrl) {
          return <span key={index}>{linkText}</span>
        }
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
    })
  }

  return <span className={className}>{renderWithLinks(text)}</span>
}

interface GrowInsightsStreamingProps {
  onBack?: () => void
  initialDateRange?: string
  platforms?: string[]
}

const GrowInsightsStreaming = ({ onBack, initialDateRange = '30_days', platforms }: GrowInsightsStreamingProps) => {
  const { sessionId, selectedAccount } = useSession()
  const [selectedDateRange, setSelectedDateRange] = useState<string>(initialDateRange)
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false)

  const {
    insights,
    currentInsightIndex,
    currentSection,
    isStreaming,
    isComplete,
    error,
    startStreaming,
    reset
  } = useStreamingInsightsParsed()

  // Helper function to calculate and format date range
  const getDateRangeDisplay = (range: string): string => {
    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, '0')
      const month = date.toLocaleDateString('en-GB', { month: 'short' })
      return `${day} ${month}`
    }

    if (range.includes('_') && range.match(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/)) {
      const [startStr, endStr] = range.split('_')
      const startDate = new Date(startStr)
      const endDate = new Date(endStr)
      return `${formatDate(startDate)} - ${formatDate(endDate)}`
    }

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

  // Start streaming on mount and when date range changes
  useEffect(() => {
    if (sessionId) {
      reset()
      startStreaming('grow', sessionId, selectedDateRange, platforms)
    }

    return () => {
      // Cleanup handled by hook
    }
  }, [selectedDateRange, sessionId])

  const handleRetry = () => {
    if (sessionId) {
      reset()
      startStreaming('grow', sessionId, selectedDateRange, platforms)
    }
  }

  // Render a single insight card
  const renderInsightCard = (insight: ParsedInsight, index: number, isCurrentCard: boolean) => {
    const hasContent = insight.title || insight.insight || insight.interpretation || insight.action

    if (!hasContent) return null

    return (
      <div key={index} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        {/* Number + Title */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-7 h-7 bg-cyan-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
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
                googleAdsId={selectedAccount?.google_ads_id}
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
                googleAdsId={selectedAccount?.google_ads_id}
                metaAdsId={selectedAccount?.meta_ads_id}
              />
            </p>
          </div>
        )}

        {/* Action */}
        {(insight.action || (isCurrentCard && currentSection === 'action')) && (
          <div className="pl-10 bg-cyan-50 border-l-4 border-cyan-500 p-3 rounded">
            <p className="text-sm text-gray-900 leading-relaxed font-medium" style={{ whiteSpace: 'pre-line' }}>
              <span className="font-bold text-cyan-700">Action:</span>{' '}
              <MarkdownText
                text={insight.action}
                googleAdsId={selectedAccount?.google_ads_id}
                metaAdsId={selectedAccount?.meta_ads_id}
              />
            </p>
          </div>
        )}
      </div>
    )
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
          Grow
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
            backgroundImage: 'url("/images/Grow Nav.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
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
      <div className="flex-1 bg-white p-6 pb-32 overflow-y-auto rounded-t-2xl -mt-4">
        {/* Loading state - only show if no insights yet */}
        {isStreaming && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-sm">Analyzing your growth opportunities...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Growth Opportunities</h2>
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

export default GrowInsightsStreaming
