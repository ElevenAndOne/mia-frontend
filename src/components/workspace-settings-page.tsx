import { useState, useEffect } from 'react'
import { useSession } from '../contexts/session-context'
import { apiFetch } from '../utils/api'

interface Member {
  user_id: string
  email: string | null
  name: string | null
  picture_url: string | null
  role: string
  status: string
  joined_at: string | null
}

interface Invite {
  invite_id: string
  email: string | null
  role: string
  status: string
  expires_at: string
  created_at: string | null
  is_link_invite?: boolean
}

interface WorkspaceSettingsPageProps {
  onBack: () => void
}

const WorkspaceSettingsPage = ({ onBack }: WorkspaceSettingsPageProps) => {
  const { activeWorkspace, sessionId, user } = useSession()

  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite creation state
  const [showCreateInvite, setShowCreateInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState<string>('viewer')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isLinkInvite, setIsLinkInvite] = useState(true)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  // Check if current user can manage (admin or owner)
  const canManage = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin'
  const isOwner = activeWorkspace?.role === 'owner'

  // Fetch members and invites
  useEffect(() => {
    const fetchData = async () => {
      if (!activeWorkspace?.tenant_id || !sessionId) return

      try {
        setLoading(true)
        setError(null)

        const [membersRes, invitesRes] = await Promise.all([
          apiFetch(`/api/tenants/${activeWorkspace.tenant_id}/members`, {
            headers: { 'X-Session-ID': sessionId }
          }),
          canManage ? apiFetch(`/api/tenants/${activeWorkspace.tenant_id}/invites`, {
            headers: { 'X-Session-ID': sessionId }
          }) : Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
        ])

        if (membersRes.ok) {
          const membersData = await membersRes.json()
          setMembers(membersData)
        }

        if (invitesRes.ok) {
          const invitesData = await invitesRes.json()
          setInvites(invitesData)
        }
      } catch (err) {
        console.error('[WORKSPACE-SETTINGS] Error fetching data:', err)
        setError('Failed to load workspace data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeWorkspace?.tenant_id, sessionId, canManage])

  const handleCreateInvite = async () => {
    if (!activeWorkspace?.tenant_id || !sessionId) return

    try {
      setCreatingInvite(true)
      setError(null)

      const body: { role: string; email?: string } = { role: inviteRole }
      if (!isLinkInvite && inviteEmail.trim()) {
        body.email = inviteEmail.trim()
      }

      const response = await apiFetch(`/api/tenants/${activeWorkspace.tenant_id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to create invite')
      }

      const invite = await response.json()
      console.log('[WORKSPACE-SETTINGS] Invite created:', invite)

      // Generate invite link
      const inviteLink = `${window.location.origin}/invite/${invite.invite_id}`
      setCreatedInviteLink(inviteLink)

      // Add to invites list
      setInvites(prev => [invite, ...prev])

      // Reset form
      setInviteEmail('')
    } catch (err) {
      console.error('[WORKSPACE-SETTINGS] Error creating invite:', err)
      setError(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setCreatingInvite(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    if (!activeWorkspace?.tenant_id || !sessionId) return
    if (!confirm('Are you sure you want to revoke this invite?')) return

    try {
      const response = await apiFetch(
        `/api/tenants/${activeWorkspace.tenant_id}/invites/${inviteId}`,
        {
          method: 'DELETE',
          headers: { 'X-Session-ID': sessionId }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to revoke invite')
      }

      // Remove from list
      setInvites(prev => prev.filter(i => i.invite_id !== inviteId))
    } catch (err) {
      console.error('[WORKSPACE-SETTINGS] Error revoking invite:', err)
      setError('Failed to revoke invite')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!activeWorkspace?.tenant_id || !sessionId) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await apiFetch(
        `/api/tenants/${activeWorkspace.tenant_id}/members/${userId}`,
        {
          method: 'DELETE',
          headers: { 'X-Session-ID': sessionId }
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to remove member')
      }

      // Remove from list
      setMembers(prev => prev.filter(m => m.user_id !== userId))
    } catch (err) {
      console.error('[WORKSPACE-SETTINGS] Error removing member:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!activeWorkspace?.tenant_id || !sessionId) return

    try {
      const response = await apiFetch(
        `/api/tenants/${activeWorkspace.tenant_id}/members/${userId}/role`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId
          },
          body: JSON.stringify({ role: newRole })
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to update role')
      }

      // Update in list
      setMembers(prev => prev.map(m =>
        m.user_id === userId ? { ...m, role: newRole } : m
      ))
    } catch (err) {
      console.error('[WORKSPACE-SETTINGS] Error updating role:', err)
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <span className="text-yellow-500" title="Owner">&#9733;</span>
      case 'admin':
        return <span className="text-blue-500" title="Admin">&#128737;</span>
      case 'analyst':
        return <span className="text-green-500" title="Analyst">&#128200;</span>
      default:
        return <span className="text-amber-500" title="Viewer">&#128065;</span>
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'analyst': return 'bg-green-100 text-green-800'
      default: return 'bg-amber-100 text-amber-800'
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="w-full h-screen-dvh bg-white flex items-center justify-center">
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
      <div className="px-4 py-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : activeTab === 'members' ? (
          /* Members Tab */
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
                      onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      <option value="admin">Admin</option>
                      <option value="analyst">Analyst</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}
                  {/* Remove button - only for admins/owners, can't remove self or owner */}
                  {canManage && member.role !== 'owner' && member.user_id !== user?.google_user_id && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Remove member"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Invites Tab */
          <div className="space-y-4">
            {/* Create Invite Button */}
            {!showCreateInvite && !createdInviteLink && (
              <button
                onClick={() => setShowCreateInvite(true)}
                className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Invite Link
              </button>
            )}

            {/* Create Invite Form */}
            {showCreateInvite && !createdInviteLink && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h3 className="font-semibold text-gray-900">Create Invite</h3>

                {/* Invite Type Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsLinkInvite(true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      isLinkInvite
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Anyone with link
                  </button>
                  <button
                    onClick={() => setIsLinkInvite(false)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      !isLinkInvite
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Specific email
                  </button>
                </div>

                {/* Email input (only for email invites) */}
                {!isLinkInvite && (
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm"
                  />
                )}

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['admin', 'analyst', 'viewer'].map(role => (
                      <button
                        key={role}
                        onClick={() => setInviteRole(role)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors ${
                          inviteRole === role
                            ? getRoleBadgeColor(role)
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateInvite(false)
                      setInviteEmail('')
                    }}
                    className="flex-1 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateInvite}
                    disabled={creatingInvite || (!isLinkInvite && !inviteEmail.trim())}
                    className="flex-1 py-2 px-4 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingInvite ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            )}

            {/* Created Invite Link */}
            {createdInviteLink && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-green-800">Invite created!</span>
                </div>
                <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={createdInviteLink}
                    readOnly
                    className="flex-1 text-sm text-gray-600 bg-transparent outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(createdInviteLink)}
                    className="px-3 py-1 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                  >
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setCreatedInviteLink(null)
                    setShowCreateInvite(false)
                  }}
                  className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Done
                </button>
              </div>
            )}

            {/* Pending Invites List */}
            {invites.filter(i => i.status === 'pending').length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Pending Invites</h3>
                {invites
                  .filter(i => i.status === 'pending')
                  .map(invite => (
                    <div
                      key={invite.invite_id}
                      className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {invite.email || 'Anyone with link'}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{invite.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/invite/${invite.invite_id}`)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Copy invite link"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(invite.invite_id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Revoke invite"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkspaceSettingsPage
