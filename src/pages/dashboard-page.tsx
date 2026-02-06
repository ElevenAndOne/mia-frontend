import { DashboardChatHeader } from '../features/dashboard/components/dashboard-chat-header'
import { DashboardChatPanel } from '../features/dashboard/components/dashboard-chat-panel'
import { DashboardHomePanel } from '../features/dashboard/components/dashboard-home-panel'
import { DashboardMenuHeader } from '../features/dashboard/components/dashboard-menu-header'
import { useDashboardPage } from '../features/dashboard/hooks/use-dashboard-page'
import BrevoConnectionModal from '../features/integrations/views/brevo-connection-modal'
import DateRangeSelector from '../components/date-range-selector'
import CreateWorkspaceModal from '../features/workspace/views/create-workspace-modal'

const DashboardPage = () => {
  const {
    selectedAccount,
    availableAccounts,
    activeWorkspace,
    platformConfig,
    userName,
    dateRangeLabel,
    showChat,
    chatMessages,
    showBurgerMenu,
    showAccountSelector,
    showWorkspaceSwitcher,
    showCreateWorkspaceModal,
    isChatLoading,
    isAccountSwitching,
    showBrevoModal,
    showMore,
    dateRange,
    showDatePicker,
    connectedPlatforms,
    selectedPlatforms,
    configurationGuidance,
    datePickerButtonRef,
    setShowChat,
    setShowBurgerMenu,
    setShowAccountSelector,
    setShowWorkspaceSwitcher,
    setShowCreateWorkspaceModal,
    setShowBrevoModal,
    setShowMore,
    setShowDatePicker,
    setDateRange,
    togglePlatform,
    handleAccountSwitch,
    handleChatSubmit,
    handleLogout,
    onIntegrationsClick,
    onWorkspaceSettingsClick,
    onGrowQuickClick,
    onOptimizeQuickClick,
    onProtectQuickClick,
  } = useDashboardPage()

  const handleToggleMenu = () => setShowBurgerMenu((prev) => !prev)
  const handleOpenAccountSelector = () => setShowAccountSelector(true)
  const handleOpenWorkspaceSwitcher = () => setShowWorkspaceSwitcher(true)
  const handleBackToMenu = () => setShowAccountSelector(false)
  const handleCloseMenu = () => {
    setShowBurgerMenu(false)
    setShowAccountSelector(false)
    setShowWorkspaceSwitcher(false)
  }
  const handleIntegrationsClick = () => {
    onIntegrationsClick()
    setShowBurgerMenu(false)
  }
  const handleLogoutClick = () => {
    handleLogout()
    setShowBurgerMenu(false)
  }
  const handleCloseWorkspaceSwitcher = () => {
    setShowWorkspaceSwitcher(false)
    setShowBurgerMenu(false)
  }
  const handleCreateWorkspace = () => {
    setShowWorkspaceSwitcher(false)
    setShowBurgerMenu(false)
    setShowCreateWorkspaceModal(true)
  }
  const handleWorkspaceSettings = () => {
    setShowWorkspaceSwitcher(false)
    setShowBurgerMenu(false)
    onWorkspaceSettingsClick()
  }

  return (
    <div className="w-full h-full relative bg-primary flex flex-col">
      {!showChat ? (
        <DashboardMenuHeader
          showBurgerMenu={showBurgerMenu}
          showAccountSelector={showAccountSelector}
          showWorkspaceSwitcher={showWorkspaceSwitcher}
          selectedAccount={selectedAccount}
          availableAccounts={availableAccounts}
          activeWorkspace={activeWorkspace}
          isAccountSwitching={isAccountSwitching}
          onToggleMenu={handleToggleMenu}
          onOpenAccountSelector={handleOpenAccountSelector}
          onOpenWorkspaceSwitcher={handleOpenWorkspaceSwitcher}
          onBackToMenu={handleBackToMenu}
          onSelectAccount={handleAccountSwitch}
          onIntegrationsClick={handleIntegrationsClick}
          onLogout={handleLogoutClick}
          onCreateWorkspace={handleCreateWorkspace}
          onWorkspaceSettingsClick={handleWorkspaceSettings}
          onCloseWorkspaceSwitcher={handleCloseWorkspaceSwitcher}
        />
      ) : (
        <DashboardChatHeader
          dateRangeLabel={dateRangeLabel}
          onBack={() => setShowChat(false)}
          onOpenDatePicker={() => setShowDatePicker(true)}
          datePickerButtonRef={datePickerButtonRef}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {!showChat ? (
          <DashboardHomePanel
            userName={userName}
            configurationGuidance={configurationGuidance}
            platformConfig={platformConfig}
            connectedPlatforms={connectedPlatforms}
            selectedPlatforms={selectedPlatforms}
            onTogglePlatform={togglePlatform}
            onIntegrationsClick={onIntegrationsClick}
            onGrowQuickClick={onGrowQuickClick}
            onOptimizeQuickClick={onOptimizeQuickClick}
            onProtectQuickClick={onProtectQuickClick}
            showMore={showMore}
            onShowMore={() => setShowMore(true)}
            onShowChat={() => setShowChat(true)}
          />
        ) : (
          <DashboardChatPanel
            messages={chatMessages}
            isLoading={isChatLoading}
            onSubmitMessage={handleChatSubmit}
          />
        )}
      </div>

      {showBurgerMenu && (
        <div className="fixed inset-0 z-10" onClick={handleCloseMenu} />
      )}

      <BrevoConnectionModal
        isOpen={showBrevoModal}
        onClose={() => setShowBrevoModal(false)}
        onSuccess={() => {
          console.log('Brevo connected successfully')
        }}
      />

      <DateRangeSelector
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedRange={dateRange}
        onApply={(range) => setDateRange(range)}
        anchorRef={datePickerButtonRef}
      />

      <CreateWorkspaceModal
        isOpen={showCreateWorkspaceModal}
        onClose={() => setShowCreateWorkspaceModal(false)}
        onSuccess={(tenantId) => {
          console.log('[MAIN-VIEW] Workspace created:', tenantId)
          window.location.reload()
        }}
      />
    </div>
  )
}

export default DashboardPage
