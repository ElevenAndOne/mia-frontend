import { useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/session-context'

export const useAppShellActions = () => {
  const navigate = useNavigate()
  const { logout } = useSession()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return {
    onNewChat: () => navigate('/home', { state: { newChat: true } }),
    onIntegrationsClick: () => navigate('/integrations'),
    onCampaignsClick: () => navigate('/campaigns'),
    onStrategiseClick: () => navigate('/strategise'),
    onReportsClick: () => navigate('/reports'),
    onHelpClick: () => navigate('/help'),
    onLogout: handleLogout,
    onWorkspaceSettings: () => navigate('/settings/workspace'),
    onNewWorkspace: () => window.dispatchEvent(new CustomEvent('mia:new-workspace')),
  }
}
