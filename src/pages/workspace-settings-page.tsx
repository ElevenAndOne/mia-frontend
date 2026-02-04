import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { WorkspaceSettingsDetail } from '../features/workspace/components/workspace-settings-detail'
import { WorkspaceSettingsOverview } from '../features/workspace/components/workspace-settings-overview'
import { useWorkspaceSettingsPage } from '../features/workspace/hooks/use-workspace-settings-page'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const WorkspaceSettingsPage = () => {
  const navigate = useNavigate()
  const {
    onNewChat,
    onIntegrationsClick,
    onHelpClick,
    onLogout,
    onWorkspaceSettings,
  } = useAppShellActions()
  const {
    selectedWorkspaceId,
    selectedWorkspace,
    overviewItems,
    showCreateModal,
    openCreateModal,
    closeCreateModal,
    handleWorkspaceCreated,
    canManage,
    isOwner,
    loading,
    error,
    unifiedPeople,
    showCreateInviteModal,
    inviteRole,
    inviteEmail,
    isLinkInvite,
    creatingInvite,
    createdInviteLink,
    copySuccess,
    isCreateInviteDisabled,
    handleSelectWorkspace,
    handleBackToOverview,
    handleCreateInvite,
    handleRevokeInvite,
    handleRemoveMember,
    handleUpdateRole,
    handleCopyInvite,
    openCreateInviteModal,
    closeCreateInviteModal,
    completeInviteFlow,
    setInviteRole,
    setInviteEmail,
    setIsLinkInvite,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteWorkspace,
  } = useWorkspaceSettingsPage()

  const handleBack = () => navigate('/home')

  return (
    <AppShell
      onNewChat={onNewChat}
      onIntegrationsClick={onIntegrationsClick}
      onHelpClick={onHelpClick}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      {!selectedWorkspaceId ? (
        <WorkspaceSettingsOverview
          items={overviewItems}
          onSelectWorkspace={handleSelectWorkspace}
          onBack={handleBack}
          showCreateModal={showCreateModal}
          onOpenCreateModal={openCreateModal}
          onCloseCreateModal={closeCreateModal}
          onWorkspaceCreated={handleWorkspaceCreated}
        />
      ) : !selectedWorkspace ? (
        <div className="w-full h-dvh bg-primary flex items-center justify-center">
          <p className="paragraph-sm text-quaternary">Workspace not found</p>
        </div>
      ) : (
        <WorkspaceSettingsDetail
          canManage={canManage}
          isOwner={isOwner}
          workspace={selectedWorkspace}
          error={error}
          loading={loading}
          people={unifiedPeople}
          onBack={handleBackToOverview}
          showCreateInviteModal={showCreateInviteModal}
          createdInviteLink={createdInviteLink}
          inviteRole={inviteRole}
          inviteEmail={inviteEmail}
          isLinkInvite={isLinkInvite}
          creatingInvite={creatingInvite}
          copySuccess={copySuccess}
          isCreateInviteDisabled={isCreateInviteDisabled}
          onOpenCreateInviteModal={openCreateInviteModal}
          onCloseCreateInviteModal={closeCreateInviteModal}
          onInviteTypeChange={setIsLinkInvite}
          onInviteEmailChange={setInviteEmail}
          onInviteRoleChange={setInviteRole}
          onCreateInvite={handleCreateInvite}
          onCopyInvite={handleCopyInvite}
          onCompleteInviteFlow={completeInviteFlow}
          onRevokeInvite={handleRevokeInvite}
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
          showDeleteModal={showDeleteModal}
          onOpenDeleteModal={openDeleteModal}
          onCloseDeleteModal={closeDeleteModal}
          onDeleteWorkspace={handleDeleteWorkspace}
        />
      )}
    </AppShell>
  )
}

export default WorkspaceSettingsPage
