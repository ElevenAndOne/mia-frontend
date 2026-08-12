import { useNavigate } from 'react-router-dom'
import SummaryInsights from '../features/insights/views/summary-insights'

const InsightsSummaryPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <div className="w-full h-full">
        <SummaryInsights onBack={() => navigate(-1)} />
      </div>
    </>
  )
}

export default InsightsSummaryPage
