import { useNavigate } from 'react-router-dom'
import InsightPage from '../features/insights/views/insight-page'
import { useInsightRouteParams } from '../features/insights/hooks/use-insight-route-params'

const InsightsOptimizePage = () => {
  const navigate = useNavigate()
  const { platforms, dateRange } = useInsightRouteParams()

  return (
    <>
      <div className="w-full h-full">
        <InsightPage
          insightType="optimize"
          onBack={() => navigate(-1)}
          initialDateRange={dateRange}
          platforms={platforms}
        />
      </div>
    </>
  )
}

export default InsightsOptimizePage
