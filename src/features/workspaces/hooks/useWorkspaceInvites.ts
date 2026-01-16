import { useState, useEffect, useCallback } from 'react'
import { useSession } from '../../../contexts/SessionContext'
import { apiFetch } from '../../../utils/api'

export interface Invite {
  invite_id: string
  email: string | null
  role: string
  status: string
  expires_at: string
  created_at: string | null
  is_link_invite?: boolean
}

interface CreateInviteParams {
  role: string
  email?: string
}

export const useWorkspaceInvites = () => {
  const { activeWorkspace, sessionId } = useSession()
  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if current user can manage invites
  const canManage = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin'

  const fetchInvites = useCallback(async () => {
    if (!activeWorkspace?.tenant_id || !sessionId || !canManage) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await apiFetch(`/api/tenants/${activeWorkspace.tenant_id}/invites`, {
        headers: { 'X-Session-ID': sessionId }
      })

      if (response.ok) {
        const data = await response.json()
        setInvites(data)
      } else {
        throw new Error('Failed to fetch invites')
      }
    } catch (err) {
      console.error('[useWorkspaceInvites] Error fetching invites:', err)
      setError('Failed to load invites')
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspace?.tenant_id, sessionId, canManage])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const createInvite = useCallback(async (params: CreateInviteParams): Promise<Invite> => {
    if (!activeWorkspace?.tenant_id || !sessionId) {
      throw new Error('No workspace or session')
    }

    try {
      setError(null)

      const body: any = { role: params.role }
      if (params.email?.trim()) {
        body.email = params.email.trim()
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
      console.log('[useWorkspaceInvites] Invite created:', invite)

      // Add to invites list
      setInvites(prev => [invite, ...prev])

      return invite
    } catch (err) {
      console.error('[useWorkspaceInvites] Error creating invite:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create invite'
      setError(errorMessage)
      throw err
    }
  }, [activeWorkspace?.tenant_id, sessionId])

  const revokeInvite = useCallback(async (inviteId: string) => {
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
      console.error('[useWorkspaceInvites] Error revoking invite:', err)
      setError('Failed to revoke invite')
      throw err
    }
  }, [activeWorkspace?.tenant_id, sessionId])

  return {
    invites,
    isLoading,
    error,
    createInvite,
    revokeInvite,
    refresh: fetchInvites
  }
}
