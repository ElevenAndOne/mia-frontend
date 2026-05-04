import { useEffect } from 'react'
import { useSession } from '../../../contexts/session-context'
import { TopBar } from '../../../components/top-bar'
import { Spinner } from '../../../components/spinner'
import { useGoldInsights } from '../hooks/use-gold-insights'
import { StorageKey } from '../../../constants/storage-keys'
import { trackEvent } from '../../../utils/tracking'

interface PredictInsightsProps {
  onBack?: () => void
}

const formatDaysAgo = (isoString: string): string => {
  const then = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

const PredictInsights = ({ onBack }: PredictInsightsProps) => {
  const { sessionId } = useSession()
  const { data, isLoading, error, refresh, triggerRefresh, isRefreshing } =
    useGoldInsights(sessionId)

  // Track page visit + mark report as "seen" so homepage stops pulsing gold
  useEffect(() => {
    if (sessionId) {
      trackEvent(sessionId, 'page_visit', 'strategise')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (data?.status === 'completed' && data.created_at) {
      localStorage.setItem(`${StorageKey.STRATEGISE_SEEN_PREFIX}${data.created_at}`, 'true')
      if (sessionId) {
        trackEvent(sessionId, 'strategise_view', 'strategise', { status: data.status })
      }
    }
  }, [data?.status, data?.created_at, sessionId])

  return (
    <div className="w-full h-full relative flex flex-col bg-primary">
      <TopBar title="Strategise" onBack={onBack} className="relative z-20 border-b border-tertiary" />

      <div className="flex-1 bg-primary p-6 safe-bottom overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 max-w-3xl mx-auto w-full">
            <Spinner size="lg" variant="primary" className="mb-4" />
            <p className="paragraph-sm text-tertiary">Loading your ML analysis...</p>
          </div>
        )}

        {error && (
          <div className="bg-error-primary border border-error-subtle rounded-lg p-4 max-w-3xl mx-auto w-full">
            <p className="paragraph-sm text-error">{error}</p>
            <button
              onClick={refresh}
              className="mt-3 px-4 py-2 bg-error-solid text-primary-onbrand rounded-lg subheading-md hover:bg-error-solid-hover"
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            {data.status === 'triggered' && (
              <div className="bg-secondary border border-utility-warning-300 rounded-lg p-6 flex items-center gap-4">
                <Spinner size="md" variant="primary" />
                <div>
                  <p className="paragraph-md text-secondary">
                    Analysis started — we're crunching your data now.
                  </p>
                  <p className="paragraph-xs text-tertiary mt-1">
                    This usually takes a few minutes. We'll email you when it's ready.
                  </p>
                </div>
              </div>
            )}

            {data.status === 'no_data' && (
              <div className="bg-secondary border border-secondary rounded-lg p-6">
                <p className="paragraph-md text-secondary">
                  Your deep analysis is being prepared. Check back soon.
                </p>
              </div>
            )}

            {data.status === 'running' && (
              <div className="bg-secondary border border-secondary rounded-lg p-6 flex items-center gap-4">
                <Spinner size="md" variant="primary" />
                <p className="paragraph-md text-secondary">Analysis in progress...</p>
              </div>
            )}

            {data.status === 'completed' && (
              <div className="bg-linear-to-r from-utility-warning-100 to-utility-brand-100 border border-utility-warning-300 rounded-lg p-6">
                <h2 className="label-bg text-primary mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-utility-warning-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M10 2L12.39 7.26L18 8.27L14 12.14L14.76 18L10 15.27L5.24 18L6 12.14L2 8.27L7.61 7.26L10 2Z" />
                  </svg>
                  ML Prediction Report
                </h2>
                <p className="paragraph-md text-secondary leading-relaxed whitespace-pre-wrap">
                  {data.summary}
                </p>
                <div className="flex items-center justify-between mt-4">
                  {data.created_at && (
                    <p className="paragraph-xs text-tertiary">
                      Last analysed: {formatDaysAgo(data.created_at)}
                    </p>
                  )}
                  <button
                    onClick={triggerRefresh}
                    disabled={isRefreshing}
                    className="paragraph-xs text-tertiary underline hover:text-secondary disabled:opacity-50"
                  >
                    {isRefreshing ? 'Requesting...' : 'Re-analyse'}
                  </button>
                </div>
              </div>
            )}

            {data.status === 'failed' && (
              <div className="bg-warning-primary border border-warning-subtle rounded-lg p-6">
                <p className="paragraph-md text-warning">
                  Analysis failed. Will retry automatically.
                </p>
                {data.failure_reason && (
                  <p className="paragraph-xs text-tertiary mt-2">{data.failure_reason}</p>
                )}
                <button
                  onClick={triggerRefresh}
                  disabled={isRefreshing}
                  className="mt-3 paragraph-xs text-tertiary underline hover:text-secondary disabled:opacity-50"
                >
                  {isRefreshing ? 'Requesting...' : 'Retry now'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PredictInsights
