import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { CanvasPane } from '../../chat/components/canvas-pane'
import { useCanvas } from '../../chat/hooks/use-canvas'
import { sendChatMessageStreaming, type DocumentContext } from '../../chat/services/chat-service'

export interface MemoCanvasTarget {
  conversationId: string
  documentId?: string | null
}

interface MemoCanvasDrawerProps {
  target: MemoCanvasTarget | null
  onClose: () => void
}

/** The chat canvas, docked on the memo page. Same documents, same inline editing,
 *  versions and Schedule button as the chat — the reader never leaves the memo.
 *  Asking Mia to rewrite a highlight needs the chat loop, so that one action hands
 *  over to the conversation. */
export const MemoCanvasDrawer = ({ target, onClose }: MemoCanvasDrawerProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const conversationId = target?.conversationId ?? null
  const [editing, setEditing] = useState(false)
  // useCanvas needs the sender at construction, and the sender needs the
  // controller back to apply the `document` event — a ref closes the loop.
  const canvasRef = useRef<ReturnType<typeof useCanvas> | null>(null)

  // Highlight → "ask Mia to change this": run the same hidden edit turn the chat
  // runs, but from here — only the `document` event matters to this drawer.
  const sendEdit = useCallback(
    async (message: string, documentContext: DocumentContext) => {
      if (!sessionId || !conversationId) return
      setEditing(true)
      let streamError: string | null = null
      let gotDocument = false
      try {
        await sendChatMessageStreaming(
          {
            message,
            session_id: sessionId,
            user_id: '',
            date_range: '30_days',
            conversation_id: conversationId,
            document_context: documentContext,
          },
          (chunk) => {
            if (chunk.error) streamError = chunk.error
            if (chunk.document) {
              gotDocument = true
              canvasRef.current?.handleDocumentEvent(chunk.document)
            }
          },
        )
        if (streamError) throw new Error(streamError)
        showToast(gotDocument ? 'success' : 'info', gotDocument ? 'Updated — Mia applied your change' : "Mia replied but didn't change the document")
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'Mia could not apply that change')
      } finally {
        setEditing(false)
      }
    },
    [sessionId, conversationId, showToast],
  )

  const canvas = useCanvas({ sessionId, conversationId, onSendEdit: sendEdit })
  canvasRef.current = canvas

  // Focus the requested draft once the conversation's documents have loaded.
  useEffect(() => {
    if (!target) return
    if (target.documentId && canvas.documentList.some((d) => d.id === target.documentId)) {
      canvas.open(target.documentId)
    } else if (canvas.documentList.length > 0 && !canvas.document) {
      canvas.open(canvas.documentList[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.conversationId, target?.documentId, canvas.documentList.length])

  // Close on Escape while open.
  useEffect(() => {
    if (!target) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target, onClose])

  if (!target) return null

  // Own drawer rather than the shared Sheet: that one caps a right panel at
  // max-w-md, which is too narrow for the platform preview and clipped it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Draft canvas">
      <button
        type="button"
        aria-label="Close canvas"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-default"
      />
      <aside className="relative h-full w-[min(92vw,720px)] bg-primary border-l border-tertiary shadow-2xl flex flex-col min-w-0 overflow-hidden">
        {canvas.document ? (
          <CanvasPane
            document={canvas.document}
            documents={canvas.documentList}
            activeId={canvas.activeId}
            onSelect={canvas.select}
            isSaving={canvas.isSaving || editing}
            onClose={onClose}
            onRequestEdit={canvas.requestEdit}
            onSaveUserEdit={canvas.saveUserEdit}
            onUndo={canvas.undo}
            canUndo={canvas.canUndo}
            onFetchVersions={canvas.fetchVersions}
            onSelectVersion={canvas.viewVersion}
            brandName={activeWorkspace?.name}
            conversationId={canvas.conversationId}
            onUploadMedia={canvas.uploadMedia}
            onAppendMediaUrls={canvas.appendMediaUrls}
            onRemoveMedia={canvas.removeMedia}
            onReplaceMediaUrl={canvas.replaceMediaUrl}
            isUploadingMedia={canvas.isUploadingMedia}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="paragraph-sm text-tertiary">Loading Mia&rsquo;s drafts…</p>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  )
}
