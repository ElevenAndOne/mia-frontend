import { Spinner } from '../../../components/spinner'
import { TopBar } from '../../../components/top-bar'
import { WorkspaceInvitesPanel } from './workspace-invites-panel'
import { WorkspaceMembersPanel } from './workspace-members-panel'
import type { WorkspaceInviteRow, WorkspaceMemberRow, WorkspaceSettingsTab } from '../utils/workspace-settings'

interface WorkspaceSettingsDetailProps {
  activeTab: WorkspaceSettingsTab
  canManage: boolean
  error: string | null
  loading: boolean
  members: WorkspaceMemberRow[]
  membersCount: number
  onBack: () => void
  onTabChange: (tab: WorkspaceSettingsTab) => void
  pendingInviteCount: number
  invites: WorkspaceInviteRow[]
  showCreateInvite: boolean
  createdInviteLink: string | null
  inviteRole: string
  inviteEmail: string
  isLinkInvite: boolean
  creatingInvite: boolean
  copySuccess: boolean
  isCreateInviteDisabled: boolean
  onOpenCreateInvite: () => void
  onInviteTypeChange: (isLinkInvite: boolean) => void
  onInviteEmailChange: (value: string) => void
  onInviteRoleChange: (role: string) => void
  onCancelCreateInvite: () => void
  onCreateInvite: () => void
  onCopyInvite: (inviteLink: string) => void
  onCompleteInviteFlow: () => void
  onRevokeInvite: (inviteId: string) => void
  onUpdateRole: (userId: string, role: string) => void
  onRemoveMember: (userId: string) => void
}

export const WorkspaceSettingsDetail = ({
  activeTab,
  canManage,
  error,
  loading,
  members,
  membersCount,
  onBack,
  onTabChange,
  pendingInviteCount,
  invites,
  showCreateInvite,
  createdInviteLink,
  inviteRole,
  inviteEmail,
  isLinkInvite,
  creatingInvite,
  copySuccess,
  isCreateInviteDisabled,
  onOpenCreateInvite,
  onInviteTypeChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onCancelCreateInvite,
  onCreateInvite,
  onCopyInvite,
  onCompleteInviteFlow,
  onRevokeInvite,
  onUpdateRole,
  onRemoveMember,
}: WorkspaceSettingsDetailProps) => {
  return (
    <div className="w-full h-screen-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar
        title="Workspace Settings"
        onBack={onBack}
        className="border-b border-tertiary"
      />

      <div className="flex border-b border-tertiary max-w-3xl mx-auto w-full">
        <button
          onClick={() => onTabChange('members')}
          className={`flex-1 py-3 subheading-md transition-colors ${activeTab === 'members'
            ? 'text-primary border-b-2 border-brand'
            : 'text-quaternary hover:text-secondary'
            }`}
        >
          Members ({membersCount})
        </button>
        {canManage && (
          <button
            onClick={() => onTabChange('invites')}
            className={`flex-1 py-3 subheading-md transition-colors ${activeTab === 'invites'
              ? 'text-primary border-b-2 border-brand'
              : 'text-quaternary hover:text-secondary'
              }`}
          >
            Invites ({pendingInviteCount})
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl mx-auto w-full">
        {error && (
          <div className="mb-4 p-3 bg-error-primary border border-error-subtle rounded-lg">
            <p className="paragraph-sm text-error">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" variant="dark" />
          </div>
        ) : activeTab === 'members' ? (
          <WorkspaceMembersPanel
            members={members}
            onUpdateRole={onUpdateRole}
            onRemoveMember={onRemoveMember}
          />
        ) : (
          <WorkspaceInvitesPanel
            showCreateInvite={showCreateInvite}
            createdInviteLink={createdInviteLink}
            inviteRole={inviteRole}
            inviteEmail={inviteEmail}
            isLinkInvite={isLinkInvite}
            creatingInvite={creatingInvite}
            copySuccess={copySuccess}
            isCreateInviteDisabled={isCreateInviteDisabled}
            pendingInvites={invites}
            onOpenCreateInvite={onOpenCreateInvite}
            onInviteTypeChange={onInviteTypeChange}
            onInviteEmailChange={onInviteEmailChange}
            onInviteRoleChange={onInviteRoleChange}
            onCancelCreateInvite={onCancelCreateInvite}
            onCreateInvite={onCreateInvite}
            onCopyInvite={onCopyInvite}
            onCompleteInviteFlow={onCompleteInviteFlow}
            onRevokeInvite={onRevokeInvite}
          />
        )}
      </div>
    </div>
  )
}
