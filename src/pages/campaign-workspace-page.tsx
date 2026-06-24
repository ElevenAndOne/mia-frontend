import type { FC } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { TopBar } from '../components/top-bar'
import { Spinner } from '../components/spinner'
import { useSession } from '../contexts/session-context'
import { useAppShellActions } from '../hooks/use-app-shell-actions'
import { CampaignWorkspaceProvider } from '../features/campaigns/contexts/campaign-context'
import { useCampaignList } from '../features/campaigns/hooks/use-campaign-list'
import { useCampaignDetail } from '../features/campaigns/hooks/use-campaign-detail'
import { OverviewView } from '../features/campaigns/views/overview-view'
import { CalendarView } from '../features/campaigns/views/calendar-view'
import { BuilderView } from '../features/campaigns/views/builder-view'
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
  const {
    onNewWorkspace,
    onIntegrationsClick,
    onCampaignsClick,
    onReportsClick,
    onCreativeStudioClick,
    onHelpClick,
    onLogout,
    onWorkspaceSettings,
  } = useAppShellActions()
  const { list, setList, reload: reloadList } = useCampaignList()
  const { campaign, setCampaign, loading, error, reload: reloadDetail } = useCampaignDetail(campaignId)

  const ViewComponent = view && view in VIEWS ? VIEWS[view as CampaignView] : null

  const body = () => {
    if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="md" /></div>
    if (error || !campaign) {
      return (
        <div className="bg-utility-error-50 border border-utility-error-200 rounded-xl p-4">
          <p className="paragraph-sm text-utility-error-700">{error ?? 'Campaign not found.'}</p>
        </div>
      )
    }
    if (!ViewComponent || !sessionId || !tenantId) return null
    return (
      <CampaignWorkspaceProvider
        value={{ tenantId, sessionId, campaign, setCampaign, reloadDetail, list, setList, reloadList }}
      >
        <ViewComponent />
      </CampaignWorkspaceProvider>
    )
  }

  if (campaignId && view && !(view in VIEWS)) {
    return <Navigate to={`/campaigns/${campaignId}/overview`} replace />
  }

  return (
    <AppShell
      onNewWorkspace={onNewWorkspace}
      onIntegrationsClick={onIntegrationsClick}
      onCampaignsClick={onCampaignsClick}
      onReportsClick={onReportsClick}
      onCreativeStudioClick={onCreativeStudioClick}
      onHelpClick={onHelpClick}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <div className="campaign-workspace w-full h-dvh flex flex-col overflow-hidden">
        <TopBar title="Campaigns" onBack={() => navigate('/home')} />
        <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-6 py-6">
          <div className="max-w-[1200px] mx-auto">{body()}</div>
        </div>
      </div>
    </AppShell>
  )
}

export default CampaignWorkspacePage
