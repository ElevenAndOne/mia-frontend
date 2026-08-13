import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatMarkdown } from '../../../components/chat-markdown'
import { ChevronDown } from '../../../components/icon/chevron-down'
import { Copy01 } from '../../../components/icon/copy-01'
import { DotsHorizontal } from '../../../components/icon/dots-horizontal'
import { MagicWand02 } from '../../../components/icon/magic-wand-02'
import { Pencil01 } from '../../../components/icon/pencil-01'
import { ReverseLeft } from '../../../components/icon/reverse-left'
import { Type01 } from '../../../components/icon/type-01'
import { XClose } from '../../../components/icon/x-close'
import { useClipboard } from '../../../hooks/use-clipboard'
import { useTextSelection } from '../../../hooks/use-text-selection'
import { useSession } from '../../../contexts/session-context'
import type { CanvasDocument, DocumentSelection } from '../services/chat-service'
import { canvaApi } from '../services/canva-api'
import { AddToCampaign } from './add-to-campaign'
import { CanvaPicker } from './canva-picker'
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
  /** Append already-hosted URLs (Canva import) as `Media:` lines. */
  onAppendMediaUrls?: (urls: string[]) => void
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
  onAppendMediaUrls,
  onRemoveMedia,
  isUploadingMedia = false,
}: CanvasPaneProps) => {
  const [mode, setMode] = useState<Mode>('view')
  const [showVersions, setShowVersions] = useState(false)
  // Mobile-only "⋯" menu holding the actions that don't fit a phone-width header.
  const [showMore, setShowMore] = useState(false)
  const [versions, setVersions] = useState<CanvasDocument[]>([])
  /** Platform preview ↔ raw text, for docs that parse into a CreativeSpec. */
  const [rawView, setRawView] = useState(false)
  const spec = useMemo(() => parseCreativeSpec(doc), [doc])

  // "From Canva" media source — shown only when the workspace has Canva
  // connected (one status check per workspace, not per document).
  const { sessionId, activeWorkspace } = useSession()
  const [canvaConnected, setCanvaConnected] = useState(false)
  const [showCanvaPicker, setShowCanvaPicker] = useState(false)
  useEffect(() => {
    let cancelled = false
    setCanvaConnected(false)
    if (!sessionId || !activeWorkspace?.tenant_id) return
    canvaApi
      .status(sessionId, activeWorkspace.tenant_id)
      .then((s) => {
        if (!cancelled) setCanvaConnected(Boolean(s.connected && !s.needs_reconnect))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionId, activeWorkspace?.tenant_id])
  const bodyRef = useRef<HTMLDivElement>(null)
  const versionMenuRef = useRef<HTMLDivElement>(null)
  const versionChipRef = useRef<HTMLButtonElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const { copied, copy } = useClipboard()

  // Edit-mode changes buffer here and become ONE version when the user leaves
  // Edit mode (toggle / tab switch / close) — not one per keystroke-save.
  const pendingEditRef = useRef<string | null>(null)
  const saveRef = useRef(onSaveUserEdit)
  const docContentRef = useRef(doc.content)
  useEffect(() => {
    saveRef.current = onSaveUserEdit
  }, [onSaveUserEdit])
  useEffect(() => {
    docContentRef.current = doc.content
  }, [doc.content])
  const flushPendingEdit = useCallback(() => {
    const pending = pendingEditRef.current
    pendingEditRef.current = null
    if (pending != null && pending !== docContentRef.current) saveRef.current(pending)
  }, [])
  // Closing the canvas unmounts the pane — don't lose an in-flight edit.
  useEffect(() => () => flushPendingEdit(), [flushPendingEdit])

  const hasTabs = documents.length > 1

  // Capture a highlight inside the rendered document → anchor the toolbar to it
  // (mouseup on desktop, selectionchange on touch).
  const {
    selection,
    onMouseUp: handleMouseUp,
    clear: closeToolbar,
    selectAll,
    pickFromEvent,
  } = useTextSelection(bodyRef, mode === 'view')

  // Mobile "Edit with Mia" arms pick mode: a tap on a line of text selects it
  // and opens the toolbar; further taps SWAP the target line (pick mode stays
  // armed until the toolbar closes). Long-press stays available throughout.
  const [pickMode, setPickMode] = useState(false)
  const closeToolbarAndPick = useCallback(() => {
    closeToolbar()
    setPickMode(false)
  }, [closeToolbar])

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

  // Close the version menu on outside click / Escape. The chip itself is excluded:
  // its own onClick toggles, and closing here first would make that tap re-open.
  useEffect(() => {
    if (!showVersions) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (versionChipRef.current?.contains(target)) return
      if (versionMenuRef.current && !versionMenuRef.current.contains(target)) {
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

  // Close the mobile "⋯" menu on outside tap / Escape.
  useEffect(() => {
    if (!showMore) return
    const onDown = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowMore(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showMore])

  // Reset transient UI when switching tabs.
  useEffect(() => {
    setMode('view')
    closeToolbar()
    setShowVersions(false)
    setShowMore(false)
    setRawView(false)
    setPickMode(false)
  }, [activeId, closeToolbar])

  const baseTypeLabel = DOC_TYPE_LABELS[doc.doc_type] ?? DOC_TYPE_LABELS.generic
  const platformLabel = spec ? PLATFORM_LABELS[spec.platform] : null
  // Skip the platform suffix when it just repeats the doc type ("EMAIL · EMAIL").
  const typeLabel =
    platformLabel && platformLabel.toLowerCase() !== baseTypeLabel.toLowerCase()
      ? `${baseTypeLabel} · ${platformLabel}`
      : baseTypeLabel
  // The tab list holds the LATEST version per document; if what we're showing is behind it,
  // the user has checked out an older version.
  const latestVersion = documents.find((d) => d.id === activeId)?.version ?? doc.version
  const viewingOlder = doc.version < latestVersion

  return (
    <aside className="flex flex-col h-full w-full bg-primary md:border-l md:border-tertiary min-w-0">
      {/* Header */}
      <div className="border-b border-tertiary px-4 md:px-5 py-3 relative select-none">
        {/* Tab strip — one tab per deliverable */}
        {hasTabs && (
          <div className="flex items-center gap-1 overflow-x-auto mb-2 -mx-1 px-1">
            {documents.map((d, i) => {
              const active = d.id === activeId
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    flushPendingEdit()
                    onSelect(d.id)
                  }}
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
          <h2 className="min-w-0 flex-1 paragraph-md font-semibold text-primary truncate">
            {doc.title}
          </h2>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                if (mode === 'edit') flushPendingEdit()
                setMode(mode === 'view' ? 'edit' : 'view')
              }}
              aria-label={mode === 'view' ? 'Edit document' : 'Save changes'}
              className="h-8 max-md:h-10 px-2.5 rounded-lg flex items-center gap-1.5 text-secondary hover:bg-tertiary transition-colors paragraph-sm"
            >
              {mode === 'view' ? <Pencil01 size={15} /> : <Type01 size={15} />}
              {mode === 'view' ? 'Edit' : 'Save'}
            </button>
            {onUndo && canUndo && (
              <button
                type="button"
                onClick={onUndo}
                aria-label="Undo Mia's last change"
                className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
              >
                <ReverseLeft size={16} />
              </button>
            )}
            <AddToCampaign doc={doc} spec={spec} conversationId={conversationId} />
            <button
              type="button"
              onClick={() => copy(doc.content)}
              aria-label="Copy document"
              className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
            >
              <Copy01 size={16} className={copied ? 'text-utility-brand-600' : ''} />
            </button>
            {/* Mobile: Undo + Copy live behind "⋯" — a phone-width header can't hold 5 buttons */}
            <div className="relative md:hidden" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMore((o) => !o)}
                aria-label="More actions"
                aria-expanded={showMore}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
              >
                <DotsHorizontal size={16} />
              </button>
              {showMore && (
                <div className="absolute z-40 top-full right-0 mt-1 w-48 rounded-xl border border-tertiary bg-primary shadow-lg py-1">
                  {onUndo && canUndo && (
                    <button
                      type="button"
                      onClick={() => {
                        onUndo()
                        setShowMore(false)
                      }}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 paragraph-sm text-secondary hover:bg-tertiary transition-colors"
                    >
                      <ReverseLeft size={15} />
                      Undo Mia's change
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      copy(doc.content)
                      setShowMore(false)
                    }}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 paragraph-sm text-secondary hover:bg-tertiary transition-colors"
                  >
                    <Copy01 size={15} />
                    Copy text
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close canvas"
              className="w-8 h-8 max-md:w-10 max-md:h-10 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
            >
              <XClose size={16} />
            </button>
          </div>
        </div>

        {/* Meta row — full header width so chips wrap instead of colliding with the
            action buttons on narrow screens */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
          <span className="paragraph-sm text-quaternary uppercase tracking-wide">
            {typeLabel}
          </span>
          {/* Version chip → history dropdown */}
          <button
            ref={versionChipRef}
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
            <div className="flex items-center rounded-full bg-tertiary p-0.5 ml-1.5">
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
      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6">
        {mode === 'view' ? (
          // select-text: index.css disables selection globally on mobile — re-enable
          // here or touch highlight-to-edit has nothing to work with
          <div
            ref={bodyRef}
            onMouseUp={handleMouseUp}
            onClick={pickMode ? pickFromEvent : undefined}
            className="max-w-[640px] mx-auto select-text"
          >
            {spec && !rawView ? (
              <CreativePreview
                spec={spec}
                brandName={brandName}
                onUploadMedia={onUploadMedia}
                onRemoveMedia={onRemoveMedia}
                isUploadingMedia={isUploadingMedia}
                onOpenCanvaPicker={
                  canvaConnected && onAppendMediaUrls
                    ? () => setShowCanvaPicker(true)
                    : undefined
                }
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
                onChange={(md) => {
                  pendingEditRef.current = md
                }}
              />
            </Suspense>
          </div>
        ) : (
          <textarea
            key={`${doc.id}-${doc.version}`}
            defaultValue={doc.content}
            onChange={(e) => {
              pendingEditRef.current = e.target.value
            }}
            spellCheck
            className="w-full max-w-[640px] mx-auto block h-full min-h-[60vh] resize-none bg-transparent paragraph-md text-primary outline-none font-mono"
          />
        )}
      </div>

      {/* Mobile: explicit way into Mia-editing — long-press selection isn't discoverable
          and doesn't work in every mobile browser. Arms tap-to-select pick mode. */}
      {mode === 'view' && !selection && doc.content.trim() && (
        <div className="md:hidden shrink-0 border-t border-tertiary px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {pickMode ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 min-w-0 paragraph-sm text-secondary">
                <MagicWand02 size={14} className="inline mr-1.5 text-utility-brand-600" />
                Tap any line of text to edit it
              </p>
              <button
                type="button"
                onClick={() => selectAll(doc.content)}
                className="shrink-0 paragraph-sm text-secondary rounded-full border border-tertiary px-3 py-1.5 active:bg-tertiary transition-colors"
              >
                Whole doc
              </button>
              <button
                type="button"
                onClick={() => setPickMode(false)}
                className="shrink-0 paragraph-sm text-quaternary rounded-full px-2 py-1.5 active:bg-tertiary transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPickMode(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-tertiary py-2.5 paragraph-sm font-medium text-secondary active:bg-tertiary transition-colors"
              >
                <MagicWand02 size={15} className="text-utility-brand-600" />
                Edit with Mia
              </button>
              <p className="paragraph-xs text-quaternary text-center mt-1.5">
                or long-press text in the preview to pick a spot yourself
              </p>
            </>
          )}
        </div>
      )}

      {/* Highlight → ask Mia (view mode only) */}
      {mode === 'view' && selection && (
        <HighlightToolbar
          anchorRect={selection.rect}
          selectionText={selection.text}
          onSubmit={submitEdit}
          onClose={closeToolbarAndPick}
          onDictate={onDictateEdit}
          ignoreOutsideRef={pickMode ? bodyRef : undefined}
        />
      )}

      {/* "From Canva" design browser — imported pages land as Media: lines */}
      {showCanvaPicker && onAppendMediaUrls && (
        <CanvaPicker
          onClose={() => setShowCanvaPicker(false)}
          onImported={(assets) => onAppendMediaUrls(assets.map((a) => a.cdn_url))}
        />
      )}
    </aside>
  )
}
