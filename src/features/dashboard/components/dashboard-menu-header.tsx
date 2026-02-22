import { getAccountIcon } from '../../../utils/account-icon'
import WorkspaceSwitcher from '../../workspace/views/workspace-switcher'
import type { AccountMapping } from '../../accounts/types'
import type { Workspace } from '../../workspace/types'

interface DashboardMenuHeaderProps {
  showBurgerMenu: boolean
  showAccountSelector: boolean
  showWorkspaceSwitcher: boolean
  selectedAccount: AccountMapping | null
  availableAccounts: AccountMapping[]
  activeWorkspace: Workspace | null
  isAccountSwitching: boolean
  onToggleMenu: () => void
  onOpenAccountSelector: () => void
  onOpenWorkspaceSwitcher: () => void
  onBackToMenu: () => void
  onSelectAccount: (accountId: string) => void
  onIntegrationsClick: () => void
  onLogout: () => void
  onCreateWorkspace: () => void
  onWorkspaceSettingsClick: () => void
  onCloseWorkspaceSwitcher: () => void
}

export const DashboardMenuHeader = ({
  showBurgerMenu,
  showAccountSelector,
  showWorkspaceSwitcher,
  selectedAccount,
  availableAccounts,
  activeWorkspace,
  isAccountSwitching,
  onToggleMenu,
  onOpenAccountSelector,
  onOpenWorkspaceSwitcher,
  onBackToMenu,
  onSelectAccount,
  onIntegrationsClick,
  onLogout,
  onCreateWorkspace,
  onWorkspaceSettingsClick,
  onCloseWorkspaceSwitcher,
}: DashboardMenuHeaderProps) => {
  return (
    <div className="flex items-center px-4 py-1 safe-top relative z-20 shrink-0 justify-start">
      <div className="relative">
        <button
          onClick={onToggleMenu}
          data-track-id="dashboard-menu-toggle"
          className="w-6 h-6 flex items-center justify-center"
        >
          <img src="/icons/menu.svg" alt="Menu" className="w-6 h-6" />
        </button>

        {showBurgerMenu && !showAccountSelector && !showWorkspaceSwitcher && (
          <div className="absolute top-8 left-0 bg-primary rounded-lg shadow-lg border border-secondary min-w-64 z-30">
            <button
              onClick={onOpenAccountSelector}
              data-track-id="dashboard-menu-open-account-selector"
              className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center paragraph-xs"
                  style={{ backgroundColor: selectedAccount?.color }}
                >
                  {getAccountIcon(selectedAccount?.business_type || '')}
                </div>
                <div>
                  <div className="subheading-md text-primary">Accounts</div>
                  <div className="paragraph-xs text-quaternary">{selectedAccount?.name}</div>
                </div>
              </div>
              <svg className="w-4 h-4 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="border-t border-tertiary"></div>

            <button
              onClick={onOpenWorkspaceSwitcher}
              data-track-id="dashboard-menu-open-workspace-switcher"
              className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-brand-solid flex items-center justify-center label-xs text-primary-onbrand">
                  {activeWorkspace?.name?.charAt(0)?.toUpperCase() || 'W'}
                </div>
                <div>
                  <div className="subheading-md text-primary">Workspaces</div>
                  <div className="paragraph-xs text-quaternary">{activeWorkspace?.name || 'No workspace'}</div>
                </div>
              </div>
              <svg className="w-4 h-4 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="border-t border-tertiary"></div>

            <button
              onClick={onIntegrationsClick}
              data-track-id="dashboard-menu-open-integrations"
              className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center gap-3"
            >
              <div className="relative">
                <div className="w-5 h-5 rounded-full bg-primary-solid flex items-center justify-center">
                  <img src="/icons/plugin.svg" alt="Integrations" className="w-3.5 h-3.5 brightness-0 invert" />
                </div>
              </div>
              <div className="subheading-bg text-primary">Integrations</div>
            </button>

            <div className="border-t border-tertiary"></div>

            <button
              onClick={onLogout}
              data-track-id="dashboard-menu-sign-out"
              className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-secondary">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="subheading-bg text-primary">Sign Out</div>
            </button>
          </div>
        )}

        {showBurgerMenu && showWorkspaceSwitcher && (
          <WorkspaceSwitcher
            onClose={onCloseWorkspaceSwitcher}
            onCreateWorkspace={onCreateWorkspace}
            onSettings={onWorkspaceSettingsClick}
          />
        )}

        {showBurgerMenu && showAccountSelector && (
          <div className="absolute top-8 left-0 bg-primary rounded-lg shadow-lg border border-secondary min-w-64 z-30">
            <button
              onClick={onBackToMenu}
              data-track-id="dashboard-menu-back"
              className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center gap-3 border-b border-tertiary"
            >
              <svg className="w-4 h-4 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <div className="subheading-md text-primary">Back</div>
            </button>

            <div className="px-2 py-2">
              {availableAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => onSelectAccount(account.id)}
                  data-track-id={`dashboard-menu-select-account-${account.id}`}
                  disabled={isAccountSwitching || account.id === selectedAccount?.id}
                  className={`w-full px-3 py-2 text-left rounded-lg flex items-center gap-3 paragraph-sm transition-colors ${
                    account.id === selectedAccount?.id
                      ? 'bg-secondary text-placeholder-subtle cursor-default'
                      : 'hover:bg-secondary text-secondary'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center paragraph-xs"
                    style={{ backgroundColor: account.color }}
                  >
                    {getAccountIcon(account.business_type)}
                  </div>
                  <div className="flex-1">
                    <div className="subheading-md text-primary">{account.name}</div>
                    <div className="paragraph-xs text-quaternary">{account.business_type}</div>
                  </div>
                  {account.id === selectedAccount?.id && (
                    <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isAccountSwitching && account.id !== selectedAccount?.id && (
                    <div className="w-4 h-4 border-2 border-primary border-t-utility-info-500 rounded-full animate-spin"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
