import { useExperience } from '../hooks/use-experience'
import { Mail01 } from '../../../components/icon/mail-01'
import { UserAvatar } from '../../../components/user-avatar'
import { WorkspaceRoleIcon } from './workspace-role-icon'
import { MemberRowMenu } from './member-row-menu'
import type { WorkspacePersonRow } from '../utils/workspace-settings'
import { getRoleLabel } from '../utils/role'

interface WorkspaceMembersPanelProps {
  people: WorkspacePersonRow[]
  onUpdateRole: (userId: string, role: string) => void
  onTransferOwnership: (userId: string) => void
  onRemoveMember: (userId: string) => void
  onCopyInvite: (link: string) => void
  onRevokeInvite: (inviteId: string) => void
}

export const WorkspaceMembersPanel = ({
  people,
  onUpdateRole,
  onTransferOwnership,
  onRemoveMember,
  onCopyInvite,
  onRevokeInvite,
}: WorkspaceMembersPanelProps) => {
  const { isBasic } = useExperience()
  if (people.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="paragraph-sm text-quaternary">No members yet</p>
      </div>
    )
  }

  if (!isBasic) {
    // Agency (19 Nov 2026): a plain list, role as text in one right-hand column that lines up
    // whether or not the row has a menu (you and the owner have none). No role icons.
    return (
      <ul className="flex flex-col divide-y divide-secondary">
        {people.map((person) => (
          <li key={person.id} className="flex items-center gap-3 py-2.5">
            {person.type === 'member' ? (
              <UserAvatar name={person.name} imageUrl={person.imageUrl} size="sm" fallbackClassName="bg-quaternary text-tertiary" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-quaternary flex items-center justify-center shrink-0">
                <Mail01 size={16} className="text-tertiary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="paragraph-sm text-primary truncate">{person.name}</p>
              <p className="paragraph-xs text-quaternary truncate">
                {person.type === 'member' ? person.email : 'Invite waiting'}
              </p>
            </div>
            {/* The role's colour kept (Josh, 19 Nov), in one column that lines up for everyone. */}
            <span className="w-20 flex justify-end shrink-0">
              <span className={`px-2 py-0.5 rounded-full label-xs ${person.roleBadgeClass}`}>{getRoleLabel(person.role, false)}</span>
            </span>
            <span className="w-8 flex justify-end shrink-0">
              <MemberRowMenu
                hideAnalyst={false}
                person={person}
                onUpdateRole={onUpdateRole}
                onTransferOwnership={onTransferOwnership}
                onRemoveMember={onRemoveMember}
                onCopyInvite={onCopyInvite}
                onRevokeInvite={onRevokeInvite}
              />
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-3">
      {people.map((person) => (
        <div key={person.id} className="bg-secondary rounded-xl p-4 flex items-center gap-3">
          {person.type === 'member' ? (
            <UserAvatar
              name={person.name}
              imageUrl={person.imageUrl}
              size="md"
              fallbackClassName="bg-quaternary text-tertiary"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center">
              <Mail01 size={20} className="text-tertiary" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="subheading-md text-primary truncate">{person.name}</p>
              {person.type === 'member' && <WorkspaceRoleIcon role={person.role} />}
              {person.type === 'invite' && (
                <span className="px-2 py-0.5 rounded-full label-xs bg-warning-secondary text-warning">
                  Pending
                </span>
              )}
            </div>
            <p className="paragraph-xs text-quaternary truncate">
              {person.type === 'member'
                ? person.email
                : `Invited · ${getRoleLabel(person.role, isBasic).toLowerCase()}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {person.type === 'member' && (
              <span className={`px-2 py-1 rounded-full label-xs ${person.roleBadgeClass}`}>
                {getRoleLabel(person.role, isBasic)}
              </span>
            )}
            <MemberRowMenu
              hideAnalyst={isBasic}
              person={person}
              onUpdateRole={onUpdateRole}
              onTransferOwnership={onTransferOwnership}
              onRemoveMember={onRemoveMember}
              onCopyInvite={onCopyInvite}
              onRevokeInvite={onRevokeInvite}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
