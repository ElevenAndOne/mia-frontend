import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/top-bar'
import { BuilderChat } from '../features/campaigns/components/empty-state/builder-chat'

// /campaigns/new — build a campaign from scratch (chat or brief upload). Also the
// destination when the workspace has no campaigns yet.
const NewCampaignPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <div className="campaign-workspace w-full h-dvh flex flex-col overflow-hidden">
        <TopBar title="Campaigns" onBack={() => navigate('/home')} />
        <div className="flex-1 min-h-0">
          <BuilderChat />
        </div>
      </div>
    </>
  )
}

export default NewCampaignPage
