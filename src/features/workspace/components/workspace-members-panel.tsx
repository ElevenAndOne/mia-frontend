import { Icon } from '../../../components/icon'
import { UserAvatar } from '../../../components/user-avatar'
import { WorkspaceRoleIcon } from './workspace-role-icon'
import type { WorkspaceMemberRow } from '../utils/workspace-settings'

interface WorkspaceMembersPanelProps {
  members: WorkspaceMemberRow[]
  onUpdateRole: (userId: string, role: string) => void
  onRemoveMember: (userId: string) => void
}

export const WorkspaceMembersPanel = ({
  members,
  onUpdateRole,
  onRemoveMember,
}: WorkspaceMembersPanelProps) => {
  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div
          key={member.id}
          className="bg-secondary rounded-xl p-4 flex items-center gap-3"
        >
          <UserAvatar
            name={member.name}
            imageUrl={member.imageUrl}
            size="md"
            fallbackClassName="bg-quaternary text-tertiary"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="subheading-md text-primary truncate">
                {member.name}
              </p>
              <WorkspaceRoleIcon role={member.role} />
            </div>
            <p className="paragraph-xs text-quaternary truncate">{member.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full label-xs ${member.roleBadgeClass}`}>
              {member.role}
            </span>
            {member.canEditRole && (
              <select
                value={member.role}
                onChange={(event) => onUpdateRole(member.id, event.target.value)}
                className="paragraph-xs border border-secondary rounded px-2 py-1"
              >
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            )}
            {member.canRemove && (
              <button
                onClick={() => onRemoveMember(member.id)}
                className="p-1 text-error hover:bg-error-primary rounded"
                title="Remove member"
              >
                <Icon.x_close size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
