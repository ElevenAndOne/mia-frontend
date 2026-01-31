import { Icon } from '../../../components/icon'
import type { WorkspaceInviteRow } from '../utils/workspace-settings'

interface WorkspaceInvitesPanelProps {
  showCreateInvite: boolean
  createdInviteLink: string | null
  inviteRole: string
  inviteEmail: string
  isLinkInvite: boolean
  creatingInvite: boolean
  copySuccess: boolean
  isCreateInviteDisabled: boolean
  pendingInvites: WorkspaceInviteRow[]
  onOpenCreateInvite: () => void
  onInviteTypeChange: (isLinkInvite: boolean) => void
  onInviteEmailChange: (value: string) => void
  onInviteRoleChange: (role: string) => void
  onCancelCreateInvite: () => void
  onCreateInvite: () => void
  onCopyInvite: (inviteLink: string) => void
  onCompleteInviteFlow: () => void
  onRevokeInvite: (inviteId: string) => void
}

export const WorkspaceInvitesPanel = ({
  showCreateInvite,
  createdInviteLink,
  inviteRole,
  inviteEmail,
  isLinkInvite,
  creatingInvite,
  copySuccess,
  isCreateInviteDisabled,
  pendingInvites,
  onOpenCreateInvite,
  onInviteTypeChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onCancelCreateInvite,
  onCreateInvite,
  onCopyInvite,
  onCompleteInviteFlow,
  onRevokeInvite,
}: WorkspaceInvitesPanelProps) => {
  return (
    <div className="space-y-4">
      {!showCreateInvite && !createdInviteLink && (
        <button
          onClick={onOpenCreateInvite}
          className="w-full py-3 px-4 bg-brand-solid text-primary-onbrand rounded-xl subheading-md flex items-center justify-center gap-2 hover:bg-brand-solid-hover transition-colors"
        >
          <Icon.plus size={20} />
          Create Invite Link
        </button>
      )}

      {showCreateInvite && !createdInviteLink && (
        <div className="bg-secondary rounded-xl p-4 space-y-4">
          <h3 className="label-md text-primary">Create Invite</h3>

          <div className="flex gap-2">
            <button
              onClick={() => onInviteTypeChange(true)}
              className={`flex-1 py-2 px-3 rounded-lg subheading-md transition-colors ${isLinkInvite
                ? 'bg-brand-solid text-primary-onbrand'
                : 'bg-primary text-secondary border border-secondary'
                }`}
            >
              Anyone with link
            </button>
            <button
              onClick={() => onInviteTypeChange(false)}
              className={`flex-1 py-2 px-3 rounded-lg subheading-md transition-colors ${!isLinkInvite
                ? 'bg-brand-solid text-primary-onbrand'
                : 'bg-primary text-secondary border border-secondary'
                }`}
            >
              Specific email
            </button>
          </div>

          {!isLinkInvite && (
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => onInviteEmailChange(event.target.value)}
              placeholder="colleague@company.com"
              className="w-full px-4 py-3 border border-secondary rounded-lg paragraph-sm"
            />
          )}

          <div>
            <label className="block subheading-md text-secondary mb-2">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {['admin', 'analyst', 'viewer'].map((role) => (
                <button
                  key={role}
                  onClick={() => onInviteRoleChange(role)}
                  className={`py-2 px-3 rounded-lg subheading-md capitalize transition-colors ${inviteRole === role
                    ? 'bg-brand-solid text-primary-onbrand'
                    : 'bg-primary text-secondary border border-secondary hover:bg-secondary'
                    }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCancelCreateInvite}
              className="flex-1 py-2 px-4 border border-secondary rounded-lg subheading-md text-secondary hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={onCreateInvite}
              disabled={isCreateInviteDisabled}
              className="flex-1 py-2 px-4 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingInvite ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {createdInviteLink && (
        <div className="bg-success-primary border border-utility-success-300 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Icon.check_circle size={20} className="text-success" />
            <span className="subheading-md text-success">Invite created!</span>
          </div>
          <div className="bg-primary rounded-lg p-3 flex items-center gap-2">
            <input
              type="text"
              value={createdInviteLink}
              readOnly
              className="flex-1 paragraph-sm text-tertiary bg-transparent outline-none"
            />
            <button
              onClick={() => onCopyInvite(createdInviteLink)}
              className="px-3 py-1 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover"
            >
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={onCompleteInviteFlow}
            className="w-full py-2 paragraph-sm text-tertiary hover:text-primary"
          >
            Done
          </button>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="subheading-md text-secondary">Pending Invites</h3>
          {pendingInvites.map((invite) => (
            <div
              key={invite.id}
              className="bg-primary border border-secondary rounded-xl p-3 flex items-center justify-between"
            >
              <div>
                <p className="subheading-md text-primary">{invite.emailLabel}</p>
                <p className="paragraph-xs text-quaternary capitalize">{invite.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCopyInvite(invite.link)}
                  className="p-2 text-quaternary hover:bg-tertiary rounded-lg"
                  title="Copy invite link"
                >
                  <Icon.copy_01 size={16} />
                </button>
                <button
                  onClick={() => onRevokeInvite(invite.id)}
                  className="p-2 text-error hover:bg-error-primary rounded-lg"
                  title="Revoke invite"
                >
                  <Icon.trash_01 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
