import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/app-shell'
import { WorkspaceSettingsDetail } from '../features/workspace/components/workspace-settings-detail'
import { WorkspaceSettingsOverview } from '../features/workspace/components/workspace-settings-overview'
import { useWorkspaceSettingsPage } from '../features/workspace/hooks/use-workspace-settings-page'
import { useAppShellActions } from '../hooks/use-app-shell-actions'

const WorkspaceSettingsPage = () => {
  const navigate = useNavigate()
  const {
    onNewWorkspace,
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
    createdInviteEmail,
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
    showRenameModal,
    openRenameModal,
    closeRenameModal,
    handleRenameWorkspace,
    renaming,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteWorkspace,
    handleLeaveWorkspace,
  } = useWorkspaceSettingsPage()

  const handleBack = () => navigate(-1)

  return (
    <AppShell
      onNewWorkspace={onNewWorkspace}
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
          createdInviteEmail={createdInviteEmail}
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
          showRenameModal={showRenameModal}
          onOpenRenameModal={openRenameModal}
          onCloseRenameModal={closeRenameModal}
          onRenameWorkspace={handleRenameWorkspace}
          renaming={renaming}
          showDeleteModal={showDeleteModal}
          onOpenDeleteModal={openDeleteModal}
          onCloseDeleteModal={closeDeleteModal}
          onDeleteWorkspace={handleDeleteWorkspace}
          onLeaveWorkspace={handleLeaveWorkspace}
        />
      )}
    </AppShell>
  )
}

export default WorkspaceSettingsPage
