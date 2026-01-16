import { useState } from 'react'
import { Invite } from '../hooks/useWorkspaceInvites'

interface InviteListProps {
  invites: Invite[]
  isLoading: boolean
  onCreateInvite: (params: { role: string; email?: string }) => Promise<Invite>
  onRevokeInvite: (inviteId: string) => void
}

const InviteList = ({ invites, isLoading, onCreateInvite, onRevokeInvite }: InviteListProps) => {
  const [showCreateInvite, setShowCreateInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState<string>('viewer')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isLinkInvite, setIsLinkInvite] = useState(true)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const handleCreateInvite = async () => {
    try {
      setCreatingInvite(true)

      const params: { role: string; email?: string } = { role: inviteRole }
      if (!isLinkInvite && inviteEmail.trim()) {
        params.email = inviteEmail.trim()
      }

      const invite = await onCreateInvite(params)

      // Generate invite link
      const inviteLink = `${window.location.origin}/invite/${invite.invite_id}`
      setCreatedInviteLink(inviteLink)

      // Reset form
      setInviteEmail('')
    } catch (err) {
      console.error('[InviteList] Error creating invite:', err)
    } finally {
      setCreatingInvite(false)
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
                    onClick={() => onRevokeInvite(invite.invite_id)}
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
  )
}

export default InviteList
