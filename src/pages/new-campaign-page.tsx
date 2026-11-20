import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/top-bar'
import { useExperience } from '../features/workspace/hooks/use-experience'
import { oldCampaignCrumbs } from '../features/campaigns/utils/old-campaign-crumbs'
import { BuilderChat } from '../features/campaigns/components/empty-state/builder-chat'

// /campaigns/new — build a campaign from scratch (chat or brief upload). Also the
// destination when the workspace has no campaigns yet.
const NewCampaignPage = () => {
  const navigate = useNavigate()
  const { isBasic } = useExperience()

  return (
    <>
      <div className="campaign-workspace w-full h-dvh flex flex-col overflow-hidden">
        <TopBar
          title="New campaign"
          breadcrumbs={oldCampaignCrumbs(isBasic, undefined, undefined, 'new')}
          onBack={() => navigate(isBasic ? '/home' : '/campaign-builder')}
        />
        <div className="flex-1 min-h-0">
          <BuilderChat />
        </div>
      </div>
    </>
  )
}

export default NewCampaignPage
