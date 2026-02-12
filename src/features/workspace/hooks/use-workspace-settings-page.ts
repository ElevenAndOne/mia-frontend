import { useCallback, useMemo, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'
import { useClipboard } from '../../../hooks/use-clipboard'
import {
  buildWorkspaceInviteRows,
  buildWorkspaceMemberRows,
  buildWorkspaceOverviewItems,
  buildUnifiedPersonRows,
  type WorkspaceOverviewItem,
  type WorkspacePersonRow,
} from '../utils/workspace-settings'
import { useWorkspaceSettings } from './use-workspace-settings'

export const useWorkspaceSettingsPage = () => {
  const { activeWorkspace, availableWorkspaces, sessionId, user, refreshWorkspaces, deleteWorkspace } = useSession()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateInviteModal, setShowCreateInviteModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isLinkInvite, setIsLinkInvite] = useState(true)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const { copied: copySuccess, copy } = useClipboard()

  const selectedWorkspace = useMemo(() => {
    if (!selectedWorkspaceId) return null
    return availableWorkspaces.find((workspace) => workspace.tenant_id === selectedWorkspaceId) || null
  }, [availableWorkspaces, selectedWorkspaceId])

  const canManage = selectedWorkspace?.role === 'owner' || selectedWorkspace?.role === 'admin'
  const isOwner = selectedWorkspace?.role === 'owner'

  const {
    members,
    invites,
    loading,
    error,
    setError,
    setMembers,
    setInvites,
    createInvite,
    revokeInvite,
    removeMember,
    updateMemberRole,
  } = useWorkspaceSettings({
    sessionId,
    workspaceId: selectedWorkspaceId,
    canManage,
  })

  const overviewItems = useMemo<WorkspaceOverviewItem[]>(() => {
    return buildWorkspaceOverviewItems(availableWorkspaces, activeWorkspace?.tenant_id)
  }, [availableWorkspaces, activeWorkspace?.tenant_id])

  const memberRows = useMemo(() => {
    return buildWorkspaceMemberRows(members, {
      currentUserId: user?.google_user_id,
      canManage: Boolean(canManage),
      isOwner: Boolean(isOwner),
    })
  }, [members, user?.google_user_id, canManage, isOwner])

  const inviteBaseUrl = useMemo(() => `${window.location.origin}/invite/`, [])

  const pendingInvites = useMemo(() => {
    return buildWorkspaceInviteRows(invites, inviteBaseUrl)
  }, [invites, inviteBaseUrl])

  const unifiedPeople = useMemo<WorkspacePersonRow[]>(() => {
    return buildUnifiedPersonRows(memberRows, pendingInvites)
  }, [memberRows, pendingInvites])

  const handleSelectWorkspace = useCallback((workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId)
    setMembers([])
    setInvites([])
    setShowCreateInviteModal(false)
    setCreatedInviteLink(null)
    setError(null)
  }, [setMembers, setInvites, setError])

  const handleBackToOverview = useCallback(() => {
    setSelectedWorkspaceId(null)
    setMembers([])
    setInvites([])
    setError(null)
  }, [setMembers, setInvites, setError])

  const handleWorkspaceCreated = useCallback(async () => {
    setShowCreateModal(false)
    await refreshWorkspaces()
  }, [refreshWorkspaces])

  const handleCreateInvite = useCallback(async () => {
    if (!selectedWorkspaceId || !sessionId) return
    try {
      setCreatingInvite(true)
      setError(null)
      const payload: { role: string; email?: string } = { role: inviteRole }
      if (!isLinkInvite && inviteEmail.trim()) {
        payload.email = inviteEmail.trim()
      }
      const invite = await createInvite(payload)
      if (!invite) return
      setCreatedInviteLink(`${window.location.origin}/invite/${invite.invite_id}`)
      setInviteEmail('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create invite'
      setError(message)
    } finally {
      setCreatingInvite(false)
    }
  }, [selectedWorkspaceId, sessionId, inviteRole, inviteEmail, isLinkInvite, createInvite, setError])

  const handleRevokeInvite = useCallback(async (inviteId: string) => {
    if (!selectedWorkspaceId || !sessionId) return
    try {
      await revokeInvite(inviteId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke invite'
      setError(message)
    }
  }, [selectedWorkspaceId, sessionId, revokeInvite, setError])

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!selectedWorkspaceId || !sessionId) return
    try {
      await removeMember(userId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member'
      setError(message)
    }
  }, [selectedWorkspaceId, sessionId, removeMember, setError])

  const handleUpdateRole = useCallback(async (userId: string, newRole: string) => {
    if (!selectedWorkspaceId || !sessionId) return
    try {
      await updateMemberRole(userId, newRole)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role'
      setError(message)
    }
  }, [selectedWorkspaceId, sessionId, updateMemberRole, setError])

  const handleCopyInvite = useCallback((inviteLink: string) => {
    copy(inviteLink)
  }, [copy])

  const openCreateModal = useCallback(() => setShowCreateModal(true), [])
  const closeCreateModal = useCallback(() => setShowCreateModal(false), [])

  const openCreateInviteModal = useCallback(() => setShowCreateInviteModal(true), [])
  const closeCreateInviteModal = useCallback(() => {
    setShowCreateInviteModal(false)
    setInviteEmail('')
    setCreatedInviteLink(null)
  }, [])

  const completeInviteFlow = useCallback(() => {
    setCreatedInviteLink(null)
    setShowCreateInviteModal(false)
    setInviteEmail('')
    setInviteRole('viewer')
    setIsLinkInvite(true)
  }, [])

  const openDeleteModal = useCallback(() => setShowDeleteModal(true), [])
  const closeDeleteModal = useCallback(() => setShowDeleteModal(false), [])

  const handleDeleteWorkspace = useCallback(async (): Promise<boolean> => {
    if (!selectedWorkspaceId) return false
    const success = await deleteWorkspace(selectedWorkspaceId)
    if (success) {
      setSelectedWorkspaceId(null)
    }
    return success
  }, [selectedWorkspaceId, deleteWorkspace])

  const handleLeaveWorkspace = useCallback(async (): Promise<boolean> => {
    if (!selectedWorkspaceId || !sessionId) return false

    try {
      const response = await apiFetch(`/api/tenants/${selectedWorkspaceId}/leave`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Refresh workspaces to remove the one we left
        await refreshWorkspaces()
        setSelectedWorkspaceId(null)
        return true
      }

      const data = await response.json()
      setError(data.detail || 'Failed to leave workspace')
      return false
    } catch (err) {
      setError('Network error while leaving workspace')
      return false
    }
  }, [selectedWorkspaceId, sessionId, refreshWorkspaces, setError])

  const isCreateInviteDisabled = creatingInvite || (!isLinkInvite && !inviteEmail.trim())

  return {
    activeWorkspaceId: activeWorkspace?.tenant_id ?? null,
    selectedWorkspaceId,
    selectedWorkspace,
    overviewItems,
    showCreateModal,
    openCreateModal,
    closeCreateModal,
    handleWorkspaceCreated,
    canManage: Boolean(canManage),
    isOwner: Boolean(isOwner),
    loading,
    error,
    unifiedPeople,
    showCreateInviteModal,
    inviteRole,
    inviteEmail,
    isLinkInvite,
    creatingInvite,
    createdInviteLink,
    copySuccess,
    isCreateInviteDisabled,
    handleSelectWorkspace,
    handleBackToOverview,
    handleCreateInvite,
    handleRevokeInvite,
    handleRemoveMember,
    handleUpdateRole,
    handleCopyInvite,
    openCreateInviteModal,
    closeCreateInviteModal,
    completeInviteFlow,
    setInviteRole,
    setInviteEmail,
    setIsLinkInvite,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteWorkspace,
    handleLeaveWorkspace,  // NEW (Feb 2026): Leave workspace for non-owners
  }
}
