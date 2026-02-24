import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { TopBar } from '../components/top-bar'
import { useToast } from '../contexts/toast-context'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const HelpPage = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const {
    onNewChat,
    onIntegrationsClick,
    onHelpClick,
    onLogout,
    onWorkspaceSettings,
  } = useAppShellActions()

  const handleComingSoon = (feature: string) => {
    showToast('info', `${feature} coming soon!`)
  }

  return (
    <AppShell
      onNewChat={onNewChat}
      onIntegrationsClick={onIntegrationsClick}
      onHelpClick={onHelpClick}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
        <TopBar title="Help" onBack={() => navigate('/home')} className="border-b border-tertiary" />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        <div className="max-w-3xl mx-auto w-full">
          <h2 className="label-md text-primary mb-1">Need help?</h2>
          <p className="paragraph-xs text-quaternary mb-3">
            Having trouble connecting your data sources? Here are some helpful resources:
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleComingSoon('Integration Documentation')}
              className="block w-full bg-secondary border border-secondary rounded-xl p-3 text-left hover:bg-tertiary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="subheading-md text-primary">Integration Documentation</h3>
                  <p className="paragraph-xs text-quaternary">Step-by-step guides</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleComingSoon('Video Tutorial')}
              className="block w-full bg-secondary border border-secondary rounded-xl p-3 text-left hover:bg-tertiary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="subheading-md text-primary">Setup Video Tutorial</h3>
                  <p className="paragraph-xs text-quaternary">Watch how to connect</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleComingSoon('Contact Support')}
              className="w-full bg-secondary border border-secondary rounded-xl p-3 text-left hover:bg-tertiary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="subheading-md text-primary">Contact Support</h3>
                  <p className="paragraph-xs text-quaternary">Get help from our team</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
      </div>
    </AppShell>
  )
}

export default HelpPage
