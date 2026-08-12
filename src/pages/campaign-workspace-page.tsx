import { useState, type FC } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { TopBar } from '../components/top-bar'
import { Button } from '../components/button'
import { Skeleton, SkeletonRows } from '../components/skeleton'
import { useSession } from '../contexts/session-context'
import { CampaignWorkspaceProvider } from '../features/campaigns/contexts/campaign-context'
import { useCampaignList } from '../features/campaigns/hooks/use-campaign-list'
import { useCampaignDetail } from '../features/campaigns/hooks/use-campaign-detail'
import { OverviewView } from '../features/campaigns/views/overview-view'
import { CalendarView } from '../features/campaigns/views/calendar-view'
import { BuilderView } from '../features/campaigns/views/builder-view'
import { AssetPreviewPanel } from '../features/campaigns/components/asset-preview-panel'
import type { CampaignView } from '../features/campaigns/types'

const VIEWS: Record<CampaignView, FC> = {
  overview: OverviewView,
  calendar: CalendarView,
  builder: BuilderView,
}

const CampaignWorkspacePage = () => {
  const { campaignId, view } = useParams<{ campaignId: string; view: string }>()
  const navigate = useNavigate()
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const { list, setList, reload: reloadList } = useCampaignList()
  const { campaign, setCampaign, loading, error, reload: reloadDetail } = useCampaignDetail(campaignId)
  // Asset canvas slide-over — openable from any view (asset cards, calendar events).
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null)

  const ViewComponent = view && view in VIEWS ? VIEWS[view as CampaignView] : null

  const body = () => {
    if (loading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
          <SkeletonRows rows={3} />
        </div>
      )
    }
    if (error || !campaign) {
      return (
        <div className="bg-utility-error-50 border border-utility-error-200 rounded-xl p-4">
          <p className="paragraph-sm text-utility-error-700 mb-3">{error ?? 'Campaign not found.'}</p>
          <Button variant="secondary" size="sm" onClick={() => void reloadDetail()}>
            Try again
          </Button>
        </div>
      )
    }
    if (!ViewComponent || !sessionId || !tenantId) return null
    return (
      <CampaignWorkspaceProvider
        value={{ tenantId, sessionId, campaign, setCampaign, reloadDetail, list, setList, reloadList, openAssetPreview: setPreviewAssetId }}
      >
        <ViewComponent />
        {previewAssetId && (
          <AssetPreviewPanel assetId={previewAssetId} onClose={() => setPreviewAssetId(null)} />
        )}
      </CampaignWorkspaceProvider>
    )
  }

  if (campaignId && view && !(view in VIEWS)) {
    return <Navigate to={`/campaigns/${campaignId}/overview`} replace />
  }

  return (
    <>
      <div className="campaign-workspace w-full h-dvh flex flex-col overflow-hidden">
        <TopBar title="Campaigns" onBack={() => navigate('/home')} />
        <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-6 py-6">
          <div className="max-w-[1200px] mx-auto">{body()}</div>
        </div>
      </div>
    </>
  )
}

export default CampaignWorkspacePage
