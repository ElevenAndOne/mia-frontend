import { useCallback, useEffect, useState } from 'react'
import { useMiaClient, type WorkspaceMember as SDKMember, type WorkspaceInvite as SDKInvite, type WorkspaceRole } from '../../../sdk'

// Local types for backwards compatibility with snake_case
export interface WorkspaceMember {
  user_id: string
  email: string | null
  name: string | null
  picture_url: string | null
  role: string
  status: string
  joined_at: string | null
}

export interface WorkspaceInvite {
  invite_id: string
  email: string | null
  role: string
  status: string
  expires_at: string
  created_at: string | null
  is_link_invite?: boolean
}

// Map SDK types to local snake_case format
const mapMember = (m: SDKMember): WorkspaceMember => ({
  user_id: m.userId,
  email: m.email,
  name: m.name || null,
  picture_url: m.pictureUrl || null,
  role: m.role,
  status: m.status,
  joined_at: m.joinedAt || null,
})

const mapInvite = (i: SDKInvite): WorkspaceInvite => ({
  invite_id: i.inviteId,
  email: i.email || null,
  role: i.role,
  status: i.status,
  expires_at: i.expiresAt || '',
  created_at: i.createdAt || null,
  is_link_invite: i.isLinkInvite,
})

interface UseWorkspaceSettingsParams {
  sessionId: string | null
  workspaceId: string | null
  canManage: boolean
}

export const useWorkspaceSettings = ({ sessionId, workspaceId, canManage }: UseWorkspaceSettingsParams) => {
  const mia = useMiaClient()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!sessionId || !workspaceId) return

    try {
      setLoading(true)
      setError(null)

      const [membersData, invitesData] = await Promise.all([
        mia.workspaces.getMembers(workspaceId),
        canManage ? mia.workspaces.getInvites(workspaceId) : Promise.resolve([]),
      ])

      setMembers(membersData.map(mapMember))
      setInvites(invitesData.map(mapInvite))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspace data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [sessionId, workspaceId, canManage, mia])

  useEffect(() => {
    if (!workspaceId) return
    refresh()
  }, [workspaceId, refresh])

  const createInvite = useCallback(async (payload: { role: string; email?: string }) => {
    if (!sessionId || !workspaceId) return null
    const invite = await mia.workspaces.createInvite(workspaceId, payload.role as WorkspaceRole, payload.email)
    const mappedInvite = mapInvite(invite)
    setInvites((prev) => [mappedInvite, ...prev])
    return mappedInvite
  }, [sessionId, workspaceId, mia])

  const revokeInvite = useCallback(async (inviteId: string) => {
    if (!sessionId || !workspaceId) return
    await mia.workspaces.revokeInvite(workspaceId, inviteId)
    setInvites((prev) => prev.filter((invite) => invite.invite_id !== inviteId))
  }, [sessionId, workspaceId, mia])

  const removeMember = useCallback(async (userId: string) => {
    if (!sessionId || !workspaceId) return
    await mia.workspaces.removeMember(workspaceId, userId)
    setMembers((prev) => prev.filter((member) => member.user_id !== userId))
  }, [sessionId, workspaceId, mia])

  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    if (!sessionId || !workspaceId) return
    await mia.workspaces.updateMemberRole(workspaceId, userId, role as WorkspaceRole)
    setMembers((prev) => prev.map((member) =>
      member.user_id === userId ? { ...member, role } : member
    ))
  }, [sessionId, workspaceId, mia])

  return {
    members,
    invites,
    loading,
    error,
    setError,
    refresh,
    createInvite,
    revokeInvite,
    removeMember,
    updateMemberRole,
    setMembers,
    setInvites,
  }
}
