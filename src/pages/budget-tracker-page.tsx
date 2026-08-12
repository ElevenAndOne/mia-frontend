import { useNavigate } from 'react-router-dom'
import { BudgetTrackerView } from '../features/budget-tracker/views/budget-tracker-view'

const BudgetTrackerPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <div className="w-full h-full">
        <BudgetTrackerView onBack={() => navigate('/home')} />
      </div>
    </>
  )
}

export default BudgetTrackerPage
