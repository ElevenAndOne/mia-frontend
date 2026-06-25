import React, { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { DateRangePopover } from './date-range-sheet'
import PlatformSelector from './platform-selector'
import { VoiceWaveform } from './voice-waveform'
import { Icon } from '../../../components/icon'
import { formatDateRangeDisplay } from '../../../utils/date-range'
import type { Platform } from '../types'
import type { AttachedDocument } from '../services/chat-service'

interface ChatInputProps {
  onSubmit: (message: string) => void
  onCancel?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  dateRange: string
  onDateRangeChange: (range: string) => void
  campaignDateLocked?: boolean
  campaignDateLabel?: string
  platforms: Platform[]
  selectedPlatforms: string[]
  onPlatformToggle: (platformId: string) => void
  hasSelectedPlatforms?: boolean
  images?: string[]
  onAddImages?: (images: string[]) => void
  onRemoveImage?: (index: number) => void
  documents?: AttachedDocument[]
  onAddFile?: (file: File) => Promise<void>
  onRemoveDocument?: (index: number) => void
  onTranscribeAudio?: (blob: Blob, mimeType: string) => Promise<string>
}

type MicState = 'idle' | 'recording' | 'processing' | 'error'

// Anthropic rejects images whose longest edge exceeds 8000px and downscales
// anything over ~1568px anyway, so shrink large uploads client-side. Drawing
// through a canvas also normalizes the format — clipboard items frequently
// report the wrong MIME type (e.g. image/jpeg for PNG data), which the API 400s.
const MAX_IMAGE_EDGE = 1568

const resizeImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(w * scale))
      canvas.height = Math.max(1, Math.round(h * scale))
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) {
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })

