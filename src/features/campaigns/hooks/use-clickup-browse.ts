import { useCallback, useState } from 'react'
import { invokeClickup } from '../services/campaign-api'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import type { ClickUpNode } from '../types'

const nodes = (raw: unknown): ClickUpNode[] =>
  ((raw as { id: string; name: string }[]) ?? []).map((n) => ({ id: n.id, name: n.name }))

// Cascading ClickUp Space → Folder → List browser for the push-target picker.
export function useClickUpBrowse() {
  const { tenantId, sessionId } = useCampaignWorkspace()
  const [spaces, setSpaces] = useState<ClickUpNode[]>([])
  const [folders, setFolders] = useState<ClickUpNode[]>([])
  const [lists, setLists] = useState<ClickUpNode[]>([])
  const [spaceId, setSpaceId] = useState('')
  const [folderId, setFolderId] = useState('')
  const [listId, setListId] = useState('')
  const [loading, setLoading] = useState<'spaces' | 'folders' | 'lists' | null>(null)
  const [error, setError] = useState('')

  const loadSpaces = useCallback(async () => {
    setLoading('spaces'); setError('')
    setSpaces([]); setFolders([]); setLists([]); setSpaceId(''); setFolderId(''); setListId('')
    try { setSpaces(nodes((await invokeClickup(sessionId, tenantId, 'list_spaces')).spaces)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load spaces') }
    finally { setLoading(null) }
  }, [sessionId, tenantId])

  const selectSpace = useCallback(
    async (sid: string) => {
      setSpaceId(sid); setFolderId(''); setListId(''); setFolders([]); setLists([])
      if (!sid) return
      setLoading('folders'); setError('')
      try { setFolders(nodes((await invokeClickup(sessionId, tenantId, 'list_folders', { space_id: sid })).folders)) }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed to load folders') }
      finally { setLoading(null) }
    },
    [sessionId, tenantId],
  )

  const selectFolder = useCallback(
    async (fid: string) => {
      setFolderId(fid); setListId(''); setLists([])
      if (!fid) return
      setLoading('lists'); setError('')
      try { setLists(nodes((await invokeClickup(sessionId, tenantId, 'list_folder_lists', { folder_id: fid })).lists)) }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed to load lists') }
      finally { setLoading(null) }
    },
    [sessionId, tenantId],
  )

  return {
    spaces, folders, lists, spaceId, folderId, listId, loading, error,
    loadSpaces, selectSpace, selectFolder, setListId,
  }
}
