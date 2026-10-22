import { useEffect, useMemo, useState } from 'react'
import { addStaff } from '../services/staff-service'
import { CheckCircle } from '../../../components/icon/check-circle'
import { Modal } from '../../overlay'
import { getRoleDescription } from '../utils/role'

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
  /** Only an owner may grant admin, and never via a shareable link (backend enforces both). */
  canInviteAdmins: boolean
  /** A Basic workspace: invites by email only, and the roles are admin or viewer (29 Sep 2026). */
  isBasic?: boolean
  onInviteTypeChange: (isLinkInvite: boolean) => void
  onInviteEmailChange: (value: string) => void
  onInviteRoleChange: (role: string) => void
  onCreateInvite: () => void
  onCopyInvite: (inviteLink: string) => void
  onComplete: () => void
  /** Staff on WhatsApp is on for this workspace: they can also be invited by WhatsApp number,
   *  with no login (22 Oct 2026: one Invite button for both ways, instead of two places). */
  whatsapp?: { sessionId: string; tenantId: string } | null
}

const ROLES_WITH_ADMIN = ['admin', 'analyst', 'viewer']
const ROLES_WITHOUT_ADMIN = ['analyst', 'viewer']

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
  canInviteAdmins,
  isBasic = false,
  onInviteTypeChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateInvite,
  onCopyInvite,
  onComplete,
  whatsapp = null,
}: CreateInviteModalProps) => {
  // WhatsApp number (no login: they send photos and ideas on WhatsApp) or email (they sign in to
  // the app). Basic starts on WhatsApp, the way most of its teams work.
  const [viaWhatsApp, setViaWhatsApp] = useState<boolean>(!!whatsapp && isBasic)
  const [waName, setWaName] = useState('')
  const [waNumber, setWaNumber] = useState('')
  const [waDriveEmail, setWaDriveEmail] = useState('')
  const [waBusy, setWaBusy] = useState(false)
  const [waError, setWaError] = useState<string | null>(null)
  const [waDone, setWaDone] = useState<string | null>(null)
  const byWhatsApp = !!whatsapp && viaWhatsApp
  const sendWhatsApp = async () => {
    if (!whatsapp) return
    setWaBusy(true)
    setWaError(null)
    try {
      const res = await addStaff(whatsapp.sessionId, whatsapp.tenantId, {
        name: waName.trim(),
        whatsapp_number: waNumber.trim(),
        role: inviteRole === 'admin' ? 'admin' : 'viewer',
        ...(waDriveEmail.trim() ? { drive_email: waDriveEmail.trim() } : {}),
      })
      setWaDone(res.message)
      window.dispatchEvent(new Event('mia:staff-changed'))
    } catch (err) {
      setWaError(err instanceof Error ? err.message : 'Could not invite them')
    } finally {
      setWaBusy(false)
    }
  }
  const closeWhatsApp = () => {
    setWaDone(null)
    setWaName('')
    setWaNumber('')
    setWaDriveEmail('')
    onComplete()
    onClose()
  }
  // Admin can only be granted by an owner, and never on a shareable link — a link
  // invite skips the email check when redeemed, so an admin link would hand workspace
  // control to whoever the URL reached. The backend rejects both; this keeps the option
  // from being offered in the first place.
  const simpleRoles = isBasic || (!!whatsapp && viaWhatsApp)
  const availableRoles = useMemo(
    () =>
      simpleRoles
        ? canInviteAdmins
          ? ['admin', 'viewer']
          : ['viewer']
        : canInviteAdmins && !isLinkInvite
          ? ROLES_WITH_ADMIN
          : ROLES_WITHOUT_ADMIN,
    [simpleRoles, canInviteAdmins, isLinkInvite],
  )
  // Basic never offers a shareable link; a stale link mode from state is switched off.
  useEffect(() => {
    if (isBasic && isLinkInvite) onInviteTypeChange(false)
  }, [isBasic, isLinkInvite, onInviteTypeChange])

  // Switching to a link invite while 'admin' is selected would submit a role the
  // backend refuses — fall back to viewer instead of surfacing an avoidable error.
  useEffect(() => {
    if (!availableRoles.includes(inviteRole)) {
      onInviteRoleChange('viewer')
    }
  }, [availableRoles, inviteRole, onInviteRoleChange])

  const handleClose = () => {
    if (waDone) return closeWhatsApp()
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
        {whatsapp && !createdInviteLink && !waDone && (
          <div className="flex gap-2" role="group" aria-label="How they join">
            {[
              { v: true, label: 'WhatsApp number' },
              { v: false, label: 'Email' },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setViaWhatsApp(o.v)}
                aria-pressed={viaWhatsApp === o.v}
                className={`flex-1 py-2 px-3 rounded-lg subheading-md transition-colors ${
                  viaWhatsApp === o.v ? 'bg-brand-solid text-primary-onbrand' : 'bg-primary text-secondary border border-secondary'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        {byWhatsApp && waDone ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle size={20} />
              <span className="subheading-md">{waDone}</span>
            </div>
            <p className="paragraph-sm text-tertiary">
              They get a WhatsApp invite and tap Yes to join. After that they can send Mia photos and ideas any time.
            </p>
            <button
              type="button"
              onClick={closeWhatsApp}
              className="w-full py-2 px-4 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover"
            >
              Done
            </button>
          </div>
        ) : byWhatsApp ? (
          <>
            <p className="paragraph-sm text-tertiary">
              No login needed. They send Mia photos and ideas on WhatsApp, and you approve what goes out. You can also add
              someone by sending Mia their contact card, or typing “add [name] [number]” on WhatsApp.
            </p>
            <input
              id="invite-wa-name"
              value={waName}
              onChange={(e) => setWaName(e.target.value)}
              placeholder="Their first name"
              className="w-full px-4 py-3 border border-secondary rounded-lg paragraph-sm"
            />
            <input
              id="invite-wa-number"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              placeholder="WhatsApp number, e.g. 082 123 4567"
              inputMode="tel"
              className="w-full px-4 py-3 border border-secondary rounded-lg paragraph-sm"
            />
            <div>
              <input
                id="invite-wa-drive-email"
                type="email"
                value={waDriveEmail}
                onChange={(e) => setWaDriveEmail(e.target.value)}
                placeholder="Their Google email (optional)"
                className="w-full px-4 py-3 border border-secondary rounded-lg paragraph-sm"
              />
              <p className="paragraph-xs text-quaternary mt-1">
                If they’ll add pictures to your Mia folder in Google Drive, so Mia knows which ones are theirs. Leave it empty
                and Mia asks them on WhatsApp.
              </p>
            </div>
            <fieldset>
              <legend className="block subheading-md text-secondary mb-2">What can they do?</legend>
              <div className="grid gap-2 grid-cols-1" role="group">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onInviteRoleChange(role)}
                    aria-pressed={inviteRole === role}
                    className={`py-2 px-3 rounded-lg subheading-md transition-colors text-left ${
                      inviteRole === role
                        ? 'bg-brand-solid text-primary-onbrand'
                        : 'bg-primary text-secondary border border-secondary hover:bg-secondary'
                    }`}
                  >
                    {getRoleDescription(role, true)}
                  </button>
                ))}
              </div>
            </fieldset>
            {waError && <p className="paragraph-xs text-error">{waError}</p>}
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
                onClick={() => void sendWhatsApp()}
                disabled={waBusy || !waName.trim() || !waNumber.trim()}
                className="flex-1 py-2 px-4 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {waBusy ? 'Inviting…' : 'Invite on WhatsApp'}
              </button>
            </div>
          </>
        ) : !createdInviteLink ? (
          <>
            <div className={`flex gap-2 ${isBasic ? 'hidden' : ''}`} role="group" aria-label="Invite type">
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
                <label htmlFor="invite-email" className="sr-only">
                  Email address
                </label>
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
              <legend className="block subheading-md text-secondary mb-2">
                {isBasic ? 'What can they do?' : 'Role'}
              </legend>
              <div
                className={`grid gap-2 ${
                  isBasic ? 'grid-cols-1' : availableRoles.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                }`}
                role="group"
              >
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onInviteRoleChange(role)}
                    aria-pressed={inviteRole === role}
                    className={`py-2 px-3 rounded-lg subheading-md transition-colors ${
                      isBasic ? 'text-left' : 'capitalize'
                    } ${
                      inviteRole === role
                        ? 'bg-brand-solid text-primary-onbrand'
                        : 'bg-primary text-secondary border border-secondary hover:bg-secondary'
                    }`}
                  >
                    {isBasic ? getRoleDescription(role, true) : role}
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
              <CheckCircle size={20} />
              <span className="subheading-md">
                {createdInviteEmail
                  ? `Invite sent to ${createdInviteEmail}!`
                  : isLinkInvite
                    ? 'Invite link created successfully!'
                    : 'Invite created'}
              </span>
            </div>
            {/* The email didn't go (no mail provider, or it failed): say so, instead of a
                success line that makes them wait for an email that never arrives. */}
            {!createdInviteEmail && !isLinkInvite && (
              <p className="paragraph-sm text-tertiary">
                We couldn't email the invite. Copy the link below and send it to them yourself,
                on WhatsApp or anywhere else. They sign in with Facebook or Google using{' '}
                {inviteEmail ? <span className="font-semibold">{inviteEmail}</span> : 'the invited email'}.
              </p>
            )}

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
