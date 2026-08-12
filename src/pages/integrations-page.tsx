import { useNavigate } from 'react-router-dom'
import IntegrationsView from '../features/integrations/integrations-page'

const IntegrationsPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <div className="w-full h-full">
        <IntegrationsView onBack={() => navigate('/home')} />
      </div>
    </>
  )
}

export default IntegrationsPage
