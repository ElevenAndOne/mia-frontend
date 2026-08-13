import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../../../contexts/toast-context'
import {
  fetchCanvasDocuments,
  fetchDocumentVersions,
  saveDocumentEdit,
  uploadCanvasDocumentMedia,
  type CanvasDocument,
  type DocumentContext,
  type DocumentSelection,
} from '../services/chat-service'

interface UseCanvasArgs {
  sessionId: string | null
  conversationId: string | null
  /**
   * Dispatch an edit turn through the normal chat send path. The canvas doesn't
   * own the chat loop — it hands the parent a message + document_context and the
   * `document` SSE event comes back through the same stream (see handleDocumentEvent).
   */
  onSendEdit: (message: string, documentContext: DocumentContext) => void
}

export interface CanvasController {
  document: CanvasDocument | null
  /** All documents in the conversation, in arrival order (for the tab strip). */
  documentList: CanvasDocument[]
  activeId: string | null
  /** Switch the active document (tab click). */
  select: (documentId: string) => void
  isOpen: boolean
  /** Handle a `document` chunk arriving on the chat stream. */
  handleDocumentEvent: (doc: CanvasDocument) => void
  /** Refetch the conversation's documents in place (disconnect recovery) —
   *  merges new docs/versions without touching the open/active state. */
  reloadDocuments: () => void
  open: (documentId: string) => void
  close: () => void
  /** Fetch the full version history of the active document. */
  fetchVersions: () => Promise<CanvasDocument[]>
  /** View a past version (checkout — no new version created; editing from it appends). */
  viewVersion: (version: CanvasDocument) => void
  /** Ask Mia to change the highlighted span (full-document rewrite). */
  requestEdit: (instruction: string, selection: DocumentSelection) => void
  /** Persist the user's own inline edit as a new version (debounced). */
  saveUserEdit: (content: string) => void
  isSaving: boolean
  /** Revert Mia's last rewrite of the active document. */
  undo: () => void
  canUndo: boolean
  /** Conversation the canvas belongs to (provenance for "Add to campaign"). */
  conversationId: string | null
  /** Upload image(s) into the active document's media slot (recorded as `Media:` lines). */
  uploadMedia: (files: File[]) => void
  /** Append already-hosted media URLs (e.g. a Canva import) as `Media:` lines — no upload step. */
  appendMediaUrls: (urls: string[]) => void
  /** Remove an uploaded image (its `Media:` line) from the active document. */
  removeMedia: (url: string) => void
  isUploadingMedia: boolean
}

const EDIT_SAVE_DEBOUNCE_MS = 800

