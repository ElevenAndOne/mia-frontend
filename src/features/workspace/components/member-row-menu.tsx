import { useRef, useState, useMemo } from 'react'
import { Check } from '../../../components/icon/check'
import { Copy01 } from '../../../components/icon/copy-01'
import { DotsVertical } from '../../../components/icon/dots-vertical'
import { Key01 } from '../../../components/icon/key-01'
import { Trash01 } from '../../../components/icon/trash-01'
import { UserEdit } from '../../../components/icon/user-edit'
import { Dropdown, Modal } from '../../overlay'
import type { DropdownItem } from '../../overlay/types'
import type { WorkspacePersonRow } from '../utils/workspace-settings'

interface MemberRowMenuProps {
  person: WorkspacePersonRow
  onUpdateRole: (userId: string, role: string) => void
  onTransferOwnership: (userId: string) => void
  onRemoveMember: (userId: string) => void
  onCopyInvite: (link: string) => void
  onRevokeInvite: (inviteId: string) => void
}

export const MemberRowMenu = ({
  person,
  onUpdateRole,
  onTransferOwnership,
  onRemoveMember,
  onCopyInvite,
  onRevokeInvite,
}: MemberRowMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showConfirmRemove, setShowConfirmRemove] = useState(false)
  const [showConfirmTransfer, setShowConfirmTransfer] = useState(false)
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const roleButtonRef = useRef<HTMLButtonElement>(null)

  const handleTransferConfirm = () => {
    onTransferOwnership(person.id)
    setShowConfirmTransfer(false)
  }

  const handleRemoveConfirm = () => {
    onRemoveMember(person.id)
    setShowConfirmRemove(false)
  }

  const handleRevokeConfirm = () => {
    onRevokeInvite(person.id)
    setShowConfirmRevoke(false)
  }

  const memberItems: DropdownItem[] = useMemo(() => {
    const items: DropdownItem[] = []

    if (person.canEditRole) {
      items.push({
        id: 'change-role',
        label: 'Change Role',
        icon: <UserEdit size={16} />,
        onClick: () => {
          setIsOpen(false)
          setTimeout(() => setShowRoleMenu(true), 100)
        },
      })
    }

    if (person.canTransferOwnership) {
      if (items.length > 0) {
        items.push({ id: 'divider-transfer', label: '', onClick: () => {}, divider: true })
      }
      items.push({
        id: 'transfer-ownership',
        label: 'Transfer Ownership',
        icon: <Key01 size={16} />,
        onClick: () => {
          setIsOpen(false)
          setTimeout(() => setShowConfirmTransfer(true), 100)
        },
      })
    }

    if (person.canRemove) {
      if (items.length > 0) {
        items.push({ id: 'divider', label: '', onClick: () => {}, divider: true })
      }
      items.push({
        id: 'remove',
        label: 'Remove Member',
        icon: <Trash01 size={16} />,
        onClick: () => {
          setIsOpen(false)
          setShowConfirmRemove(true)
        },
        destructive: true,
      })
    }

    return items
  }, [person.canEditRole, person.canRemove, person.canTransferOwnership])

  const inviteItems: DropdownItem[] = useMemo(
    () => [
      {
        id: 'copy-link',
        label: 'Copy Invite Link',
        icon: <Copy01 size={16} />,
        onClick: () => {
          if (person.inviteLink) {
            onCopyInvite(person.inviteLink)
          }
          setIsOpen(false)
        },
      },
      { id: 'divider', label: '', onClick: () => {}, divider: true },
      {
        id: 'revoke',
        label: 'Revoke Invite',
        icon: <Trash01 size={16} />,
        onClick: () => {
          setIsOpen(false)
          setShowConfirmRevoke(true)
        },
        destructive: true,
      },
    ],
    [person.inviteLink, onCopyInvite]
  )

  const roleItems: DropdownItem[] = useMemo(
    () => [
      {
        id: 'admin',
        label: 'Admin',
        onClick: () => {
          onUpdateRole(person.id, 'admin')
          setShowRoleMenu(false)
        },
        icon: person.role === 'admin' ? <Check size={16} /> : undefined,
      },
      {
        id: 'analyst',
        label: 'Analyst',
        onClick: () => {
          onUpdateRole(person.id, 'analyst')
          setShowRoleMenu(false)
        },
        icon: person.role === 'analyst' ? <Check size={16} /> : undefined,
      },
      {
        id: 'viewer',
        label: 'Viewer',
        onClick: () => {
          onUpdateRole(person.id, 'viewer')
          setShowRoleMenu(false)
        },
        icon: person.role === 'viewer' ? <Check size={16} /> : undefined,
      },
    ],
    [person.id, person.role, onUpdateRole]
  )

  const items = person.type === 'member' ? memberItems : inviteItems

  if (items.length === 0) return null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1 text-quaternary hover:text-primary hover:bg-tertiary rounded transition-colors"
        title="More options"
      >
        <DotsVertical size={20} />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={buttonRef}
        items={items}
        placement="bottom-end"
      />

      {/* Role selection dropdown - shows after clicking "Change Role" */}
      <button ref={roleButtonRef} className="hidden" />
      <Dropdown
        isOpen={showRoleMenu}
        onClose={() => setShowRoleMenu(false)}
        anchorRef={buttonRef}
        items={roleItems}
        placement="bottom-end"
      />

      {/* Confirm Transfer Ownership Modal */}
      <Modal
        isOpen={showConfirmTransfer}
        onClose={() => setShowConfirmTransfer(false)}
        size="sm"
        showCloseButton={false}
        panelClassName="p-6"
      >
        <h3 className="label-lg text-primary mb-2">Make {person.name} the owner?</h3>
        <p className="paragraph-sm text-tertiary mb-4">
          {person.name} will take full control of this workspace, including billing-level
          settings and the ability to delete it. You will become an <strong>admin</strong> — you
          keep working access, but you will no longer be able to transfer ownership back
          yourself. Only the new owner can do that.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirmTransfer(false)}
            className="flex-1 px-4 py-2 border border-primary rounded-lg subheading-md text-secondary hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleTransferConfirm}
            className="flex-1 px-4 py-2 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover"
          >
            Transfer
          </button>
        </div>
      </Modal>

      {/* Confirm Remove Member Modal */}
      <Modal
        isOpen={showConfirmRemove}
        onClose={() => setShowConfirmRemove(false)}
        size="sm"
        showCloseButton={false}
        panelClassName="p-6"
      >
        <h3 className="label-lg text-primary mb-2">Remove Member?</h3>
        <p className="paragraph-sm text-tertiary mb-4">
          Are you sure you want to remove {person.name} from this workspace? They will lose access
          immediately.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirmRemove(false)}
            className="flex-1 px-4 py-2 border border-primary rounded-lg subheading-md text-secondary hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleRemoveConfirm}
            className="flex-1 px-4 py-2 bg-error-solid text-primary-onbrand rounded-lg subheading-md hover:bg-error-solid-hover"
          >
            Remove
          </button>
        </div>
      </Modal>

      {/* Confirm Revoke Invite Modal */}
      <Modal
        isOpen={showConfirmRevoke}
        onClose={() => setShowConfirmRevoke(false)}
        size="sm"
        showCloseButton={false}
        panelClassName="p-6"
      >
        <h3 className="label-lg text-primary mb-2">Revoke Invite?</h3>
        <p className="paragraph-sm text-tertiary mb-4">
          Are you sure you want to revoke this invite? The link will no longer work.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirmRevoke(false)}
            className="flex-1 px-4 py-2 border border-primary rounded-lg subheading-md text-secondary hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleRevokeConfirm}
            className="flex-1 px-4 py-2 bg-error-solid text-primary-onbrand rounded-lg subheading-md hover:bg-error-solid-hover"
          >
            Revoke
          </button>
        </div>
      </Modal>
    </>
  )
}
