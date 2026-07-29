import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatMarkdown } from '../../../components/chat-markdown'
import { ChevronDown } from '../../../components/icon/chevron-down'
import { Copy01 } from '../../../components/icon/copy-01'
import { Pencil01 } from '../../../components/icon/pencil-01'
import { ReverseLeft } from '../../../components/icon/reverse-left'
import { Type01 } from '../../../components/icon/type-01'
import { XClose } from '../../../components/icon/x-close'
import { useClipboard } from '../../../hooks/use-clipboard'
import type { CanvasDocument, DocumentSelection } from '../services/chat-service'
import { AddToCampaign } from './add-to-campaign'
import { HighlightToolbar } from './highlight-toolbar'
import { CreativePreview } from './previews/creative-preview'
import { parseCreativeSpec, PLATFORM_LABELS } from './previews/creative-spec'

// TipTap only loads when a long-form doc enters Edit mode (keeps the chat bundle lean).
const RichEditor = lazy(() => import('./rich-editor'))

/** Long-form doc types get the WYSIWYG editor; ad/social keep raw markdown +
 * in-preview editing (span-patch `find` must match raw source). */
const WYSIWYG_TYPES = new Set(['campaign_brief', 'email', 'content_calendar', 'generic'])

interface CanvasPaneProps {
  document: CanvasDocument
  /** All documents in the conversation (tab strip). */
  documents: CanvasDocument[]
  activeId: string | null
  onSelect: (documentId: string) => void
  isSaving?: boolean
  onClose: () => void
  /** Highlight → "ask Mia to change this" (span-patch). */
  onRequestEdit: (instruction: string, selection: DocumentSelection) => void
  /** User's own inline edit (debounced save happens in the hook). */
  onSaveUserEdit: (content: string) => void
  /** Revert Mia's last rewrite. */
  onUndo?: () => void
  canUndo?: boolean
  /** Version history for the version dropdown. */
  onFetchVersions: () => Promise<CanvasDocument[]>
  /** Check out a version for viewing (no new version until edited). */
  onSelectVersion: (version: CanvasDocument) => void
  /** Optional voice-to-edit passthrough for the toolbar. */
  onDictateEdit?: () => void
  /** Workspace/brand name shown in the platform-native previews. */
  brandName?: string
  /** Conversation id — provenance for "Add to campaign". */
  conversationId?: string | null
  /** Upload image(s) into the active document's media slot. */
  onUploadMedia?: (files: File[]) => void
  /** Remove an uploaded image (by URL) from the active document. */
  onRemoveMedia?: (url: string) => void
  isUploadingMedia?: boolean
}

const DOC_TYPE_LABELS: Record<string, string> = {
  social_post: 'Social post',
  ad_copy: 'Ad copy',
  email: 'Email',
  campaign_brief: 'Campaign brief',
  content_calendar: 'Content calendar',
  generic: 'Document',
}

type Mode = 'view' | 'edit'

