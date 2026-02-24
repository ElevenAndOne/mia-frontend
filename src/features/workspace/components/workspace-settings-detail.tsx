import { Icon } from '../../../components/icon'
import { Spinner } from '../../../components/spinner'
import { TopBar } from '../../../components/top-bar'
import { CreateInviteModal } from './create-invite-modal'
import { DeleteWorkspaceModal } from './delete-workspace-modal'
import { WorkspaceMembersPanel } from './workspace-members-panel'
import type { WorkspacePersonRow } from '../utils/workspace-settings'
import type { Workspace } from '../types'

interface WorkspaceSettingsDetailProps {
  canManage: boolean
  isOwner: boolean
  workspace: Workspace
  error: string | null
  loading: boolean
  people: WorkspacePersonRow[]
  onBack: () => void
  showCreateInviteModal: boolean
  createdInviteLink: string | null
  createdInviteEmail: string | null
  inviteRole: string
  inviteEmail: string
  isLinkInvite: boolean
  creatingInvite: boolean
  copySuccess: boolean
  isCreateInviteDisabled: boolean
  onOpenCreateInviteModal: () => void
  onCloseCreateInviteModal: () => void
  onInviteTypeChange: (isLinkInvite: boolean) => void
  onInviteEmailChange: (value: string) => void
  onInviteRoleChange: (role: string) => void
  onCreateInvite: () => void
  onCopyInvite: (inviteLink: string) => void
  onCompleteInviteFlow: () => void
  onRevokeInvite: (inviteId: string) => void
  onUpdateRole: (userId: string, role: string) => void
  onRemoveMember: (userId: string) => void
  showDeleteModal: boolean
  onOpenDeleteModal: () => void
  onCloseDeleteModal: () => void
  onDeleteWorkspace: () => Promise<boolean>
  onLeaveWorkspace?: () => Promise<boolean>  // NEW (Feb 2026): Leave workspace for non-owners
}

export const WorkspaceSettingsDetail = ({
  canManage,
  isOwner,
  workspace,
  error,
  loading,
  people,
  onBack,
  showCreateInviteModal,
  createdInviteLink,
  createdInviteEmail,
  inviteRole,
  inviteEmail,
  isLinkInvite,
  creatingInvite,
  copySuccess,
  isCreateInviteDisabled,
  onOpenCreateInviteModal,
  onCloseCreateInviteModal,
  onInviteTypeChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateInvite,
  onCopyInvite,
  onCompleteInviteFlow,
  onRevokeInvite,
  onUpdateRole,
  onRemoveMember,
  showDeleteModal,
  onOpenDeleteModal,
  onCloseDeleteModal,
  onDeleteWorkspace,
  onLeaveWorkspace,
}: WorkspaceSettingsDetailProps) => {
  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar
        title="Workspace Settings"
        onBack={onBack}
        className="border-b border-tertiary"
      />

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 max-w-3xl mx-auto w-full">
        {error && (
          <div className="mb-4 p-3 bg-error-primary border border-error-subtle rounded-lg">
            <p className="paragraph-sm text-error">{error}</p>
          </div>
        )}

        {canManage && (
          <button
            onClick={onOpenCreateInviteModal}
            className="w-full py-3 px-4 bg-brand-solid text-primary-onbrand rounded-xl subheading-md flex items-center justify-center gap-2 hover:bg-brand-solid-hover transition-colors mb-4"
          >
            <Icon.plus size={20} />
            Invite Member
          </button>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" variant="dark" />
          </div>
        ) : (
          <WorkspaceMembersPanel
            people={people}
            onUpdateRole={onUpdateRole}
            onRemoveMember={onRemoveMember}
            onCopyInvite={onCopyInvite}
            onRevokeInvite={onRevokeInvite}
          />
        )}

        {/* Danger Zone - Owner Only */}
        {isOwner && (
          <div className="mt-8 pt-6 border-t border-tertiary">
            <h3 className="subheading-md text-error mb-2">Danger Zone</h3>
            <p className="paragraph-sm text-tertiary mb-4">
              Permanently delete this workspace and all its data.
            </p>
            <button
              onClick={onOpenDeleteModal}
              className="px-4 py-2 border border-error text-error hover:bg-error hover:text-white rounded-lg subheading-md transition-colors"
            >
              Delete Workspace
            </button>
          </div>
        )}

        {/* Leave Workspace - Non-Owners Only (Feb 2026) */}
        {!isOwner && onLeaveWorkspace && (
          <div className="mt-8 pt-6 border-t border-tertiary">
            <h3 className="subheading-md text-error mb-2">Leave Workspace</h3>
            <p className="paragraph-sm text-tertiary mb-4">
              Remove yourself from this workspace. You'll lose access to all workspace data.
            </p>
            <button
              onClick={onLeaveWorkspace}
              className="px-4 py-2 border border-error text-error hover:bg-error hover:text-white rounded-lg subheading-md transition-colors"
            >
              Leave Workspace
            </button>
          </div>
        )}
      </div>

      <CreateInviteModal
        isOpen={showCreateInviteModal}
        onClose={onCloseCreateInviteModal}
        inviteRole={inviteRole}
        inviteEmail={inviteEmail}
        isLinkInvite={isLinkInvite}
        creatingInvite={creatingInvite}
        createdInviteLink={createdInviteLink}
        createdInviteEmail={createdInviteEmail}
        copySuccess={copySuccess}
        isCreateInviteDisabled={isCreateInviteDisabled}
        onInviteTypeChange={onInviteTypeChange}
        onInviteEmailChange={onInviteEmailChange}
        onInviteRoleChange={onInviteRoleChange}
        onCreateInvite={onCreateInvite}
        onCopyInvite={onCopyInvite}
        onComplete={onCompleteInviteFlow}
      />

      <DeleteWorkspaceModal
        isOpen={showDeleteModal}
        onClose={onCloseDeleteModal}
        workspace={workspace}
        onConfirm={onDeleteWorkspace}
      />
    </div>
  )
}