export const ChatInput = ({
  onSubmit,
  onCancel,
  isLoading = false,
  disabled = false,
  placeholder = 'Start chatting...',
  dateRange,
  onDateRangeChange,
  campaignDateLocked = false,
  campaignDateLabel,
  platforms,
  selectedPlatforms,
  onPlatformToggle,
  hasSelectedPlatforms = false,
  images = [],
  onAddImages,
  onRemoveImage,
  documents = [],
  onAddFile,
  onRemoveDocument,
  onTranscribeAudio,
}: ChatInputProps) => {
  const [message, setMessage] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPlatformSelector, setShowPlatformSelector] = useState(false)
  const [micState, setMicState] = useState<MicState>('idle')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const calendarButtonRef = useRef<HTMLButtonElement>(null)
  const platformButtonRef = useRef<HTMLButtonElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const dragDepthRef = useRef(0)

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSubmit(message.trim())
      setMessage('')
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onAddImages) return
      const imageItems = Array.from(e.clipboardData.items).filter((item) =>
        item.type.startsWith('image/')
      )
      if (imageItems.length === 0) return
      e.preventDefault()
      const remaining = 10 - images.length
      const files = imageItems
        .slice(0, remaining)
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null)
      Promise.all(files.map(resizeImageFile))
        .then((urls) => {
          if (urls.length) onAddImages(urls)
        })
        .catch((err) => console.error('[chat-input] paste image error:', err))
    },
    [images.length, onAddImages]
  )

  const handleFileChange = useCallback(
    async (files: FileList | null) => {
      if (!files) return
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const imageFiles: File[] = []
      const otherFiles: File[] = []
      Array.from(files).forEach((f) => {
        if (imageTypes.includes(f.type)) imageFiles.push(f)
        else otherFiles.push(f)
      })

      // Images: downscale client-side to stay within Anthropic's size limits
      if (imageFiles.length > 0 && onAddImages) {
        const remaining = 10 - images.length
        const toRead = imageFiles.slice(0, remaining)
        const dataUrls = await Promise.all(toRead.map(resizeImageFile))
        onAddImages(dataUrls)
      }

      // Docs/other: upload to backend for parsing
      if (otherFiles.length > 0 && onAddFile) {
        setIsUploading(true)
        setUploadError('')
        try {
          await Promise.all(otherFiles.map((f) => onAddFile(f)))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setUploadError(msg)
          console.error('[chat-input] file upload error:', err)
        } finally {
          setIsUploading(false)
        }
      }
    },
    [images.length, onAddImages, onAddFile]
  )

  const canAttach = Boolean(onAddImages || onAddFile)

  // Drag depth counter avoids flicker: dragenter/dragleave fire for every child
  // element, so we only clear the overlay once we've left the container itself.
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!canAttach || !Array.from(e.dataTransfer.types).includes('Files')) return
      e.preventDefault()
      dragDepthRef.current += 1
      setIsDragging(true)
    },
    [canAttach]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isDragging) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    [isDragging]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!isDragging) return
      e.preventDefault()
      dragDepthRef.current -= 1
      if (dragDepthRef.current <= 0) {
        dragDepthRef.current = 0
        setIsDragging(false)
      }
    },
    [isDragging]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!canAttach) return
      e.preventDefault()
      dragDepthRef.current = 0
      setIsDragging(false)
      if (e.dataTransfer.files?.length) handleFileChange(e.dataTransfer.files)
    },
    [canAttach, handleFileChange]
  )

  const startRecording = useCallback(async () => {
    if (!onTranscribeAudio) return

    // getUserMedia requires HTTPS (or localhost) — not available on plain HTTP LAN addresses
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState('error')
      setTimeout(() => setMicState('idle'), 3000)
      return
    }

    // Check current permission state without consuming the user gesture
    let permissionDenied = false
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      permissionDenied = perm.state === 'denied'
    } catch {
      // Permissions API unavailable — fall through to getUserMedia
    }

    if (permissionDenied) {
      setMicState('error')
      setTimeout(() => setMicState('idle'), 3000)
      return
    }

    // Show spinner immediately — getUserMedia is async and permission prompt may take a moment
    setMicState('processing')
    try {
      // This triggers the browser permission dialog if not yet granted
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setActiveStream(stream)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const recorder = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setActiveStream(null)
        setMicState('processing')
        try {
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          const transcript = await onTranscribeAudio(blob, mimeType)
          if (transcript) {
            const currentText = inputRef.current?.value?.trim() ?? ''
            const fullMessage = currentText ? `${currentText} ${transcript}` : transcript
            if (!disabled) {
              onSubmit(fullMessage)
              setMessage('')
              if (inputRef.current) inputRef.current.style.height = 'auto'
            } else {
              // Can't send yet — populate input instead
              setMessage(fullMessage)
              if (inputRef.current) {
                inputRef.current.style.height = 'auto'
                inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
              }
            }
          }
        } finally {
          setMicState('idle')
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setMicState('recording')
    } catch {
      setMicState('error')
      setTimeout(() => setMicState('idle'), 3000)
    }
  }, [onTranscribeAudio, disabled, hasSelectedPlatforms, onSubmit])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }, [])

  const handleMicClick = useCallback(() => {
    if (micState === 'idle') startRecording()
    else if (micState === 'recording') stopRecording()
  }, [micState, startRecording, stopRecording])

  // FEB 2026: Removed auto-focus on mount - bad UX on mobile

  const canSubmit = message.trim() && !disabled

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 md:pb-6">
      {uploadError && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-error-secondary text-error-primary paragraph-xs">
          <Icon.alert_circle size={13} className="shrink-0" />
          <span>Upload failed: {uploadError}</span>
          <button type="button" onClick={() => setUploadError('')} className="ml-auto shrink-0">
            <Icon.x_close size={11} />
          </button>
        </div>
      )}
      {/* Attachment preview strip — images + document pills */}
      {(images.length > 0 || documents.length > 0) && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {images.map((src, i) => (
            <div key={`img-${i}`} className="relative group">
              <img
                src={src}
                alt={`attachment ${i + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-tertiary"
              />
              {onRemoveImage && (
                <button
                  type="button"
                  onClick={() => onRemoveImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-quaternary flex items-center justify-center touch-manipulation opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                  <Icon.x_close size={11} />
                </button>
              )}
            </div>
          ))}
          {documents.map((doc, i) => (
            <div key={`doc-${i}`} className="relative group flex items-center gap-1.5 px-3 py-2 rounded-lg border border-tertiary bg-quaternary max-w-[200px]">
              <Icon.file_attachment_01 size={14} className="text-tertiary shrink-0" />
              <span className="paragraph-xs text-secondary truncate">{doc.filename}</span>
              {onRemoveDocument && (
                <button
                  type="button"
                  onClick={() => onRemoveDocument(i)}
                  className="shrink-0 w-5 h-5 rounded-full bg-tertiary flex items-center justify-center touch-manipulation opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-1"
                >
                  <Icon.x_close size={9} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main input container */}
      <div
        className="relative bg-[var(--ui-chat)] rounded-2xl overflow-visible"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-and-drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-brand-solid bg-tertiary/90 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-secondary paragraph-sm">
              <Icon.upload_cloud_02 size={18} />
              <span>Drop images or files to attach</span>
            </div>
          </div>
        )}
        {/* Recording overlay — replaces text area + toolbar */}
        {micState === 'recording' && (
          <div className="flex items-center gap-3 px-4 py-4">
            {/* Pulsing mic dot */}
            <div className="w-7 h-7 rounded-full bg-quaternary flex items-center justify-center shrink-0 animate-pulse">
              <Icon.microphone_01 size={13} className="text-tertiary" />
            </div>

            {/* Live waveform — fills remaining space */}
            <div className="flex-1 flex items-end justify-between px-2">
              <VoiceWaveform stream={activeStream} />
            </div>

            {/* Stop button */}
            <button
              type="button"
              onClick={stopRecording}
              className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center shrink-0 hover:bg-tertiary transition-colors touch-manipulation"
              title="Stop recording"
            >
              <svg viewBox="0 0 24 24" width={14} height={14}>
                <rect x="4" y="4" width="16" height="16" rx="2" className="fill-tertiary" />
              </svg>
            </button>
          </div>
        )}

        {/* Text input row — hidden during recording */}
        {micState !== 'recording' && (
          <div className="px-4 py-3">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={disabled}
              aria-label="Chat message"
              rows={1}
              className="w-full bg-transparent outline-none text-primary placeholder:text-placeholder paragraph-md resize-none overflow-y-auto max-h-40"
            />
          </div>
        )}

        {/* Toolbar row — hidden during recording */}
        {micState !== 'recording' && (
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1 relative">
            {/* Calendar button — non-interactive when a campaign locks the date range */}
            <button
              ref={calendarButtonRef}
              type="button"
              onClick={campaignDateLocked ? undefined : () => setShowDatePicker(!showDatePicker)}
              className={`h-11 px-3 rounded-full bg-quaternary flex items-center gap-1.5 text-tertiary transition-colors touch-manipulation ${
                campaignDateLocked ? 'pointer-events-none cursor-default' : 'hover:bg-tertiary'
              }`}
              title={campaignDateLocked ? 'Date range locked to campaign' : 'Select date range'}
            >
              <Icon.calendar size={18} />
              <span className="paragraph-xs text-tertiary">
                {campaignDateLocked && campaignDateLabel
                  ? campaignDateLabel
                  : formatDateRangeDisplay(dateRange, 'short')}
              </span>
            </button>

            {!campaignDateLocked && (
              <DateRangePopover
                isOpen={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                anchorRef={calendarButtonRef}
                selectedRange={dateRange}
                onSelect={onDateRangeChange}
              />
            )}

            {/* Platform selector button */}
            <div className="relative">
              <button
                ref={platformButtonRef}
                type="button"
                onClick={() => setShowPlatformSelector(!showPlatformSelector)}
                className="w-11 h-11 rounded-full bg-quaternary flex items-center justify-center text-tertiary hover:bg-tertiary transition-colors touch-manipulation"
                title="Select platforms"
              >
                <Icon.tool_01 size={18} />
              </button>

              <PlatformSelector
                isOpen={showPlatformSelector}
                onClose={() => setShowPlatformSelector(false)}
                platforms={platforms}
                selectedPlatforms={selectedPlatforms}
                onToggle={onPlatformToggle}
                anchorRef={platformButtonRef}
              />
            </div>

            {/* Attachment button — images, CSV, Excel, PDF, Markdown */}
            {(onAddImages || onAddFile) && (
              <>
                <input
                  id="chat-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,text/csv,application/csv,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.xlsx,.xls,application/pdf,.pdf,text/markdown,.md,.markdown"
                  multiple
                  className="sr-only"
                  onChange={(e) => { handleFileChange(e.target.files); e.target.value = '' }}
                  disabled={isUploading}
                />
                <label
                  htmlFor="chat-file-input"
                  title={isUploading ? 'Uploading…' : 'Attach file or image'}
                  className={[
                    'w-11 h-11 rounded-full bg-quaternary flex items-center justify-center text-tertiary hover:bg-tertiary transition-colors touch-manipulation',
                    isUploading ? 'opacity-40 pointer-events-none' : 'cursor-pointer',
                  ].join(' ')}
                >
                  {isUploading ? (
                    <Icon.loading_01 size={18} className="animate-spin" />
                  ) : (
                    <Icon.attachment_01 size={18} />
                  )}
                </label>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mic button — left of send (idle / processing / error states only; recording shows waveform overlay) */}
            {onTranscribeAudio && !isLoading && (
              <button
                type="button"
                onClick={handleMicClick}
                disabled={micState === 'processing' || micState === 'error'}
                className={[
                  'w-11 h-11 rounded-full flex items-center justify-center transition-all touch-manipulation',
                  micState === 'error'
                    ? 'bg-error-primary text-white'
                    : micState === 'processing'
                      ? 'bg-quaternary text-placeholder-subtle cursor-not-allowed'
                      : 'bg-quaternary text-tertiary hover:bg-tertiary',
                ].join(' ')}
                title={
                  micState === 'error' ? 'Microphone access blocked — check browser permissions' :
                  'Voice input'
                }
              >
                {micState === 'processing' ? (
                  <Icon.loading_01 size={18} className="animate-spin" />
                ) : micState === 'error' ? (
                  <Icon.microphone_off_01 size={18} />
                ) : (
                  <Icon.microphone_01 size={18} />
                )}
              </button>
            )}

            {/* Stop button (while loading) or Submit button */}
            {isLoading ? (
              <button
                type="button"
                onClick={onCancel}
                className="w-11 h-11 flex items-center justify-center text-white hover:opacity-70 transition-opacity touch-manipulation"
                title="Stop generating"
              >
                <svg viewBox="0 0 24 24" width={20} height={20} fill="white">
                  <path d="M3 7.8C3 6.11984 3 5.27976 3.32698 4.63803C3.6146 4.07354 4.07354 3.6146 4.63803 3.32698C5.27976 3 6.11984 3 7.8 3H16.2C17.8802 3 18.7202 3 19.362 3.32698C19.9265 3.6146 20.3854 4.07354 20.673 4.63803C21 5.27976 21 6.11984 21 7.8V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V7.8Z" />
                  <path
                    d="M8 9.6C8 9.03995 8 8.75992 8.10899 8.54601C8.20487 8.35785 8.35785 8.20487 8.54601 8.10899C8.75992 8 9.03995 8 9.6 8H14.4C14.9601 8 15.2401 8 15.454 8.10899C15.6422 8.20487 15.7951 8.35785 15.891 8.54601C16 8.75992 16 9.03995 16 9.6V14.4C16 14.9601 16 15.2401 15.891 15.454C15.7951 15.6422 15.6422 15.7951 15.454 15.891C15.2401 16 14.9601 16 14.4 16H9.6C9.03995 16 8.75992 16 8.54601 15.891C8.35785 15.7951 8.20487 15.6422 8.10899 15.454C8 15.2401 8 14.9601 8 14.4V9.6Z"
                    fill="#1a1a2e"
                  />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all touch-manipulation ${
                  canSubmit
                    ? 'bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover'
                    : 'bg-quaternary text-placeholder-subtle cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Icon.arrow_right size={18} />
              </button>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default ChatInput
