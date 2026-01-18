import { useState, useEffect, useCallback } from 'react'
import { useSession } from '../../../contexts/session-context-shim'
import { apiFetch } from '../../../utils/api'

export interface Member {
  user_id: string
  email: string | null
  name: string | null
  picture_url: string | null
  role: string
  status: string
  joined_at: string | null
}

export const useWorkspaceMembers = () => {
  const { activeWorkspace, sessionId } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace?.tenant_id || !sessionId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await apiFetch(`/api/tenants/${activeWorkspace.tenant_id}/members`, {
        headers: { 'X-Session-ID': sessionId }
      })

      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      } else {
        throw new Error('Failed to fetch members')
      }
    } catch (err) {
      console.error('[useWorkspaceMembers] Error fetching members:', err)
      setError('Failed to load members')
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspace?.tenant_id, sessionId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const updateRole = useCallback(async (userId: string, newRole: string) => {
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
      console.error('[useWorkspaceMembers] Error updating role:', err)
      setError(err instanceof Error ? err.message : 'Failed to update role')
      throw err
    }
  }, [activeWorkspace?.tenant_id, sessionId])

  const removeMember = useCallback(async (userId: string) => {
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
      console.error('[useWorkspaceMembers] Error removing member:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove member')
      throw err
    }
  }, [activeWorkspace?.tenant_id, sessionId])

  return {
    members,
    isLoading,
    error,
    updateRole,
    removeMember,
    refresh: fetchMembers
  }
}
