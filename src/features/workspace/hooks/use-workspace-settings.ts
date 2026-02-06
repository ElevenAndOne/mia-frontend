import { useCallback, useEffect, useState } from 'react'
import {
  createWorkspaceInvite,
  fetchWorkspaceInvites,
  fetchWorkspaceMembers,
  removeWorkspaceMember,
  revokeWorkspaceInvite,
  updateWorkspaceMemberRole,
  type WorkspaceInvite,
  type WorkspaceMember,
} from '../services/workspace-settings-service'

interface UseWorkspaceSettingsParams {
  sessionId: string | null
  workspaceId: string | null
  canManage: boolean
}

export const useWorkspaceSettings = ({ sessionId, workspaceId, canManage }: UseWorkspaceSettingsParams) => {
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
        fetchWorkspaceMembers(sessionId, workspaceId),
        canManage ? fetchWorkspaceInvites(sessionId, workspaceId) : Promise.resolve([]),
      ])

      setMembers(membersData)
      setInvites(invitesData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspace data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [sessionId, workspaceId, canManage])

  useEffect(() => {
    if (!workspaceId) return
    refresh()
  }, [workspaceId, refresh])

  const createInvite = useCallback(async (payload: { role: string; email?: string }) => {
    if (!sessionId || !workspaceId) return null
    const invite = await createWorkspaceInvite(sessionId, workspaceId, payload)
    setInvites((prev) => [invite, ...prev])
    return invite
  }, [sessionId, workspaceId])

  const revokeInvite = useCallback(async (inviteId: string) => {
    if (!sessionId || !workspaceId) return
    await revokeWorkspaceInvite(sessionId, workspaceId, inviteId)
    setInvites((prev) => prev.filter((invite) => invite.invite_id !== inviteId))
  }, [sessionId, workspaceId])

  const removeMember = useCallback(async (userId: string) => {
    if (!sessionId || !workspaceId) return
    await removeWorkspaceMember(sessionId, workspaceId, userId)
    setMembers((prev) => prev.filter((member) => member.user_id !== userId))
  }, [sessionId, workspaceId])

  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    if (!sessionId || !workspaceId) return
    await updateWorkspaceMemberRole(sessionId, workspaceId, userId, role)
    setMembers((prev) => prev.map((member) =>
      member.user_id === userId ? { ...member, role } : member
    ))
  }, [sessionId, workspaceId])

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
