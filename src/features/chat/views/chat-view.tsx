import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatLayout from '../components/chat-layout'

/** How long "Not now" lasts. Long enough to be an answer, short enough that a workspace
 *  still missing its data hears about it again. */
const PROMPT_SNOOZE_DAYS = 7
import { BackButton } from '../../../components/back-button'
import ChatEmptyState from '../components/chat-empty-state'
import ChatInput from '../components/chat-input'
import ChatMessage from '../components/chat-message'
import ChatMessageList from '../components/chat-message-list'
import { CanvasPane } from '../components/canvas-pane'
import { Sheet } from '../../overlay'
import { useIsMobile } from '../../../hooks/use-is-mobile'
import type { DocumentSelection } from '../services/chat-service'
import QuickActions from '../components/quick-actions'
import { useFeatures } from '../../workspace/hooks/use-features'
import { useExperience } from '../../workspace/hooks/use-experience'
import { useHomeBrief } from '../../home/hooks/use-home-brief'
import { useHomeCardTurnover } from '../../home/hooks/use-home-card-turnover'
import { setHomeCardInFlight } from '../../home/in-flight'
import { BasicHome } from '../../home/components/basic-home'
import { BestPostCanvas } from '../../home/components/best-post-canvas'
import { RaceCampaignTracker } from '../../campaign/components/race-campaign-tracker'
import { IntegrationPromptModal } from '../../../components/integration-prompt-modal'
import { FeedbackModal } from '../components/feedback-modal'
import { XClose } from '../../../components/icon/x-close'
import { StorageKey } from '../../../constants/storage-keys'
import { setIntegrationHighlight } from '../../integrations/utils/integration-highlight'
import { useChatView } from '../hooks/use-chat-view.tsx'
import { useGoldInsights } from '../../insights/hooks/use-gold-insights'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'

interface ChatViewProps {
  onIntegrationsClick?: () => void
  onCampaignsClick?: () => void
  onReportsClick?: () => void
  onHelpClick?: () => void
  onLogout?: () => void
  onWorkspaceSettings?: () => void
  onNewWorkspace?: () => void
}

