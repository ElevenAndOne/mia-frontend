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
  createdInviteEmail: string | null
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
  createdInviteEmail,
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
            <div className="flex gap-2" role="group" aria-label="Invite type">
              <button
                type="button"
                onClick={() => onInviteTypeChange(true)}
                aria-pressed={isLinkInvite}
                className={`flex-1 py-2 px-3 rounded-lg subheading-md transition-colors ${
                  isLinkInvite
                    ? 'bg-brand-solid text-primary-onbrand'
                    : 'bg-primary text-secondary border border-secondary'
                }`}
              >
                Anyone with link
              </button>
              <button
                type="button"
                onClick={() => onInviteTypeChange(false)}
                aria-pressed={!isLinkInvite}
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
              <div>
                <label htmlFor="invite-email" className="sr-only">Email address</label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => onInviteEmailChange(event.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-3 border border-secondary rounded-lg paragraph-sm"
                  aria-label="Email address for invite"
                />
              </div>
            )}

            <fieldset>
              <legend className="block subheading-md text-secondary mb-2">Role</legend>
              <div className="grid grid-cols-3 gap-2" role="group">
                {['admin', 'analyst', 'viewer'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onInviteRoleChange(role)}
                    aria-pressed={inviteRole === role}
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
            </fieldset>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2 px-4 border border-secondary rounded-lg subheading-md text-secondary hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
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
              <span className="subheading-md">
                {createdInviteEmail
                  ? `Invite sent to ${createdInviteEmail}!`
                  : 'Invite link created successfully!'}
              </span>
            </div>

            <div className="bg-secondary rounded-lg p-3 flex items-center gap-2">
              <input
                type="text"
                value={createdInviteLink}
                readOnly
                aria-label="Invite link"
                className="flex-1 paragraph-sm text-tertiary bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => onCopyInvite(createdInviteLink)}
                className="px-3 py-1 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover"
              >
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              type="button"
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
