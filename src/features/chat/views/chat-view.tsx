import { useState, useEffect, useRef } from 'react'
import ChatLayout from '../components/chat-layout'
import { BackButton } from '../../../components/back-button'
import ChatEmptyState from '../components/chat-empty-state'
import ChatInput from '../components/chat-input'
import ChatMessage from '../components/chat-message'
import ChatMessageList from '../components/chat-message-list'
import { CanvasPane } from '../components/canvas-pane'
import { Sheet } from '../../overlay'
import { useIsMobile } from '../../../hooks/use-is-mobile'
import QuickActions from '../components/quick-actions'
import { RaceCampaignTracker } from '../../campaign/components/race-campaign-tracker'
import { IntegrationPromptModal } from '../../../components/integration-prompt-modal'
import { FeedbackModal } from '../components/feedback-modal'
import { XClose } from '../../../components/icon/x-close'
import { StorageKey } from '../../../constants/storage-keys'
import { setIntegrationHighlight } from '../../integrations/utils/integration-highlight'
import { useChatView } from '../hooks/use-chat-view.tsx'
import { useGoldInsights } from '../../insights/hooks/use-gold-insights'
import { useSession } from '../../../contexts/session-context'
import { trackEvent } from '../../../utils/tracking'

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
    activeCampaign,
    handleCampaignChange,
    canvas,
    editTarget,
    setEditTarget,
  } = useChatView()

  // When a campaign is active, the date picker shows campaign dates and is non-interactive
  const campaignDateLocked = !!activeCampaign
  const campaignDateLabel =
    activeCampaign?.startDate && activeCampaign?.endDate
      ? `${fmtDate(activeCampaign.startDate)} – ${fmtDate(activeCampaign.endDate)}`
      : undefined

  function fmtDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  // Track page visit once
  const tracked = useRef(false)
  useEffect(() => {
    if (!tracked.current && sessionId) {
      tracked.current = true
      trackEvent(sessionId, 'page_visit', 'home')
    }
  }, [sessionId])

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

  // Throttle: only show the integration prompt every 5th chat page visit
  const [shouldShowPromptThisVisit] = useState(() => {
    const count =
      parseInt(localStorage.getItem(StorageKey.INTEGRATION_PROMPT_VISIT_COUNT) || '0', 10) + 1
    localStorage.setItem(StorageKey.INTEGRATION_PROMPT_VISIT_COUNT, String(count))
    return count % 5 === 1 // Show on 1st, 6th, 11th visit...
  })

  // Reset dismissal when missing platforms change
  const missingKey = integrationPrompt?.missingPlatformIds.join('|') ?? ''
  useEffect(() => {
    if (!integrationPrompt) return
    setPromptDismissed(false)
  }, [missingKey, integrationPrompt])

  const showIntegrationPrompt =
    Boolean(integrationPrompt) && !promptDismissed && shouldShowPromptThisVisit

  const handleIntegrationPromptAction = () => {
    if (integrationPrompt) {
      setIntegrationHighlight(integrationPrompt.missingPlatformIds, activeWorkspace?.tenant_id)
    }
    setPromptDismissed(true)
    onIntegrationsClick?.()
  }

  const handleIntegrationPromptClose = () => {
    setPromptDismissed(true)
  }

  // One prop set for both canvas hosts (desktop side pane / mobile sheet) — only
  // onClose differs: the sheet closes itself, the pane closes the canvas state.
  const canvasPaneProps = canvas.document
    ? {
        document: canvas.document,
        documents: canvas.documentList,
        activeId: canvas.activeId,
        onSelect: canvas.select,
        isSaving: canvas.isSaving,
        onRequestEdit: canvas.requestEdit,
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
      <div className="flex-1 flex h-full min-h-0 pt-14 md:pt-0">
       <div className="flex-1 flex flex-col h-full min-h-0 min-w-0">
        {!hasMessages ? (
          <>
            <ChatEmptyState userName={userName}>
              <div className="w-full flex flex-col gap-3">
                <QuickActions
                  onAction={handleQuickAction}
                  disabled={isLoading || !hasSelectedPlatforms}
                  strategiseReady={strategiseReady}
                />
                <RaceCampaignTracker
                  disabled={isLoading}
                  dateRange={dateRange}
                  onCampaignChange={handleCampaignChange}
                />
              </div>
            </ChatEmptyState>

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
              onTranscribeAudio={handleTranscribeAudio}
            />
          </>
        ) : (
          <>
            {/* Desktop back button — sits above messages, no overlap with sidebar */}
            <div className="hidden md:flex items-center px-4 pt-3 pb-1 shrink-0">
              <BackButton onClick={handleBack} label="Back" variant="dark" />
            </div>

            <div ref={scrollContainerRef} onScroll={handleScroll} onWheel={handleWheel} className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-3xl mx-auto px-4 py-6">
                <ChatMessageList
                  messages={messages}
                  lastUserMsgRef={lastUserMsgRef}
                  onConfirmAction={handleConfirmAction}
                  onCancelAction={handleCancelAction}
                  onFeedback={handleFeedback}
                  pinnedAssetId={editTarget?.asset_id ?? null}
                  onPinAsset={(asset) =>
                    setEditTarget(
                      asset ? { asset_id: asset.asset_id, cdn_url: asset.cdn_url } : null
                    )
                  }
                  onUseAssetInPost={(asset) => {
                    // Pin first so the request carries the asset id — the pinned block
                    // tells Mia to create_document with `Media: asset:{id}`.
                    setEditTarget({ asset_id: asset.asset_id, cdn_url: asset.cdn_url })
                    handleSubmit('Use this image in the post')
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
                  <img
                    src={editTarget.cdn_url}
                    alt=""
                    className="w-6 h-6 rounded object-cover"
                  />
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
              onTranscribeAudio={handleTranscribeAudio}
            />
          </>
        )}
       </div>

       {canvas.isOpen && canvasPaneProps && (
         <div className="hidden md:block w-[45%] max-w-[720px] h-full shrink-0">
           <CanvasPane {...canvasPaneProps} onClose={canvas.close} />
         </div>
       )}
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
