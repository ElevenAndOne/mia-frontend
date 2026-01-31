import { useState, useEffect } from 'react'
import { useSession } from '../contexts/session-context'
import { apiFetch } from '../utils/api'
import CreateWorkspaceModal from './create-workspace-modal'
import { BackButton } from './back-button'
import { Spinner } from './spinner'
import { Icon } from './icon'
import type { Workspace } from '../features/workspace/types'

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
  const { activeWorkspace, availableWorkspaces, sessionId, user, refreshWorkspaces } = useSession()

  // View state - null = overview, string = detail view for specific workspace
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invite creation state
  const [showCreateInvite, setShowCreateInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState<string>('viewer')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isLinkInvite, setIsLinkInvite] = useState(true)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  // Get the selected workspace from availableWorkspaces
  const selectedWorkspace = selectedWorkspaceId
    ? availableWorkspaces.find(w => w.tenant_id === selectedWorkspaceId)
    : null

  // Check if current user can manage the selected workspace
  const canManage = selectedWorkspace?.role === 'owner' || selectedWorkspace?.role === 'admin'
  const isOwner = selectedWorkspace?.role === 'owner'

  // Fetch members and invites when a workspace is selected
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedWorkspaceId || !sessionId) return

      try {
        setLoading(true)
        setError(null)

        const [membersRes, invitesRes] = await Promise.all([
          apiFetch(`/api/tenants/${selectedWorkspaceId}/members`, {
            headers: { 'X-Session-ID': sessionId }
          }),
          canManage ? apiFetch(`/api/tenants/${selectedWorkspaceId}/invites`, {
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
  }, [selectedWorkspaceId, sessionId, canManage])

  const handleCreateInvite = async () => {
    if (!selectedWorkspaceId || !sessionId) return

    try {
      setCreatingInvite(true)
      setError(null)

      const body: { role: string; email?: string } = { role: inviteRole }
      if (!isLinkInvite && inviteEmail.trim()) {
        body.email = inviteEmail.trim()
      }

      const response = await apiFetch(`/api/tenants/${selectedWorkspaceId}/invites`, {
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
    if (!selectedWorkspaceId || !sessionId) return
    if (!confirm('Are you sure you want to revoke this invite?')) return

    try {
      const response = await apiFetch(
        `/api/tenants/${selectedWorkspaceId}/invites/${inviteId}`,
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
    if (!selectedWorkspaceId || !sessionId) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await apiFetch(
        `/api/tenants/${selectedWorkspaceId}/members/${userId}`,
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
    if (!selectedWorkspaceId || !sessionId) return

    try {
      const response = await apiFetch(
        `/api/tenants/${selectedWorkspaceId}/members/${userId}/role`,
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

  const handleWorkspaceCreated = async () => {
    setShowCreateModal(false)
    await refreshWorkspaces()
  }

  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspaceId(workspace.tenant_id)
    setActiveTab('members')
    setMembers([])
    setInvites([])
    setShowCreateInvite(false)
    setCreatedInviteLink(null)
    setError(null)
  }

  const handleBackToOverview = () => {
    setSelectedWorkspaceId(null)
    setMembers([])
    setInvites([])
    setError(null)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <span className="text-warning" title="Owner">&#9733;</span>
      case 'admin':
        return <span className="text-utility-info-500" title="Admin">&#128737;</span>
      case 'analyst':
        return <span className="text-success" title="Analyst">&#128200;</span>
      default:
        return <span className="text-warning" title="Viewer">&#128065;</span>
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-utility-warning-100 text-utility-warning-700'
      case 'admin': return 'bg-utility-info-100 text-utility-info-700'
      case 'analyst': return 'bg-utility-success-100 text-utility-success-700'
      default: return 'bg-utility-warning-100 text-utility-warning-700'
    }
  }

  // Overview view - show all workspaces
  if (!selectedWorkspaceId) {
    return (
      <div className="w-full h-screen-dvh bg-primary flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-tertiary shrink-0">
          <BackButton onClick={onBack} label="Back" />
          <h1 className="title-h6 text-primary mt-2">Workspaces</h1>
          <p className="paragraph-sm text-quaternary">{availableWorkspaces.length} workspace{availableWorkspaces.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Workspace List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl mx-auto w-full">
          <div className="space-y-3">
            {availableWorkspaces.map((workspace) => {
              const isActive = workspace.tenant_id === activeWorkspace?.tenant_id
              const canManageWorkspace = workspace.role === 'owner' || workspace.role === 'admin'

              return (
                <button
                  key={workspace.tenant_id}
                  onClick={() => handleSelectWorkspace(workspace)}
                  className={`w-full text-left rounded-xl p-4 flex items-center gap-3 transition-colors ${
                    isActive
                      ? 'bg-secondary border border-secondary'
                      : 'bg-secondary hover:bg-tertiary'
                  }`}
                >
                  {/* Workspace Icon */}
                  <div className="w-10 h-10 rounded-xl bg-brand-solid flex items-center justify-center label-bg text-primary-onbrand shrink-0">
                    {workspace.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Workspace Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="label-md text-primary truncate">{workspace.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full label-xs bg-secondary text-white">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 paragraph-xs text-quaternary mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded ${getRoleBadgeColor(workspace.role)}`}>
                        {workspace.role}
                      </span>
                      <span>·</span>
                      <span>{workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}</span>
                      {!canManageWorkspace && (
                        <>
                          <span>·</span>
                          <span className="text-placeholder-subtle">View only</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <Icon.chevron_right size={20} className="text-placeholder-subtle shrink-0" />
                </button>
              )
            })}
          </div>

          {/* Create New Workspace Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full mt-4 py-3 px-4 border-2 border-dashed border-primary rounded-xl subheading-md text-tertiary flex items-center justify-center gap-2 hover:border-secondary hover:text-secondary transition-colors"
          >
            <Icon.plus size={20} />
            Create New Workspace
          </button>
        </div>

        {/* Create Workspace Modal */}
        <CreateWorkspaceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleWorkspaceCreated}
        />
      </div>
    )
  }

  // Detail view - show members/invites for selected workspace
  if (!selectedWorkspace) {
    return (
      <div className="w-full h-screen-dvh bg-primary flex items-center justify-center">
        <p className="paragraph-sm text-quaternary">Workspace not found</p>
      </div>
    )
  }

  return (
    <div className="w-full h-screen-dvh bg-primary flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-tertiary shrink-0">
        <BackButton onClick={handleBackToOverview} label="All Workspaces" />
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-xl bg-brand-solid flex items-center justify-center label-bg text-primary-onbrand">
            {selectedWorkspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="title-h6 text-primary">{selectedWorkspace.name}</h1>
            <p className="paragraph-xs text-quaternary capitalize">Your role: {selectedWorkspace.role}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-tertiary max-w-3xl mx-auto w-full">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-3 subheading-md transition-colors ${
            activeTab === 'members'
              ? 'text-primary border-b-2 border-brand'
              : 'text-quaternary hover:text-secondary'
          }`}
        >
          Members ({members.length})
        </button>
        {canManage && (
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 py-3 subheading-md transition-colors ${
              activeTab === 'invites'
                ? 'text-primary border-b-2 border-brand'
                : 'text-quaternary hover:text-secondary'
            }`}
          >
            Invites ({invites.filter(i => i.status === 'pending').length})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl mx-auto w-full">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-error-primary border border-error-subtle rounded-lg">
            <p className="paragraph-sm text-error">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" variant="dark" />
          </div>
        ) : activeTab === 'members' ? (
          /* Members Tab */
          <div className="space-y-3">
            {members.map(member => (
              <div
                key={member.user_id}
                className="bg-secondary rounded-xl p-4 flex items-center gap-3"
              >
                {member.picture_url ? (
                  <img src={member.picture_url} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center">
                    <span className="label-sm text-tertiary">
                      {member.name?.charAt(0) || member.email?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="subheading-md text-primary truncate">
                      {member.name || member.email || 'Unknown'}
                    </p>
                    {getRoleIcon(member.role)}
                  </div>
                  <p className="paragraph-xs text-quaternary truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full label-xs ${getRoleBadgeColor(member.role)}`}>
                    {member.role}
                  </span>
                  {/* Role change dropdown - only for owners, and can't change own role or other owners */}
                  {isOwner && member.role !== 'owner' && member.user_id !== user?.google_user_id && (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                      className="paragraph-xs border border-secondary rounded px-2 py-1"
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
        ) : (
          /* Invites Tab */
          <div className="space-y-4">
            {/* Create Invite Button */}
            {!showCreateInvite && !createdInviteLink && (
              <button
                onClick={() => setShowCreateInvite(true)}
                className="w-full py-3 px-4 bg-brand-solid text-primary-onbrand rounded-xl subheading-md flex items-center justify-center gap-2 hover:bg-brand-solid-hover transition-colors"
              >
                <Icon.plus size={20} />
                Create Invite Link
              </button>
            )}

            {/* Create Invite Form */}
            {showCreateInvite && !createdInviteLink && (
              <div className="bg-secondary rounded-xl p-4 space-y-4">
                <h3 className="label-md text-primary">Create Invite</h3>

                {/* Invite Type Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsLinkInvite(true)}
                    className={`flex-1 py-2 px-3 rounded-lg subheading-md transition-colors ${
                      isLinkInvite
                        ? 'bg-brand-solid text-primary-onbrand'
                        : 'bg-primary text-secondary border border-secondary'
                    }`}
                  >
                    Anyone with link
                  </button>
                  <button
                    onClick={() => setIsLinkInvite(false)}
                    className={`flex-1 py-2 px-3 rounded-lg subheading-md transition-colors ${
                      !isLinkInvite
                        ? 'bg-brand-solid text-primary-onbrand'
                        : 'bg-primary text-secondary border border-secondary'
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
                    className="w-full px-4 py-3 border border-secondary rounded-lg paragraph-sm"
                  />
                )}

                {/* Role Selection */}
                <div>
                  <label className="block subheading-md text-secondary mb-2">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['admin', 'analyst', 'viewer'].map(role => (
                      <button
                        key={role}
                        onClick={() => setInviteRole(role)}
                        className={`py-2 px-3 rounded-lg subheading-md capitalize transition-colors ${
                          inviteRole === role
                            ? getRoleBadgeColor(role)
                            : 'bg-primary text-secondary border border-secondary hover:bg-secondary'
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
                    className="flex-1 py-2 px-4 border border-secondary rounded-lg subheading-md text-secondary hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateInvite}
                    disabled={creatingInvite || (!isLinkInvite && !inviteEmail.trim())}
                    className="flex-1 py-2 px-4 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingInvite ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            )}

            {/* Created Invite Link */}
            {createdInviteLink && (
              <div className="bg-success-primary border border-utility-success-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon.check_circle size={20} className="text-success" />
                  <span className="subheading-md text-success">Invite created!</span>
                </div>
                <div className="bg-primary rounded-lg p-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={createdInviteLink}
                    readOnly
                    className="flex-1 paragraph-sm text-tertiary bg-transparent outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(createdInviteLink)}
                    className="px-3 py-1 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover"
                  >
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setCreatedInviteLink(null)
                    setShowCreateInvite(false)
                  }}
                  className="w-full py-2 paragraph-sm text-tertiary hover:text-primary"
                >
                  Done
                </button>
              </div>
            )}

            {/* Pending Invites List */}
            {invites.filter(i => i.status === 'pending').length > 0 && (
              <div className="space-y-2">
                <h3 className="subheading-md text-secondary">Pending Invites</h3>
                {invites
                  .filter(i => i.status === 'pending')
                  .map(invite => (
                    <div
                      key={invite.invite_id}
                      className="bg-primary border border-secondary rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="subheading-md text-primary">
                          {invite.email || 'Anyone with link'}
                        </p>
                        <p className="paragraph-xs text-quaternary capitalize">{invite.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/invite/${invite.invite_id}`)}
                          className="p-2 text-quaternary hover:bg-tertiary rounded-lg"
                          title="Copy invite link"
                        >
                          <Icon.copy_01 size={16} />
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(invite.invite_id)}
                          className="p-2 text-error hover:bg-error-primary rounded-lg"
                          title="Revoke invite"
                        >
                          <Icon.trash_01 size={16} />
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
