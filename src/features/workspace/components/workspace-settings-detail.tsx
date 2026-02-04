import { Icon } from '../../../components/icon'
import { Spinner } from '../../../components/spinner'
import { TopBar } from '../../../components/top-bar'
import { CreateInviteModal } from './create-invite-modal'
import { WorkspaceMembersPanel } from './workspace-members-panel'
import type { WorkspacePersonRow } from '../utils/workspace-settings'

interface WorkspaceSettingsDetailProps {
  canManage: boolean
  error: string | null
  loading: boolean
  people: WorkspacePersonRow[]
  onBack: () => void
  showCreateInviteModal: boolean
  createdInviteLink: string | null
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
}

export const WorkspaceSettingsDetail = ({
  canManage,
  error,
  loading,
  people,
  onBack,
  showCreateInviteModal,
  createdInviteLink,
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
}: WorkspaceSettingsDetailProps) => {
  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar
        title="Workspace Settings"
        onBack={onBack}
        className="border-b border-tertiary"
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl mx-auto w-full">
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
      </div>

      <CreateInviteModal
        isOpen={showCreateInviteModal}
        onClose={onCloseCreateInviteModal}
        inviteRole={inviteRole}
        inviteEmail={inviteEmail}
        isLinkInvite={isLinkInvite}
        creatingInvite={creatingInvite}
        createdInviteLink={createdInviteLink}
        copySuccess={copySuccess}
        isCreateInviteDisabled={isCreateInviteDisabled}
        onInviteTypeChange={onInviteTypeChange}
        onInviteEmailChange={onInviteEmailChange}
        onInviteRoleChange={onInviteRoleChange}
        onCreateInvite={onCreateInvite}
        onCopyInvite={onCopyInvite}
        onComplete={onCompleteInviteFlow}
      />
    </div>
  )
}
