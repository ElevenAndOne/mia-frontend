/**
 * StreamingInsightsDemo - Example component showing SSE streaming usage
 *
 * This demonstrates how to use the useStreamingInsights hook.
 * You can integrate this pattern into your existing Grow/Optimize/Protect pages.
 *
 * Usage:
 * 1. Replace the fetch call with the streaming hook
 * 2. Display streaming text while isStreaming is true
 * 3. Parse the complete response when isComplete is true
 */
import { useEffect } from 'react'
import { useSession } from '../contexts/SessionContext'
import { useStreamingInsights } from '../hooks/useStreamingInsights'

interface StreamingInsightsDemoProps {
  insightType: 'grow' | 'optimize' | 'protect'
  dateRange?: string
  platforms?: string[]
  onBack?: () => void
}

const StreamingInsightsDemo = ({
  insightType,
  dateRange = '30_days',
  platforms,
  onBack
}: StreamingInsightsDemoProps) => {
  const { sessionId, selectedAccount } = useSession()
  const {
    text,
    isStreaming,
    isComplete,
    error,
    startStreaming,
    stopStreaming,
    reset
  } = useStreamingInsights()

  // Start streaming when component mounts
  useEffect(() => {
    if (sessionId) {
      startStreaming(insightType, sessionId, dateRange, platforms)
    }

    // Cleanup on unmount
    return () => {
      stopStreaming()
    }
  }, [sessionId, insightType, dateRange, platforms])

  // Handle retry
  const handleRetry = () => {
    reset()
    if (sessionId) {
      startStreaming(insightType, sessionId, dateRange, platforms)
    }
  }

  const getTitle = () => {
    switch (insightType) {
      case 'grow': return 'Growth Opportunities'
      case 'optimize': return 'Optimization Insights'
      case 'protect': return 'Risk Protection'
      default: return 'Insights'
    }
  }

  const getGradientColor = () => {
    switch (insightType) {
      case 'grow': return 'from-purple-600 to-purple-800'
      case 'optimize': return 'from-blue-600 to-blue-800'
      case 'protect': return 'from-green-600 to-green-800'
      default: return 'from-gray-600 to-gray-800'
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getGradientColor()} p-4 flex items-center justify-between`}>
        {onBack && (
          <button
            onClick={onBack}
            className="text-white hover:opacity-80 transition-opacity"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <h1 className="text-white text-xl font-semibold">{getTitle()}</h1>
        {/* Refresh button for testing */}
        <button
          onClick={handleRetry}
          className="text-white hover:opacity-80 transition-opacity"
          title="Refresh"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L4 7m16 10l-1.64 1.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Account Info */}
      {selectedAccount && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Analyzing: <span className="font-medium text-gray-900">{selectedAccount.name}</span>
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm mb-3">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Streaming Indicator */}
        {isStreaming && !text && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600 text-sm">Preparing insights...</span>
          </div>
        )}

        {/* Streaming Text Display */}
        {text && (
          <div className="prose prose-sm max-w-none">
            {/* Render text with basic formatting */}
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {text}
            </div>
          </div>
        )}

        {/* Completion State */}
        {isComplete && !error && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Analysis complete</span>
            </div>
          </div>
        )}
      </div>

      {/* Stop Button (during streaming) */}
      {isStreaming && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={stopStreaming}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Stop Streaming
          </button>
        </div>
      )}
    </div>
  )
}

export default StreamingInsightsDemo
