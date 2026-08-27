import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { CanvasPane } from '../../chat/components/canvas-pane'
import { useCanvas } from '../../chat/hooks/use-canvas'
import { Sheet } from '../../overlay'

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
  const navigate = useNavigate()
  const conversationId = target?.conversationId ?? null

  const canvas = useCanvas({
    sessionId,
    conversationId,
    onSendEdit: () => {
      showToast('info', 'To ask Mia for changes, open this draft in chat — your own edits save here.')
      if (conversationId) navigate('/home', { state: { loadConversationId: conversationId } })
    },
  })

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

  return (
    <Sheet isOpen={!!target} onClose={onClose} position="right" showHandle={false}>
      <div className="h-dvh w-[min(92vw,720px)] bg-primary flex flex-col">
        {canvas.document ? (
          <CanvasPane
            document={canvas.document}
            documents={canvas.documentList}
            activeId={canvas.activeId}
            onSelect={canvas.select}
            isSaving={canvas.isSaving}
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
      </div>
    </Sheet>
  )
}