export const CanvasPane = ({
  document: doc,
  documents,
  activeId,
  onSelect,
  isSaving = false,
  onClose,
  onRequestEdit,
  onSaveUserEdit,
  onUndo,
  canUndo = false,
  onFetchVersions,
  onSelectVersion,
  onDictateEdit,
  brandName,
  conversationId = null,
  onUploadMedia,
  onRemoveMedia,
  isUploadingMedia = false,
}: CanvasPaneProps) => {
  const [mode, setMode] = useState<Mode>('view')
  const [selection, setSelection] = useState<{ rect: DOMRect; text: string } | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<CanvasDocument[]>([])
  /** Platform preview ↔ raw text, for docs that parse into a CreativeSpec. */
  const [rawView, setRawView] = useState(false)
  const spec = useMemo(() => parseCreativeSpec(doc), [doc])
  const bodyRef = useRef<HTMLDivElement>(null)
  const versionMenuRef = useRef<HTMLDivElement>(null)
  const { copied, copy } = useClipboard()

  const hasTabs = documents.length > 1

  // Capture a highlight inside the rendered document → anchor the toolbar to it.
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setSelection(null)
      return
    }
    const text = sel.toString().trim()
    if (!text) {
      setSelection(null)
      return
    }
    const range = sel.getRangeAt(0)
    if (!bodyRef.current?.contains(range.commonAncestorContainer)) return
    setSelection({ rect: range.getBoundingClientRect(), text })
  }, [])

  const closeToolbar = useCallback(() => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  const submitEdit = useCallback(
    (instruction: string) => {
      if (!selection) return
      onRequestEdit(instruction, { text: selection.text })
    },
    [selection, onRequestEdit]
  )

  const toggleVersions = useCallback(() => {
    setShowVersions((open) => {
      if (!open) onFetchVersions().then(setVersions)
      return !open
    })
  }, [onFetchVersions])

  // Close the version menu on outside click / Escape.
  useEffect(() => {
    if (!showVersions) return
    const onDown = (e: MouseEvent) => {
      if (versionMenuRef.current && !versionMenuRef.current.contains(e.target as Node)) {
        setShowVersions(false)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowVersions(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showVersions])

  // Reset transient UI when switching tabs.
  useEffect(() => {
    setMode('view')
    setSelection(null)
    setShowVersions(false)
    setRawView(false)
  }, [activeId])

  const baseTypeLabel = DOC_TYPE_LABELS[doc.doc_type] ?? DOC_TYPE_LABELS.generic
  const typeLabel = spec ? `${baseTypeLabel} · ${PLATFORM_LABELS[spec.platform]}` : baseTypeLabel
  // The tab list holds the LATEST version per document; if what we're showing is behind it,
  // the user has checked out an older version.
  const latestVersion = documents.find((d) => d.id === activeId)?.version ?? doc.version
  const viewingOlder = doc.version < latestVersion

  return (
    <aside className="flex flex-col h-full w-full bg-primary border-l border-tertiary min-w-0">
      {/* Header */}
      <div className="border-b border-tertiary px-5 py-3 relative">
        {/* Tab strip — one tab per deliverable */}
        {hasTabs && (
          <div className="flex items-center gap-1 overflow-x-auto mb-2 -mx-1 px-1">
            {documents.map((d, i) => {
              const active = d.id === activeId
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelect(d.id)}
                  className={`shrink-0 max-w-[160px] truncate rounded-lg px-2.5 py-1 paragraph-sm transition-colors ${
                    active
                      ? 'bg-tertiary text-primary font-medium'
                      : 'text-quaternary hover:text-secondary hover:bg-tertiary/60'
                  }`}
                  title={d.title}
                >
                  {d.title || `Item ${i + 1}`}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h2 className="paragraph-md font-semibold text-primary truncate">{doc.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="paragraph-sm text-quaternary uppercase tracking-wide">
                {typeLabel}
              </span>
              {/* Version chip → history dropdown */}
              <button
                type="button"
                onClick={toggleVersions}
                aria-label="Version history"
                aria-expanded={showVersions}
                className="flex items-center gap-0.5 paragraph-sm text-secondary rounded-full bg-tertiary px-2 py-0.5 hover:text-primary transition-colors"
              >
                v{doc.version}
                <ChevronDown size={12} />
              </button>
              {spec && mode === 'view' && (
                <div className="flex items-center rounded-full bg-tertiary p-0.5">
                  <button
                    type="button"
                    onClick={() => setRawView(false)}
                    className={`paragraph-sm px-2 py-0.5 rounded-full transition-colors ${
                      !rawView ? 'bg-primary text-primary font-medium' : 'text-quaternary hover:text-secondary'
                    }`}
                  >
                    {spec.isPaid ? 'Ad' : 'Post'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawView(true)}
                    className={`paragraph-sm px-2 py-0.5 rounded-full transition-colors ${
                      rawView ? 'bg-primary text-primary font-medium' : 'text-quaternary hover:text-secondary'
                    }`}
                  >
                    Text
                  </button>
                </div>
              )}
              {isSaving && <span className="paragraph-sm text-quaternary">Saving…</span>}
            </div>
          </div>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => setMode((m) => (m === 'view' ? 'edit' : 'view'))}
              aria-label={mode === 'view' ? 'Edit document' : 'Preview document'}
              className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-secondary hover:bg-tertiary transition-colors paragraph-sm"
            >
              {mode === 'view' ? <Pencil01 size={15} /> : <Type01 size={15} />}
              {mode === 'view' ? 'Edit' : 'Preview'}
            </button>
            {onUndo && canUndo && (
              <button
                type="button"
                onClick={onUndo}
                aria-label="Undo Mia's last change"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
              >
                <ReverseLeft size={16} />
              </button>
            )}
            <AddToCampaign doc={doc} spec={spec} conversationId={conversationId} />
            <button
              type="button"
              onClick={() => copy(doc.content)}
              aria-label="Copy document"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
            >
              <Copy01 size={16} className={copied ? 'text-utility-brand-600' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close canvas"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
            >
              <XClose size={16} />
            </button>
          </div>
        </div>

        {/* Version history dropdown */}
        {showVersions && (
          <div
            ref={versionMenuRef}
            className="absolute z-40 top-full left-5 mt-1 w-64 max-h-72 overflow-y-auto rounded-xl border border-tertiary bg-primary shadow-lg py-1"
          >
            {versions.length === 0 ? (
              <div className="px-3 py-2 paragraph-sm text-quaternary">No history yet.</div>
            ) : (
              versions.map((v) => {
                const current = v.version === doc.version
                return (
                  <button
                    key={v.version}
                    type="button"
                    disabled={current}
                    onClick={() => {
                      onSelectVersion(v)
                      setShowVersions(false)
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                      current ? 'text-primary' : 'text-secondary hover:bg-tertiary'
                    }`}
                  >
                    <span className="paragraph-sm font-medium">v{v.version}</span>
                    <span className="paragraph-sm text-quaternary">
                      {v.created_by === 'user' ? 'You' : 'Mia'}
                    </span>
                    {current && (
                      <span className="paragraph-sm text-quaternary ml-auto">current</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Viewing an older version — clarify why the content/number changed */}
      {viewingOlder && (
        <div className="flex items-center gap-2 px-5 py-2 bg-tertiary/60 border-b border-tertiary paragraph-sm text-secondary">
          <span>
            Viewing <span className="font-medium">v{doc.version}</span> — editing will save it as a
            new version.
          </span>
          <button
            type="button"
            onClick={() => {
              const latest = documents.find((d) => d.id === activeId)
              if (latest) onSelectVersion(latest)
            }}
            className="ml-auto text-utility-brand-600 hover:underline"
          >
            Back to latest (v{latestVersion})
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6">
        {mode === 'view' ? (
          <div ref={bodyRef} onMouseUp={handleMouseUp} className="max-w-[640px] mx-auto">
            {spec && !rawView ? (
              <CreativePreview
                spec={spec}
                brandName={brandName}
                onUploadMedia={onUploadMedia}
                onRemoveMedia={onRemoveMedia}
                isUploadingMedia={isUploadingMedia}
              />
            ) : (
              <ChatMarkdown content={doc.content} />
            )}
          </div>
        ) : WYSIWYG_TYPES.has(doc.doc_type) ? (
          <div className="max-w-[640px] mx-auto">
            <Suspense
              fallback={<p className="paragraph-sm text-quaternary">Loading editor…</p>}
            >
              {/* Keyed by doc ONLY — self-saves bump version and must NOT remount;
                  external changes sync inside RichEditor. */}
              <RichEditor
                key={doc.id}
                content={doc.content}
                onChange={onSaveUserEdit}
              />
            </Suspense>
          </div>
        ) : (
          <textarea
            key={`${doc.id}-${doc.version}`}
            defaultValue={doc.content}
            onChange={(e) => onSaveUserEdit(e.target.value)}
            spellCheck
            className="w-full max-w-[640px] mx-auto block h-full min-h-[60vh] resize-none bg-transparent paragraph-md text-primary outline-none font-mono"
          />
        )}
      </div>

      {/* Highlight → ask Mia (view mode only) */}
      {mode === 'view' && selection && (
        <HighlightToolbar
          anchorRect={selection.rect}
          selectionText={selection.text}
          onSubmit={submitEdit}
          onClose={closeToolbar}
          onDictate={onDictateEdit}
        />
      )}
    </aside>
  )
}
