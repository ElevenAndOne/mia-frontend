import { WorkspaceSettingsDetail } from '../features/workspace/components/workspace-settings-detail'
import { WorkspaceSettingsOverview } from '../features/workspace/components/workspace-settings-overview'
import { useWorkspaceSettingsPage } from '../features/workspace/hooks/use-workspace-settings-page'

interface WorkspaceSettingsPageProps {
  onBack: () => void
}

const WorkspaceSettingsPage = ({ onBack }: WorkspaceSettingsPageProps) => {
  const {
    selectedWorkspaceId,
    selectedWorkspace,
    overviewItems,
    showCreateModal,
    openCreateModal,
    closeCreateModal,
    handleWorkspaceCreated,
    activeTab,
    setActiveTab,
    canManage,
    loading,
    error,
    memberRows,
    pendingInvites,
    pendingInviteCount,
    showCreateInvite,
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
    openCreateInvite,
    cancelCreateInvite,
    completeInviteFlow,
    setInviteRole,
    setInviteEmail,
    setIsLinkInvite,
  } = useWorkspaceSettingsPage()

  if (!selectedWorkspaceId) {
    return (
      <WorkspaceSettingsOverview
        items={overviewItems}
        onSelectWorkspace={handleSelectWorkspace}
        onBack={onBack}
        showCreateModal={showCreateModal}
        onOpenCreateModal={openCreateModal}
        onCloseCreateModal={closeCreateModal}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    )
  }

  if (!selectedWorkspace) {
    return (
      <div className="w-full h-screen-dvh bg-primary flex items-center justify-center">
        <p className="paragraph-sm text-quaternary">Workspace not found</p>
      </div>
    )
  }

  return (
    <WorkspaceSettingsDetail
      activeTab={activeTab}
      canManage={canManage}
      error={error}
      loading={loading}
      members={memberRows}
      membersCount={memberRows.length}
      onBack={handleBackToOverview}
      onTabChange={setActiveTab}
      pendingInviteCount={pendingInviteCount}
      invites={pendingInvites}
      showCreateInvite={showCreateInvite}
      createdInviteLink={createdInviteLink}
      inviteRole={inviteRole}
      inviteEmail={inviteEmail}
      isLinkInvite={isLinkInvite}
      creatingInvite={creatingInvite}
      copySuccess={copySuccess}
      isCreateInviteDisabled={isCreateInviteDisabled}
      onOpenCreateInvite={openCreateInvite}
      onInviteTypeChange={setIsLinkInvite}
      onInviteEmailChange={setInviteEmail}
      onInviteRoleChange={setInviteRole}
      onCancelCreateInvite={cancelCreateInvite}
      onCreateInvite={handleCreateInvite}
      onCopyInvite={handleCopyInvite}
      onCompleteInviteFlow={completeInviteFlow}
      onRevokeInvite={handleRevokeInvite}
      onUpdateRole={handleUpdateRole}
      onRemoveMember={handleRemoveMember}
    />
  )
}

export default WorkspaceSettingsPage
