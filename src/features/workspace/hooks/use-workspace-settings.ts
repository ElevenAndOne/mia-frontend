import { sessionCache } from '../../../utils/session-cache'
import { useCallback, useEffect, useState } from 'react'
import {
  createWorkspaceInvite,
  fetchWorkspaceInvites,
  fetchWorkspaceMembers,
  removeWorkspaceMember,
  revokeWorkspaceInvite,
  transferWorkspaceOwnership,
  updateWorkspaceMemberRole,
  type WorkspaceInvite,
  type WorkspaceMember,
} from '../services/workspace-settings-service'

interface UseWorkspaceSettingsParams {
  sessionId: string | null
  workspaceId: string | null
  canManage: boolean
}

/**
 * The last members and invites seen per workspace (19 Nov 2026): coming back to Settings showed a
 * spinner for ~3 s every time. They show at once and refresh behind what is shown.
 */
const MEMBERS_CACHE = sessionCache<{ members: WorkspaceMember[]; invites: WorkspaceInvite[] }>('members') // survives a refresh in this tab

export const useWorkspaceSettings = ({
  sessionId,
  workspaceId,
  canManage,
}: UseWorkspaceSettingsParams) => {
  const cached = workspaceId ? MEMBERS_CACHE.get(workspaceId) : undefined
  const [members, setMembers] = useState<WorkspaceMember[]>(cached?.members ?? [])
  const [invites, setInvites] = useState<WorkspaceInvite[]>(cached?.invites ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Every change (a fetch, an invite, a removal) is what the next visit shows first.
  useEffect(() => {
    if (workspaceId && (members.length || invites.length)) MEMBERS_CACHE.set(workspaceId, { members, invites })
  }, [workspaceId, members, invites])

  // Switching workspace: that workspace's last list at once, not the previous one's.
  useEffect(() => {
    const c = workspaceId ? MEMBERS_CACHE.get(workspaceId) : undefined
    setMembers(c?.members ?? [])
    setInvites(c?.invites ?? [])
  }, [workspaceId])

  const refresh = useCallback(async () => {
    if (!sessionId || !workspaceId) return

    try {
      // A spinner only the first time; after that the last list stays up while this runs.
      setLoading(!MEMBERS_CACHE.has(workspaceId))
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

  const createInvite = useCallback(
    async (payload: { role: string; email?: string }) => {
      if (!sessionId || !workspaceId) return null
      const invite = await createWorkspaceInvite(sessionId, workspaceId, payload)
      setInvites((prev) => [invite, ...prev])
      return invite
    },
    [sessionId, workspaceId]
  )

  const revokeInvite = useCallback(
    async (inviteId: string) => {
      if (!sessionId || !workspaceId) return
      await revokeWorkspaceInvite(sessionId, workspaceId, inviteId)
      setInvites((prev) => prev.filter((invite) => invite.invite_id !== inviteId))
    },
    [sessionId, workspaceId]
  )

  const removeMember = useCallback(
    async (userId: string) => {
      if (!sessionId || !workspaceId) return
      await removeWorkspaceMember(sessionId, workspaceId, userId)
      setMembers((prev) => prev.filter((member) => member.user_id !== userId))
    },
    [sessionId, workspaceId]
  )

  const updateMemberRole = useCallback(
    async (userId: string, role: string) => {
      if (!sessionId || !workspaceId) return
      await updateWorkspaceMemberRole(sessionId, workspaceId, userId, role)
      setMembers((prev) =>
        prev.map((member) => (member.user_id === userId ? { ...member, role } : member))
      )
    },
    [sessionId, workspaceId]
  )

  const transferOwnership = useCallback(
    async (newOwnerUserId: string) => {
      if (!sessionId || !workspaceId) return
      await transferWorkspaceOwnership(sessionId, workspaceId, newOwnerUserId)
      // Both rows change: the new owner gains 'owner', the caller drops to 'admin'.
      // Refresh rather than patch locally — the caller's own permissions change too,
      // which drives whether the transfer/role controls stay visible at all.
      await refresh()
    },
    [sessionId, workspaceId, refresh]
  )

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
    transferOwnership,
    setMembers,
    setInvites,
  }
}