export function useCanvas({
  sessionId,
  conversationId,
  onSendEdit,
}: UseCanvasArgs): CanvasController {
  // Latest version per document_id.
  const [documents, setDocuments] = useState<Record<string, CanvasDocument>>({})
  // Arrival order of document_ids (drives the tab strip; Record order isn't guaranteed).
  const [order, setOrder] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  // A past version the user has checked out for viewing (display only, not persisted).
  // null = viewing the latest. Any real content change clears it and appends a new version.
  const [viewing, setViewing] = useState<CanvasDocument | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fresh mirrors so callbacks read current state without re-creating on every change.
  // Updated after commit — reads happen on later event ticks, so the lag is harmless.
  const documentsRef = useRef(documents)
  const activeIdRef = useRef(activeId)
  useEffect(() => {
    documentsRef.current = documents
  }, [documents])
  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])
  // Content of the active doc BEFORE Mia's most recent rewrite, per document_id.
  // One level of undo, targeting Mia edits (native Cmd+Z covers the edit-mode textarea).
  const prevContentRef = useRef<Record<string, string>>({})

  // Load any existing canvas documents when the conversation changes.
  useEffect(() => {
    if (!sessionId || !conversationId) {
      setDocuments({})
      setOrder([])
      setActiveId(null)
      setIsOpen(false)
      return
    }
    let cancelled = false
    fetchCanvasDocuments(sessionId, conversationId)
      .then((docs) => {
        if (cancelled) return
        const byId: Record<string, CanvasDocument> = {}
        for (const d of docs) byId[d.id] = d
        setDocuments(byId)
        setOrder(docs.map((d) => d.id))
        // Reopen the canvas when returning to a conversation that has deliverables.
        if (docs.length > 0) {
          setActiveId(docs[0].id)
          setViewing(null)
          setIsOpen(true)
        }
      })
      .catch(() => {
        /* non-critical — pane just starts empty */
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, conversationId])

  const handleDocumentEvent = useCallback((doc: CanvasDocument) => {
    const prior = documentsRef.current[doc.id]
    const changed = Boolean(prior && prior.content !== doc.content)
    if (changed && prior) prevContentRef.current[doc.id] = prior.content
    setDocuments((prev) => ({ ...prev, [doc.id]: doc }))
    setOrder((o) => (o.includes(doc.id) ? o : [...o, doc.id]))
    setActiveId(doc.id)
    setViewing(null) // a fresh result supersedes any checked-out version
    setIsOpen(true)
    setCanUndo(changed)
  }, [])

  // Refetch after a disconnect recovery: documents Mia created while the client
  // was away merge in (pill count updates), without stealing focus or open state.
  const reloadDocuments = useCallback(() => {
    if (!sessionId || !conversationId) return
    fetchCanvasDocuments(sessionId, conversationId)
      .then((docs) => {
        if (docs.length === 0) return
        setDocuments((prev) => {
          const next = { ...prev }
          for (const d of docs) next[d.id] = d
          return next
        })
        setOrder((o) => {
          const known = new Set(o)
          return [...o, ...docs.map((d) => d.id).filter((id) => !known.has(id))]
        })
        setActiveId((current) => current ?? docs[0].id)
      })
      .catch(() => {
        /* non-critical — the pill just doesn't update */
      })
  }, [sessionId, conversationId])

  const open = useCallback((documentId: string) => {
    setActiveId(documentId)
    setViewing(null)
    setIsOpen(true)
    setCanUndo(Boolean(prevContentRef.current[documentId]))
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const requestEdit = useCallback(
    (instruction: string, selection: DocumentSelection) => {
      const latest = activeId ? documents[activeId] : null
      if (!latest) return
      const displayed = viewing ?? latest
      const documentContext: DocumentContext = {
        document_id: latest.id,
        title: latest.title,
        doc_type: latest.doc_type,
        current_content: displayed.content, // edit from what the user is viewing
        version: latest.version, // number off the true latest so versions never collide
        selection,
      }
      onSendEdit(instruction, documentContext)
    },
    [activeId, documents, viewing, onSendEdit]
  )

  const saveUserEdit = useCallback(
    (content: string) => {
      const latest = activeId ? documents[activeId] : null
      if (!latest || !sessionId || !conversationId) return
      // A manual edit supersedes Mia's last rewrite — drop the undo target (native
      // Cmd+Z handles keystroke-level undo inside the textarea).
      if (prevContentRef.current[latest.id] != null) {
        delete prevContentRef.current[latest.id]
        setCanUndo(false)
      }
      setViewing(null) // editing commits — leave the checked-out view
      // Optimistic: reflect the edit locally, numbered off the true latest.
      const optimistic: CanvasDocument = {
        ...latest,
        content,
        version: latest.version + 1,
        created_by: 'user',
      }
      setDocuments((prev) => ({ ...prev, [latest.id]: optimistic }))

      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        setIsSaving(true)
        saveDocumentEdit(sessionId, latest.id, {
          conversation_id: conversationId,
          content,
        })
          .then((res) => {
            if (res?.version) {
              setDocuments((prev) => ({
                ...prev,
                [latest.id]: { ...prev[latest.id], version: res.version! },
              }))
            }
          })
          .catch(() => {
            /* keep the optimistic copy; a later save or reload reconciles */
          })
          .finally(() => setIsSaving(false))
      }, EDIT_SAVE_DEBOUNCE_MS)
    },
    [activeId, documents, sessionId, conversationId]
  )

  const undo = useCallback(() => {
    const id = activeIdRef.current
    if (!id) return
    const prev = prevContentRef.current[id]
    const doc = documentsRef.current[id]
    if (prev == null || !doc || !sessionId || !conversationId) return
    setViewing(null)
    // Revert to the pre-rewrite content as a fresh (user) version.
    setDocuments((p) => ({
      ...p,
      [id]: { ...doc, content: prev, version: doc.version + 1, created_by: 'user' },
    }))
    delete prevContentRef.current[id]
    setCanUndo(false)
    setIsSaving(true)
    saveDocumentEdit(sessionId, id, { conversation_id: conversationId, content: prev })
      .then((res) => {
        if (res?.version) {
          setDocuments((p) => ({ ...p, [id]: { ...p[id], version: res.version! } }))
        }
      })
      .catch(() => {
        /* keep the optimistic revert */
      })
      .finally(() => setIsSaving(false))
  }, [sessionId, conversationId])

  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const { showToast } = useToast()

  // Upload → store the file(s), then record their URLs as `Media:` lines at the end of the
  // document. One saveUserEdit per batch (a 3-file drop = one new version, slides in drop order).
  const uploadMedia = useCallback(
    async (files: File[]) => {
      const id = activeIdRef.current
      const doc = id ? documentsRef.current[id] : null
      if (!doc || !sessionId || !conversationId || isUploadingMedia || files.length === 0) return
      setIsUploadingMedia(true)
      try {
        const results = await Promise.allSettled(
          files.map((f) => uploadCanvasDocumentMedia(sessionId, doc.id, conversationId, f))
        )
        // Failures were previously swallowed — the media just never appeared, with no
        // feedback ("it allows me to add it, but it never actually loads"). Say why.
        const firstError = results.find(
          (r): r is PromiseRejectedResult => r.status === 'rejected'
        )
        if (firstError) {
          const reason =
            firstError.reason instanceof Error ? firstError.reason.message : 'Upload failed'
          showToast('error', reason)
        }
        const urls = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
          .map((r) => r.value)
        if (urls.length === 0) return
        const current = documentsRef.current[doc.id] ?? doc
        const mediaLines = urls.map((u) => `Media: ${u}`).join('\n')
        saveUserEdit(`${current.content.trimEnd()}\n${mediaLines}`)
      } catch {
        /* upload failed — slot just stays as it was */
      } finally {
        setIsUploadingMedia(false)
      }
    },
    [sessionId, conversationId, isUploadingMedia, saveUserEdit, showToast]
  )

  // Already-hosted URLs (Canva import re-hosts server-side) — just record the
  // `Media:` lines; same one-version-per-batch behaviour as uploadMedia.
  const appendMediaUrls = useCallback(
    (urls: string[]) => {
      const id = activeIdRef.current
      const doc = id ? documentsRef.current[id] : null
      if (!doc || urls.length === 0) return
      const current = documentsRef.current[doc.id] ?? doc
      const mediaLines = urls.map((u) => `Media: ${u}`).join('\n')
      saveUserEdit(`${current.content.trimEnd()}\n${mediaLines}`)
    },
    [saveUserEdit]
  )

  const removeMedia = useCallback(
    (url: string) => {
      const id = activeIdRef.current
      const doc = id ? documentsRef.current[id] : null
      if (!doc) return
      const next = doc.content
        .split('\n')
        .filter((line) => !line.includes(url))
        .join('\n')
      if (next !== doc.content) saveUserEdit(next)
    },
    [saveUserEdit]
  )

  const fetchVersions = useCallback(async (): Promise<CanvasDocument[]> => {
    const id = activeIdRef.current
    if (!id || !sessionId || !conversationId) return []
    try {
      return await fetchDocumentVersions(sessionId, conversationId, id)
    } catch {
      return []
    }
  }, [sessionId, conversationId])

  // Check out a past version for viewing (no new version). Editing from it appends a new
  // latest version (numbered off the true max), so the history never grows just from browsing.
  const viewVersion = useCallback((version: CanvasDocument) => {
    const id = activeIdRef.current
    const latest = id ? documentsRef.current[id] : null
    if (!latest) return
    setViewing(version.version >= latest.version ? null : version)
  }, [])

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    },
    []
  )

  const documentList = order.map((id) => documents[id]).filter(Boolean) as CanvasDocument[]
  const active = activeId ? (documents[activeId] ?? null) : null
  // Show the checked-out version if one is selected, else the latest.
  const displayed = viewing ?? active

  return {
    document: displayed,
    documentList,
    activeId,
    select: open,
    isOpen,
    handleDocumentEvent,
    reloadDocuments,
    open,
    close,
    fetchVersions,
    viewVersion,
    requestEdit,
    saveUserEdit,
    isSaving,
    undo,
    canUndo,
    conversationId,
    uploadMedia,
    appendMediaUrls,
    removeMedia,
    isUploadingMedia,
  }
}
