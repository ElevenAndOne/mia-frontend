import { useNavigate } from 'react-router-dom'
import { WorkspaceSettingsDetail } from '../features/workspace/components/workspace-settings-detail'
import { WorkspaceSettingsOverview } from '../features/workspace/components/workspace-settings-overview'
import { useExperience } from '../features/workspace/hooks/use-experience'
import { useWorkspaceSettingsPage } from '../features/workspace/hooks/use-workspace-settings-page'

const WorkspaceSettingsPage = () => {
  const navigate = useNavigate()
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
    handleTransferOwnership,
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
  // Basic opens straight on its only workspace, so "back" has no overview to return to —
  // deselecting just re-selects on the next render and the arrow appears to do nothing.
  // Leaving Settings is what back means here.
  const { isBasic } = useExperience()
  const backFromDetail = isBasic ? () => navigate('/home') : handleBackToOverview

  return (
    <>
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
          onBack={backFromDetail}
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
          onTransferOwnership={handleTransferOwnership}
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
    </>
  )
}

export default WorkspaceSettingsPage
