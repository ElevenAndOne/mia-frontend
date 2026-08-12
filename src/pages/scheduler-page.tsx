import { useNavigate } from 'react-router-dom'
import SchedulerView from '../features/scheduler/scheduler-view'

const SchedulerPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <div className="w-full h-full">
        <SchedulerView onBack={() => navigate('/home')} />
      </div>
    </>
  )
}

export default SchedulerPage
