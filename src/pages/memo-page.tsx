import { useNavigate } from 'react-router-dom'
import { MemoView } from '../features/memo/views/memo-view'

const MemoPage = () => {
  const navigate = useNavigate()
  return (
    <div className="w-full h-full">
      <MemoView onBack={() => navigate('/home')} />
    </div>
  )
}

export default MemoPage