export const ChatView = ({
  onIntegrationsClick,
  onCampaignsClick,
  onReportsClick,
  onHelpClick,
  onLogout,
  onWorkspaceSettings,
  onNewWorkspace,
}: ChatViewProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const { data: goldData } = useGoldInsights(sessionId)

  // Only show "Ready" pulse if completed AND user hasn't viewed the report yet
  const strategiseSeenKey = goldData?.created_at
    ? `${StorageKey.STRATEGISE_SEEN_PREFIX}${goldData.created_at}`
    : null
  const strategiseReady =
    goldData?.status === 'completed' &&
    !!strategiseSeenKey &&
    localStorage.getItem(strategiseSeenKey) !== 'true'

  const {
    userName,
    messages,
    isLoading,
    streamingContent,
    thinkingText,
    midStreamStatus,
    dateRange,
    setDateRange,
    platforms,
    selectedPlatforms,
    togglePlatform,
    hasSelectedPlatforms,
    hasMessages,
    messagesEndRef,
    scrollContainerRef,
    lastUserMsgRef,
    handleScroll,
    handleWheel,
    handleNewChat,
    handleSubmit,
    handleQuickAction,
    handleConfirmAction,
    handleCancelAction,
    handleCancel,
    handleBack,
    handleFeedback,
    feedbackModalOpen,
    handleFeedbackModalSubmit,
    closeFeedbackModal,
    handleTranscribeAudio,
    integrationPrompt,
    loadConversation,
    images,
    addImages,
    removeImage,
    documents,
    addDocument,
    removeDocument,
    addPastedText,
    activeCampaign,
    handleCampaignChange,
    canvas,
    editTarget,
    setEditTarget,
    composerDraft,
  } = useChatView()

  // Basic hides the five fixed home cards; team/agency keep them (feature flag home_cards).

  const { isEnabled: isFeatureEnabled } = useFeatures()

  // Basic experience: the home column is today's brief (cards + chips) and the canvas rests
  // on the workspace's best post until a real document takes it over. Closing the best post
  // is remembered; a pill brings it back.
  const { isBasic } = useExperience()
  const { showToast } = useToast()
  const { brief, patchCard } = useHomeBrief(sessionId, activeWorkspace?.tenant_id, isBasic)
  // A scheduled post turns its home card over — listened for here because the schedule
  // flow runs from the canvas mid-conversation, when the home column is not mounted.
  useHomeCardTurnover(patchCard, isBasic)
  // The canvas column's open width, from the row it lives in (not the viewport — the sidebar
  // takes part of that, and OS display scaling changes the CSS px available). Column and
  // its inner sheet share the number, so nothing is ever wider than the column.
  const rowRef = useRef<HTMLDivElement>(null)
  const [rowWidth, setRowWidth] = useState(0)
  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    const update = () => setRowWidth(el.getBoundingClientRect().width)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // Bounds in rem so they follow the UI scale (index.css scales the root font-size).
  const remPx =
    typeof document !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16
  // 40% of the row, 24–42rem: leaves Home more room. The sheet inside renders at 92% so
  // the paper reads a notch smaller than the shell.
  const CANVAS_ZOOM = 0.92
  const canvasWidth = rowWidth
    ? Math.round(Math.min(42 * remPx, Math.max(24 * remPx, rowWidth * 0.4)))
    : Math.round(38 * remPx)
  const BEST_POST_OPEN_KEY = 'mia:basic-canvas-open'
  const [bestPostOpen, setBestPostOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(BEST_POST_OPEN_KEY) !== 'closed'
    } catch {
      return true
    }
  })
  const [bestPostSheetOpen, setBestPostSheetOpen] = useState(false)
  const setBestPost = (open: boolean) => {
    setBestPostOpen(open)
    try {
      localStorage.setItem(BEST_POST_OPEN_KEY, open ? 'open' : 'closed')
    } catch {
      /* private mode */
    }
  }
  const makeAnotherCard = brief?.cards.find((c) => c.kind === 'make_another')
  // Cards and chips slide up and out before the chat takes over; Home slides back down.
  const [homeLeaving, setHomeLeaving] = useState(false)
  const handleBasicPrompt = (
    prompt: string,
    opts?: { opensCanvas?: boolean; displayText?: string }
  ) => {
    if (opts?.opensCanvas) {
      setBestPost(true)
      setBestPostSheetOpen(true)
    }
    setHomeLeaving(true)
    window.setTimeout(() => {
      setHomeLeaving(false)
      void handleSubmit(prompt, opts?.displayText ? { displayText: opts.displayText } : undefined)
    }, 230)
  }
  const handleMakeAnother = () => {
    if (!makeAnotherCard?.cta.prompt) return
    setHomeCardInFlight(makeAnotherCard.id)
    handleBasicPrompt(makeAnotherCard.cta.prompt, {
      opensCanvas: true,
      displayText: `Make another post like my ${brief?.best_post?.weekday ?? 'best'} one`,
    })
  }

  // When a campaign is active, the date picker shows campaign dates and is non-interactive
  const campaignDateLocked = !!activeCampaign
  const campaignDateLabel =
    activeCampaign?.startDate && activeCampaign?.endDate
      ? `${fmtDate(activeCampaign.startDate)} – ${fmtDate(activeCampaign.endDate)}`
      : undefined

  function fmtDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  // No page_visit event for /home. It is the app's landing route, so the ref guard only
  // held for the lifetime of one mount — tabbing back, switching workspace or any remount
  // logged another "Viewed Home", which then dominated the Pulse activity feed. Chat turns
  // and the other page_visit events already show whether someone was in the app.
  // (Josh, 2026-09-15.)

  const [promptDismissed, setPromptDismissed] = useState(false)

  // Mobile canvas: the side pane doesn't exist below md, so the canvas becomes a
  // full-screen sheet the user opens from a pill above the input. New documents
  // never take over the screen mid-conversation — they light the pill up instead.
  const isMobile = useIsMobile()
  const [mobileCanvasOpen, setMobileCanvasOpen] = useState(false)
  const [canvasUnseen, setCanvasUnseen] = useState(false)
  const prevDocCountRef = useRef(0)
  const docCount = canvas.documentList.length
  useEffect(() => {
    if (docCount > prevDocCountRef.current && !mobileCanvasOpen) setCanvasUnseen(true)
    if (docCount === 0) {
      setMobileCanvasOpen(false)
      setCanvasUnseen(false)
    }
    prevDocCountRef.current = docCount
  }, [docCount, mobileCanvasOpen])

  // If the OS killed the tab while the canvas sheet was open, reopen it once the
  // resumed conversation's documents arrive. Read the flag before the persist
  // effect below can overwrite it with this mount's closed state.
  const savedCanvasConvRef = useRef(localStorage.getItem(StorageKey.LAST_CANVAS_OPEN))
  useEffect(() => {
    if (!isMobile || !savedCanvasConvRef.current) return
    if (savedCanvasConvRef.current === canvas.conversationId && docCount > 0) {
      savedCanvasConvRef.current = null
      setMobileCanvasOpen(true)
      setCanvasUnseen(false)
    }
  }, [isMobile, canvas.conversationId, docCount])
  useEffect(() => {
    if (!isMobile) return
    if (mobileCanvasOpen && canvas.conversationId) {
      savedCanvasConvRef.current = null // an explicit open supersedes the saved flag
      localStorage.setItem(StorageKey.LAST_CANVAS_OPEN, canvas.conversationId)
    } else if (!savedCanvasConvRef.current) {
      localStorage.removeItem(StorageKey.LAST_CANVAS_OPEN)
    }
  }, [isMobile, mobileCanvasOpen, canvas.conversationId])

  // Arriving from WhatsApp: /home?drafts=<conversation_id>. Mia sent three posts to their
  // phone and they tapped "edit in Mia", so the drafts are the reason they are here — load
  // that conversation and put it on the canvas.
  //
  // On mobile this AUTO-OPENS the sheet, which is deliberately the opposite of the rule
  // three lines above (new documents light the pill instead of taking over the screen).
  // That rule protects someone mid-conversation from being interrupted; this person tapped
  // a link about these specific posts. Once only — reopening it later is their choice.
  const [searchParams, setSearchParams] = useSearchParams()
  const draftsParam = searchParams.get('drafts')
  const draftsHandledRef = useRef<string | null>(null)
  useEffect(() => {
    if (!draftsParam || draftsHandledRef.current === draftsParam) return
    draftsHandledRef.current = draftsParam
    void loadConversation(draftsParam)
    // Drop the parameter so a refresh doesn't re-open the sheet over their work.
    const next = new URLSearchParams(searchParams)
    next.delete('drafts')
    setSearchParams(next, { replace: true })
  }, [draftsParam, loadConversation, searchParams, setSearchParams])

  // The documents arrive a beat after the conversation does; open the sheet then.
  const draftsPendingRef = useRef(false)
  useEffect(() => {
    if (draftsParam) draftsPendingRef.current = true
  }, [draftsParam])
  useEffect(() => {
    if (!draftsPendingRef.current || docCount === 0) return
    draftsPendingRef.current = false
    if (isMobile) setMobileCanvasOpen(true)
    setCanvasUnseen(false)
  }, [docCount, isMobile])

  const missingKey = integrationPrompt?.missingPlatformIds.join('|') ?? ''

  // Closing it has to mean something. It used to be counted in visits — but a "visit" is a
  // mount of this view, and moving between Home and Settings remounts it, so the every-5th
  // rule came round in a minute. Dismissal is now a real snooze, stored against the exact
  // set of platforms that were missing: connect one and the set changes, so Mia is allowed
  // to mention what is still missing.
  const readSnooze = (): { key: string; until: number } | null => {
    try {
      const raw = localStorage.getItem(StorageKey.INTEGRATION_PROMPT_SNOOZE)
      return raw ? (JSON.parse(raw) as { key: string; until: number }) : null
    } catch {
      return null
    }
  }
  const [promptSnooze, setPromptSnooze] = useState(readSnooze)
  const snoozed = !!promptSnooze && promptSnooze.key === missingKey && promptSnooze.until > Date.now()

  const snoozePrompt = () => {
    const next = { key: missingKey, until: Date.now() + PROMPT_SNOOZE_DAYS * 86400_000 }
    try {
      localStorage.setItem(StorageKey.INTEGRATION_PROMPT_SNOOZE, JSON.stringify(next))
    } catch {
      /* private mode — the in-memory state below still holds for this session */
    }
    setPromptSnooze(next)
    setPromptDismissed(true)
  }

  // Reset the in-session dismissal when the missing set changes. Depends on the KEY
  // alone: integrationPrompt is rebuilt whenever connectedPlatforms is a fresh array,
  // so having the object in here re-ran this every render and un-dismissed the dialog
  // the instant it was closed.
  useEffect(() => {
    setPromptDismissed(false)
  }, [missingKey])

  const showIntegrationPrompt = Boolean(integrationPrompt) && !promptDismissed && !snoozed

  const handleIntegrationPromptAction = () => {
    if (integrationPrompt) {
      setIntegrationHighlight(integrationPrompt.missingPlatformIds, activeWorkspace?.tenant_id)
    }
    snoozePrompt()
    onIntegrationsClick?.()
  }

  const handleIntegrationPromptClose = () => {
    snoozePrompt()
  }

  // One prop set for both canvas hosts (desktop side pane / mobile sheet) — only
  // onClose differs: the sheet closes itself, the pane closes the canvas state.
  const canvasPaneProps = canvas.document
    ? {
        document: canvas.document,
        documents: canvas.documentList,
        activeId: canvas.activeId,
        onSelect: canvas.select,
        freshIds: canvas.freshIds,
        isSaving: canvas.isSaving,
        onQuoteToChat: (selection: DocumentSelection) => {
          canvas.quoteToChat(selection)
          if (isMobile) setMobileCanvasOpen(false)
        },
        onSaveUserEdit: canvas.saveUserEdit,
        onUndo: canvas.undo,
        canUndo: canvas.canUndo,
        onFetchVersions: canvas.fetchVersions,
        onSelectVersion: canvas.viewVersion,
        brandName: activeWorkspace?.name,
        conversationId: canvas.conversationId,
        onUploadMedia: canvas.uploadMedia,
        onAppendMediaUrls: canvas.appendMediaUrls,
        onRemoveMedia: canvas.removeMedia,
        onReplaceMediaUrl: canvas.replaceMediaUrl,
        onDraftSeparatePost: (asset: { asset_id?: string; cdn_url: string }) => {
          // Pin the dropped image so Mia drafts a NEW post matching its format
          // (the pinned block carries the asset's ratio → story/feed template).
          if (asset.asset_id) {
            setEditTarget({ asset_id: asset.asset_id, cdn_url: asset.cdn_url })
          }
          handleSubmit('Draft a separate post using this image — match its format')
        },
        isUploadingMedia: canvas.isUploadingMedia,
        onSwapMedia: canvas.swapMedia,
        onTryAnotherIdea: () => {
          void handleSubmit(
            'Try another idea: a different post for my page — new subject, same voice, something current for the business. Draft it ready to post, with one of my photos.'
          )
        },
      }
    : null

  return (
    <ChatLayout
      hasMessages={hasMessages}
      onIntegrationsClick={onIntegrationsClick}
      onCampaignsClick={onCampaignsClick}
      onReportsClick={onReportsClick}
      onHelpClick={onHelpClick}
      onNewChat={handleNewChat}
      onBack={handleBack}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
      onNewWorkspace={onNewWorkspace}
      onLoadConversation={loadConversation}
    >
      <div ref={rowRef} className="flex-1 flex h-full min-h-0 pt-14 md:pt-0">
        <div className="relative flex-1 flex flex-col h-full min-h-0 min-w-0">
          {isBasic && !bestPostOpen && brief?.best_post && !canvas.isOpen && (
            <button
              type="button"
              onClick={() => setBestPost(true)}
              className="hidden md:inline-flex absolute right-6 top-5 z-10 items-center gap-2 rounded-full bg-secondary py-1.5 pl-1.5 pr-3 paragraph-xs font-semibold text-primary shadow-md hover:bg-tertiary"
            >
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-utility-success-600 to-utility-success-200" />
              Your best post
            </button>
          )}
          {!hasMessages ? (
            <>
              {isBasic ? (
                <div
                  className={`flex-1 flex flex-col min-h-0 ${homeLeaving ? 'mia-exit-up' : 'mia-enter-down'}`}
                >
                  <BasicHome
                    userName={userName}
                    onPrompt={handleBasicPrompt}
                    disabled={isLoading}
                    peek={
                      brief?.best_post ? (
                        <button
                          type="button"
                          onClick={() => setBestPostSheetOpen(true)}
                          className="md:hidden flex w-full items-center gap-3 rounded-2xl bg-secondary p-2.5 text-left"
                        >
                          <span
                            className="shrink-0 rounded-lg bg-gradient-to-br from-utility-success-600 to-utility-success-200"
                            style={{ width: 52, height: 52 }}
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="mia-mono text-[0.5625rem] text-placeholder">
                              Your best post
                            </span>
                            <span className="paragraph-sm text-primary truncate">
                              {brief.best_post.lift >= 2
                                ? Math.round(brief.best_post.lift)
                                : brief.best_post.lift.toFixed(1)}
                              × your usual {brief.best_post.lead_metric}
                              {brief.best_post.weekday ? ` · ${brief.best_post.weekday}` : ''}
                            </span>
                          </span>
                          <span className="rounded-md border border-primary px-2.5 py-1.5 paragraph-xs text-primary">
                            Open
                          </span>
                        </button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                <ChatEmptyState userName={userName}>
                  <div className="w-full flex flex-col gap-3">
                    {isFeatureEnabled('home_cards') && (
                      <QuickActions
                        onAction={handleQuickAction}
                        disabled={isLoading || !hasSelectedPlatforms}
                        strategiseReady={strategiseReady}
                      />
                    )}
                    <RaceCampaignTracker
                      disabled={isLoading}
                      dateRange={dateRange}
                      onCampaignChange={handleCampaignChange}
                    />
                  </div>
                </ChatEmptyState>
              )}

              <ChatInput
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isLoading}
                disabled={isLoading}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                campaignDateLocked={campaignDateLocked}
                campaignDateLabel={campaignDateLabel}
                platforms={platforms}
                selectedPlatforms={selectedPlatforms}
                onPlatformToggle={togglePlatform}
                hasSelectedPlatforms={hasSelectedPlatforms}
                images={images}
                onAddImages={addImages}
                onRemoveImage={removeImage}
                documents={documents}
                onAddFile={addDocument}
                onRemoveDocument={removeDocument}
                onAddPastedText={addPastedText}
                draft={composerDraft}
                onTranscribeAudio={handleTranscribeAudio}
              />
            </>
          ) : (
            <>
              {/* Desktop back button — sits above messages, no overlap with sidebar */}
              <div className="hidden md:flex items-center px-4 pt-3 pb-1 shrink-0">
                <BackButton onClick={handleBack} label="Back" variant="dark" />
              </div>

              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onWheel={handleWheel}
                className="flex-1 overflow-y-auto min-h-0 mia-rise"
              >
                <div className="max-w-3xl mx-auto px-4 py-6">
                  <ChatMessageList
                    messages={messages}
                    lastUserMsgRef={lastUserMsgRef}
                    onConfirmAction={handleConfirmAction}
                    onCancelAction={handleCancelAction}
                    onFeedback={handleFeedback}
                    onUseOption={canvas.documentList.length > 0 ? canvas.useOptionInActive : undefined}
                    pinnedAssetId={editTarget?.asset_id ?? null}
                    onPinAsset={(asset) =>
                      setEditTarget(
                        asset ? { asset_id: asset.asset_id, cdn_url: asset.cdn_url } : null
                      )
                    }
                    onImageReady={(assets, ev) => {
                      // Basic: Mia named the post this image is for — put it there now,
                      // so nobody has to notice a card in the chat and drag it across.
                      if (!ev.place_in_document_id || !assets[0]?.cdn_url) return
                      const placed = canvas.placeMediaInDocument(
                        ev.place_in_document_id,
                        assets[0].cdn_url
                      )
                      if (placed) showToast('success', 'Added the new image to your post.')
                    }}
                    onUseAssetInPost={(asset) => {
                      // Pin first so the request carries the asset id — the pinned block
                      // tells Mia to create_document with `Media: asset:{id}`.
                      setEditTarget({ asset_id: asset.asset_id, cdn_url: asset.cdn_url })
                      handleSubmit('Use this image in the post')
                    }}
                    onFixDrift={(source) => {
                      // Re-pin the edit SOURCE (not the drifted result) and redo precisely.
                      setEditTarget(source)
                      handleSubmit(
                        'Redo the previous edit — change ONLY what was asked and keep everything else exactly the same.'
                      )
                    }}
                  />

                  {/* Dots while Claude is thinking (tools running, no text yet) */}
                  {isLoading && !streamingContent && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 text-quaternary">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-quaternary rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-quaternary rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-quaternary rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                        <span className="paragraph-sm">{thinkingText}</span>
                      </div>
                    </div>
                  )}

                  {/* Live text stream — transitions to a permanent message when done */}
                  {streamingContent && (
                    <ChatMessage role="assistant" content={streamingContent} isStreaming />
                  )}

                  {/* Canvas/tool work mid-turn: the pre-text dots are long gone, so show
                    the live status under the streaming message instead of a bare caret. */}
                  {isLoading && streamingContent && midStreamStatus && (
                    <div className="mb-6 flex items-center gap-2 text-quaternary">
                      <div className="w-2 h-2 bg-quaternary rounded-full animate-pulse" />
                      <span className="paragraph-sm">{midStreamStatus}</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* The canvas lives behind this pill whenever it's not on screen: on mobile the
                side pane doesn't exist (full-screen sheet instead), and on desktop closing
                the pane previously left NO way to reopen it (the only affordance was this
                mobile-only pill) — the user had to ask Mia, who can't reopen it either. */}
              {docCount > 0 && (isMobile ? !mobileCanvasOpen : !canvas.isOpen) && (
                <div className="flex justify-end px-3 pb-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (isMobile) {
                        setMobileCanvasOpen(true)
                      } else {
                        const target = canvas.activeId ?? canvas.documentList[0]?.id
                        if (target) canvas.open(target)
                      }
                      setCanvasUnseen(false)
                    }}
                    className="flex items-center gap-2 rounded-full border border-tertiary bg-primary shadow-md px-4 py-2 paragraph-sm font-medium text-secondary hover:bg-secondary active:bg-tertiary transition-colors"
                  >
                    {canvasUnseen && (
                      <span className="w-2 h-2 rounded-full bg-utility-brand-600 animate-pulse" />
                    )}
                    Open in Canvas{docCount > 1 ? ` · ${docCount}` : ''}
                  </button>
                </div>
              )}

              {/* Pinned image: the next message edits THIS one rather than the newest.
                Shown here because the pin outlives the message it was set from. */}
              {editTarget && (
                <div className="flex justify-center px-3 pb-1.5 shrink-0">
                  <div className="flex items-center gap-2 rounded-full border border-brand bg-brand-primary pl-2 pr-3 py-1.5">
                    <img src={editTarget.cdn_url} alt="" className="w-6 h-6 rounded object-cover" />
                    <span className="paragraph-xs text-brand-secondary font-medium">
                      Editing this image
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditTarget(null)}
                      className="text-brand-secondary hover:text-primary"
                      aria-label="Stop editing this image"
                    >
                      <XClose size={14} />
                    </button>
                  </div>
                </div>
              )}

              <ChatInput
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isLoading}
                disabled={isLoading}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                campaignDateLocked={campaignDateLocked}
                campaignDateLabel={campaignDateLabel}
                platforms={platforms}
                selectedPlatforms={selectedPlatforms}
                onPlatformToggle={togglePlatform}
                hasSelectedPlatforms={hasSelectedPlatforms}
                images={images}
                onAddImages={addImages}
                onRemoveImage={removeImage}
                documents={documents}
                onAddFile={addDocument}
                onRemoveDocument={removeDocument}
                onAddPastedText={addPastedText}
                draft={composerDraft}
                onTranscribeAudio={handleTranscribeAudio}
              />
            </>
          )}
        </div>

        {(canvas.isOpen && canvasPaneProps) || (isBasic && brief?.best_post) ? (
          // One column for both the best post and a real document, kept mounted so it
          // slides out and back in rather than snapping. max-width stays constant — only
          // width animates (animating max-width is what made Close snap).
          <div
            aria-hidden={!(canvas.isOpen || bestPostOpen)}
            className={`hidden md:block h-full shrink-0 overflow-hidden transition-[width,opacity,transform] duration-[420ms] ease-[cubic-bezier(0.22,0.8,0.2,1)] ${
              canvas.isOpen || bestPostOpen
                ? 'opacity-100 translate-x-0 border-l border-tertiary'
                : 'opacity-0 translate-x-8'
            }`}
            style={{ width: canvas.isOpen || bestPostOpen ? canvasWidth : 0 }}
          >
            <div
              className="h-full"
              style={{ width: Math.round(canvasWidth / CANVAS_ZOOM), zoom: CANVAS_ZOOM }}
            >
              {canvas.isOpen && canvasPaneProps ? (
                <div key="document" className="h-full mia-fade-in">
                  <CanvasPane {...canvasPaneProps} onClose={canvas.close} />
                </div>
              ) : brief?.best_post ? (
                <div key="best-post" className="h-full mia-fade-in">
                  <BestPostCanvas
                    post={brief.best_post}
                    windowLabel={brief.window_label}
                    brandName={activeWorkspace?.name}
                    onClose={() => setBestPost(false)}
                    onMakeAnother={makeAnotherCard ? handleMakeAnother : undefined}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile canvas — full-screen sheet over the chat */}
      {isMobile && canvasPaneProps && (
        <Sheet
          isOpen={mobileCanvasOpen}
          onClose={() => setMobileCanvasOpen(false)}
          fullScreen
          showHandle={false}
        >
          <CanvasPane {...canvasPaneProps} onClose={() => setMobileCanvasOpen(false)} />
        </Sheet>
      )}

      {/* Phone: the best post is a bottom sheet, opened from the peek card or "Make another like it". */}
      {isMobile && isBasic && brief?.best_post && !canvas.document && (
        <Sheet
          isOpen={bestPostSheetOpen}
          onClose={() => setBestPostSheetOpen(false)}
          position="bottom"
          className="h-[88%]"
        >
          <BestPostCanvas
            compact
            post={brief.best_post}
            windowLabel={brief.window_label}
            brandName={activeWorkspace?.name}
            onClose={() => setBestPostSheetOpen(false)}
            onMakeAnother={
              makeAnotherCard
                ? () => {
                    setBestPostSheetOpen(false)
                    handleMakeAnother()
                  }
                : undefined
            }
          />
        </Sheet>
      )}

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={closeFeedbackModal}
        onSubmit={handleFeedbackModalSubmit}
      />

      {integrationPrompt && (
        <IntegrationPromptModal
          isOpen={showIntegrationPrompt}
          title={integrationPrompt.title}
          message={integrationPrompt.message}
          missing={integrationPrompt.missing}
          primaryActionLabel={integrationPrompt.primaryActionLabel}
          onPrimaryAction={handleIntegrationPromptAction}
          onClose={handleIntegrationPromptClose}
        />
      )}
    </ChatLayout>
  )
}

export default ChatView
