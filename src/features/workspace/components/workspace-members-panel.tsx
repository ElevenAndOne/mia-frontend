import { Icon } from '../../../components/icon'
import { UserAvatar } from '../../../components/user-avatar'
import { WorkspaceRoleIcon } from './workspace-role-icon'
import { MemberRowMenu } from './member-row-menu'
import type { WorkspacePersonRow } from '../utils/workspace-settings'

interface WorkspaceMembersPanelProps {
  people: WorkspacePersonRow[]
  onUpdateRole: (userId: string, role: string) => void
  onRemoveMember: (userId: string) => void
  onCopyInvite: (link: string) => void
  onRevokeInvite: (inviteId: string) => void
}

export const WorkspaceMembersPanel = ({
  people,
  onUpdateRole,
  onRemoveMember,
  onCopyInvite,
  onRevokeInvite,
}: WorkspaceMembersPanelProps) => {
  if (people.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="paragraph-sm text-quaternary">No members yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {people.map((person) => (
        <div
          key={person.id}
          className="bg-secondary rounded-xl p-4 flex items-center gap-3"
        >
          {person.type === 'member' ? (
            <UserAvatar
              name={person.name}
              imageUrl={person.imageUrl}
              size="md"
              fallbackClassName="bg-quaternary text-tertiary"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center">
              <Icon.mail_01 size={20} className="text-tertiary" />
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
              {person.type === 'member' ? person.email : `Invited as ${person.role}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {person.type === 'member' && (
              <span className={`px-2 py-1 rounded-full label-xs ${person.roleBadgeClass}`}>
                {person.role}
              </span>
            )}
            <MemberRowMenu
              person={person}
              onUpdateRole={onUpdateRole}
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
