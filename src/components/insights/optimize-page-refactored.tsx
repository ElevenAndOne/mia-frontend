import { useEffect } from 'react'
import { useAnalytics } from '../../contexts/analytics-context'
import { useDateRange } from '../../contexts/date-range-context'
import { useUIState } from '../../contexts/ui-state-context'
import { PageLayout } from '../layouts/page-layout'
import { InsightCard, InsightList } from '../layouts/insight-card'
import { Card, CardContent } from '../layouts/card'

interface OptimizePageProps {
  onBack?: () => void
  question?: string
}

export const OptimizePageRefactored = ({ onBack, question = "What can we improve?" }: OptimizePageProps) => {
  const { fetchAnalytics, isLoading, getError, getData } = useAnalytics()
  const { dateRange, getDateRangeLabel } = useDateRange()
  const { setLoading } = useUIState()

  const loading = isLoading('optimize')
  const error = getError('optimize')
  const optimizeData = getData('optimize')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true, 'Loading optimization insights...')
      await fetchAnalytics('optimize', question, dateRange.selectedRange)
      setLoading(false)
    }

    loadData()
  }, [dateRange.selectedRange, fetchAnalytics, question, setLoading])

  const displayData = optimizeData || {
    header: {
      percentage: 0,
      description: loading ? "Analyzing optimization\nopportunities..." : "Unable to load\noptimization data",
      icon: loading ? "loading" : "error"
    },
    insights: loading ? [
      "Analyzing conversion data...",
      "Identifying improvement areas...",
      "Calculating impact estimates..."
    ] : [
      "Optimization data unavailable",
      "Please check your connection and try again"
    ],
    roas: {
      percentage: 0,
      trend: "neutral",
      label: loading ? "Loading..." : "Error"
    },
    boxes: [
      {
        value: loading ? "..." : "N/A",
        label: loading ? "Loading metrics..." : "Data unavailable",
        trend: "neutral"
      }
    ],
    prediction: {
      amount: loading ? "Loading..." : "N/A",
      confidence: "0%",
      description: loading ? "Generating recommendations..." : "Unable to generate recommendations"
    }
  }

  return (
    <PageLayout
      showBackButton={!!onBack}
      onBack={onBack}
      className="bg-white"
      headerContent={
        <div className="flex-1 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Optimize Insights</h1>
          <p className="text-xs text-gray-500 mt-1">{getDateRangeLabel()}</p>
        </div>
      }
    >
      <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header Card - Orange gradient for Optimize */}
        <Card
          className="relative overflow-hidden"
          padding="lg"
          shadow="lg"
          rounded="2xl"
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.60) 0%, rgba(255, 255, 255, 0.00) 67.79%), #FFA726',
              backgroundBlendMode: 'screen, normal',
            }}
          />
          <CardContent className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              {loading && (
                <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                </div>
              )}
              {!loading && displayData.header.icon !== 'error' && (
                <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center">
                  <span className="text-2xl">{displayData.header.icon}</span>
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900">
                  {displayData.header.percentage > 0 ? `+${displayData.header.percentage}%` : '—'}
                </h2>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">
                  {displayData.header.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROAS Card */}
        {displayData.roas && (
          <Card padding="md" shadow="md" rounded="xl">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{displayData.roas.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayData.roas.percentage}x
                  </p>
                </div>
                <div className={`text-sm font-medium ${
                  displayData.roas.trend === 'up' ? 'text-green-600' :
                  displayData.roas.trend === 'down' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {displayData.roas.trend === 'up' ? '↑' : displayData.roas.trend === 'down' ? '↓' : '—'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {displayData.boxes.map((box, index) => (
            <InsightCard
              key={index}
              value={box.value}
              label={box.label}
              trend={box.trend}
              unit={box.unit}
            />
          ))}
        </div>

        {/* Insights List */}
        {displayData.insights && displayData.insights.length > 0 && (
          <InsightList insights={displayData.insights} />
        )}

        {/* Prediction Card */}
        {displayData.prediction && (
          <Card
            className="bg-linear-to-br from-orange-50 to-amber-50"
            padding="lg"
            shadow="md"
            rounded="xl"
          >
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Optimization Potential</h4>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {displayData.prediction.amount}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    Confidence: {displayData.prediction.confidence}
                  </p>
                  <p className="text-sm text-gray-700">
                    {displayData.prediction.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="bg-red-50 border border-red-200" padding="md" rounded="xl">
            <CardContent>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Error loading data</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}

export default OptimizePageRefactored
