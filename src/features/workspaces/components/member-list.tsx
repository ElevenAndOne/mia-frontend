import { Member } from '../hooks/use-workspace-members'
import { useSession } from '../../../contexts/session-context-shim'
import { IconButton } from '@/components/ui'

interface MemberListProps {
  members: Member[]
  isLoading: boolean
  onUpdateRole: (userId: string, newRole: string) => void
  onRemoveMember: (userId: string) => void
}

const MemberList = ({ members, isLoading, onUpdateRole, onRemoveMember }: MemberListProps) => {
  const { activeWorkspace, user } = useSession()

  const canManage = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin'
  const isOwner = activeWorkspace?.role === 'owner'

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <span className="text-yellow-500" title="Owner">&#9733;</span>
      case 'admin':
        return <span className="text-blue-500" title="Admin">&#128737;</span>
      case 'analyst':
        return <span className="text-green-500" title="Analyst">&#128200;</span>
      default:
        return <span className="text-gray-400" title="Viewer">&#128065;</span>
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'analyst': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {members.map(member => (
        <div
          key={member.user_id}
          className="bg-gray-50 rounded-xl p-4 flex items-center gap-3"
        >
          {member.picture_url ? (
            <img src={member.picture_url} alt="" className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {member.name?.charAt(0) || member.email?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 truncate">
                {member.name || member.email || 'Unknown'}
              </p>
              {getRoleIcon(member.role)}
            </div>
            <p className="text-xs text-gray-500 truncate">{member.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
              {member.role}
            </span>
            {/* Role change dropdown - only for owners, and can't change own role or other owners */}
            {isOwner && member.role !== 'owner' && member.user_id !== user?.google_user_id && (
              <select
                value={member.role}
                onChange={(e) => onUpdateRole(member.user_id, e.target.value)}
                className="text-xs border border-gray-200 rounded-sm px-2 py-1"
              >
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            )}
            {/* Remove button - only for admins/owners, can't remove self or owner */}
            {canManage && member.role !== 'owner' && member.user_id !== user?.google_user_id && (
              <IconButton
                onClick={() => onRemoveMember(member.user_id)}
                variant="danger"
                size="sm"
                aria-label="Remove member"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MemberList
