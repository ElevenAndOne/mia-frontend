import { Icon } from '../../../components/icon'
import { Modal } from '../../overlay'

interface CreateInviteModalProps {
  isOpen: boolean
  onClose: () => void
  inviteRole: string
  inviteEmail: string
  isLinkInvite: boolean
  creatingInvite: boolean
  createdInviteLink: string | null
  copySuccess: boolean
  isCreateInviteDisabled: boolean
  onInviteTypeChange: (isLinkInvite: boolean) => void
  onInviteEmailChange: (value: string) => void
  onInviteRoleChange: (role: string) => void
  onCreateInvite: () => void
  onCopyInvite: (inviteLink: string) => void
  onComplete: () => void
}

export const CreateInviteModal = ({
  isOpen,
  onClose,
  inviteRole,
  inviteEmail,
  isLinkInvite,
  creatingInvite,
  createdInviteLink,
  copySuccess,
  isCreateInviteDisabled,
  onInviteTypeChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateInvite,
  onCopyInvite,
  onComplete,
}: CreateInviteModalProps) => {
  const handleClose = () => {
    if (createdInviteLink) {
      onComplete()
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdInviteLink ? 'Invite Created' : 'Invite Member'}
      size="md"
    >
      <div className="p-6 space-y-4">
        {!createdInviteLink ? (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => onInviteTypeChange(true)}
                className={`flex-1 py-2 px-3 rounded-lg subheading-md transition-colors ${
                  isLinkInvite
                    ? 'bg-brand-solid text-primary-onbrand'
                    : 'bg-primary text-secondary border border-secondary'
                }`}
              >
                Anyone with link
              </button>
              <button
                onClick={() => onInviteTypeChange(false)}
                className={`flex-1 py-2 px-3 rounded-lg subheading-md transition-colors ${
                  !isLinkInvite
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
                    className={`py-2 px-3 rounded-lg subheading-md capitalize transition-colors ${
                      inviteRole === role
                        ? 'bg-brand-solid text-primary-onbrand'
                        : 'bg-primary text-secondary border border-secondary hover:bg-secondary'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2 px-4 border border-secondary rounded-lg subheading-md text-secondary hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={onCreateInvite}
                disabled={isCreateInviteDisabled}
                className="flex-1 py-2 px-4 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingInvite ? 'Creating...' : 'Create Invite'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <Icon.check_circle size={20} />
              <span className="subheading-md">Invite link created successfully!</span>
            </div>

            <div className="bg-secondary rounded-lg p-3 flex items-center gap-2">
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
              onClick={handleClose}
              className="w-full py-2 px-4 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
