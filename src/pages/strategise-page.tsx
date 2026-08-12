import { useNavigate } from 'react-router-dom'
import StrategiseView from '../features/strategise/strategise-view'

const StrategisePage = () => {
  const navigate = useNavigate()

  return (
    <>
      <div className="w-full h-full">
        <StrategiseView onBack={() => navigate('/home')} />
      </div>
    </>
  )
}

export default StrategisePage
