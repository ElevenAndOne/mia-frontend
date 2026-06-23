import { Navigate } from 'react-router-dom'
import { Spinner } from '../components/spinner'
import { useCampaignList, resolveDefaultCampaign } from '../features/campaigns/hooks/use-campaign-list'

// Entry resolver for /campaigns. Sends the user to their default campaign's
// Overview, or to the build-new surface when the workspace has no campaigns yet.
const CampaignsPage = () => {
  const { list, loading, error } = useCampaignList()

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary px-6">
        <p className="paragraph-sm text-utility-error-700">{error}</p>
      </div>
    )
  }

  const def = resolveDefaultCampaign(list)
  return <Navigate to={def ? `/campaigns/${def.campaign_id}/overview` : '/campaigns/new'} replace />
}

export default CampaignsPage
