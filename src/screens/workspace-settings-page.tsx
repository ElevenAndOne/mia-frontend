import { useState } from 'react'
import { useSession } from '../contexts/session-context'
import { useWorkspaceMembers } from '../features/workspaces/hooks/use-workspace-members'
import { useWorkspaceInvites } from '../features/workspaces/hooks/use-workspace-invites'
import MemberList from '../features/workspaces/components/member-list'
import InviteList from '../features/workspaces/components/invite-list'

interface WorkspaceSettingsPageProps {
  onBack: () => void
}

const WorkspaceSettingsPage = ({ onBack }: WorkspaceSettingsPageProps) => {
  const { activeWorkspace } = useSession()
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members')

  // Use custom hooks for data management
  const {
    members,
    isLoading: membersLoading,
    error: membersError,
    updateRole,
    removeMember
  } = useWorkspaceMembers()

  const {
    invites,
    isLoading: invitesLoading,
    error: invitesError,
    createInvite,
    revokeInvite
  } = useWorkspaceInvites()

  // Check if current user can manage (admin or owner)
  const canManage = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin'

  // Combine errors
  const error = membersError || invitesError
  const loading = activeTab === 'members' ? membersLoading : invitesLoading

  if (!activeWorkspace) {
    return (
      <div className="w-full h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">No workspace selected</p>
      </div>
    )
  }

  return (
    <div
      className="w-full h-screen-dvh bg-white flex flex-col overflow-hidden"
      style={{ fontFamily: 'Figtree, sans-serif', maxWidth: '393px', margin: '0 auto' }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
            {activeWorkspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{activeWorkspace.name}</h1>
            <p className="text-xs text-gray-500 capitalize">Your role: {activeWorkspace.role}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'members'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Members ({members.length})
        </button>
        {canManage && (
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'invites'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Invites ({invites.filter(i => i.status === 'pending').length})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {activeTab === 'members' ? (
          <MemberList
            members={members}
            isLoading={loading}
            onUpdateRole={updateRole}
            onRemoveMember={removeMember}
          />
        ) : (
          <InviteList
            invites={invites}
            isLoading={loading}
            onCreateInvite={createInvite}
            onRevokeInvite={revokeInvite}
          />
        )}
      </div>
    </div>
  )
}

export default WorkspaceSettingsPage
