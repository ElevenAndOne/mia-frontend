import { Navigate } from 'react-router-dom'
import { Button } from '../components/button'
import { Spinner } from '../components/spinner'
import { useCampaignList, resolveDefaultCampaign } from '../features/campaigns/hooks/use-campaign-list'
import { useExperience } from '../features/workspace/hooks/use-experience'

// Entry resolver for /campaigns. Sends the user to their default campaign's
// Overview, or to the build-new surface when the workspace has no campaigns yet.
// The list comes from the shared React Query cache, so on a revisit this
// resolves (and redirects) instantly with no spinner.
const CampaignsPage = () => {
  const { list, loading, error, reload } = useCampaignList()
  const { isAgency } = useExperience()

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-secondary px-6">
        <p className="paragraph-sm text-utility-error-700">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => void reload()}>
          Try again
        </Button>
      </div>
    )
  }

  const def = resolveDefaultCampaign(list)
  // an agency workspace with no old campaigns starts a new one in the campaign builder, never the old builder
  // (review 26 Nov, E12; the builder is Agency only)
  return <Navigate to={def ? `/campaigns/${def.campaign_id}/overview` : isAgency ? '/campaign-builder/new' : '/campaigns/new'} replace />
}

export default CampaignsPage
