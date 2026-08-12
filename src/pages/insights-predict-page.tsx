import { useNavigate } from 'react-router-dom'
import PredictInsights from '../features/insights/views/predict-insights'

const InsightsPredictPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <div className="w-full h-full">
        <PredictInsights onBack={() => navigate(-1)} />
      </div>
    </>
  )
}

export default InsightsPredictPage
