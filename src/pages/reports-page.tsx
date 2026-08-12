import { useNavigate } from 'react-router-dom'
import { ReportView } from '../features/reports/report-view'

const ReportsPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <div className="w-full h-full">
        <ReportView onBack={() => navigate('/home')} />
      </div>
    </>
  )
}

export default ReportsPage
