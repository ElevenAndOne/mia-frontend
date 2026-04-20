import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { DateRangePopover } from './date-range-sheet'
import PlatformSelector from './platform-selector'
import { Icon } from '../../../components/icon'
import { Popover } from '../../overlay'
import { WorkspaceListItem } from '../../workspace/components/workspace-list-item'
import { useSession } from '../../../contexts/session-context'
import { useWorkspaceSwitcher } from '../../workspace/hooks/use-workspace-switcher'
import { formatDateRangeDisplay } from '../../../utils/date-range'
import type { Platform } from '../types'

interface ChatInputProps {
  onSubmit: (message: string) => void
  onCancel?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  dateRange: string
  onDateRangeChange: (range: string) => void
  platforms: Platform[]
  selectedPlatforms: string[]
  onPlatformToggle: (platformId: string) => void
  hasSelectedPlatforms?: boolean
}

export const ChatInput = ({ onSubmit, onCancel, isLoading = false, disabled = false, placeholder = 'Start chatting...', dateRange, onDateRangeChange, platforms, selectedPlatforms, onPlatformToggle, hasSelectedPlatforms = false }: ChatInputProps) => {
  const [message, setMessage] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPlatformSelector, setShowPlatformSelector] = useState(false)
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const calendarButtonRef = useRef<HTMLButtonElement>(null)
  const platformButtonRef = useRef<HTMLButtonElement>(null)
  const workspaceButtonRef = useRef<HTMLButtonElement>(null)

  const { activeWorkspace, availableWorkspaces, switchWorkspace, refreshWorkspaces, refreshAccounts } = useSession()
  const { switchingId, handleSwitch } = useWorkspaceSwitcher({
    activeWorkspaceId: activeWorkspace?.tenant_id,
    switchWorkspace,
    onSuccess: () => setShowWorkspaceSwitcher(false),
    refreshAfterSwitch: async () => {
      await refreshAccounts()
      await refreshWorkspaces()
    },
    reloadOnSuccess: false,
  })

  const handleSubmit = () => {
    if (message.trim() && !disabled && hasSelectedPlatforms) {
      onSubmit(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // FEB 2026: Removed auto-focus on mount - bad UX on mobile
  // Opens keyboard immediately when page loads, taking up screen space
  // User can tap input when they want to type

  const canSubmit = message.trim() && !disabled && hasSelectedPlatforms

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 md:pb-6">
      {/* Main input container */}
      <div className="bg-tertiary rounded-2xl overflow-visible">
        {/* Text input row */}
        <div className="px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="Chat message"
            className="w-full bg-transparent outline-none text-primary placeholder:text-placeholder paragraph-md"
          />
        </div>

        {/* Toolbar row */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1 relative">
            {/* Calendar button */}
            <button
              ref={calendarButtonRef}
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="h-10 px-3 rounded-full bg-quaternary flex items-center gap-1.5 text-tertiary hover:bg-tertiary transition-colors"
              title="Select date range"
            >
              <Icon.calendar size={18} />
              <span className="paragraph-xs text-tertiary">{formatDateRangeDisplay(dateRange, 'short')}</span>
            </button>

            <DateRangePopover
              isOpen={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              anchorRef={calendarButtonRef}
              selectedRange={dateRange}
              onSelect={onDateRangeChange}
            />

            {/* Platform selector button */}
            <div className="relative">
              <button
                ref={platformButtonRef}
                type="button"
                onClick={() => setShowPlatformSelector(!showPlatformSelector)}
                className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center text-tertiary hover:bg-tertiary transition-colors"
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

            {/* Workspace switcher button */}
            <div className="relative">
              <button
                ref={workspaceButtonRef}
                type="button"
                onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
                className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center text-tertiary hover:bg-tertiary transition-colors"
                title={`Switch workspace (${activeWorkspace?.name || 'None'})`}
              >
                <Icon.switch_horizontal_01 size={18} />
              </button>

              <Popover
                isOpen={showWorkspaceSwitcher}
                onClose={() => setShowWorkspaceSwitcher(false)}
                anchorRef={workspaceButtonRef}
                placement="top"
                className="w-72"
                mobileAdaptation="none"
              >
                <div className="flex flex-col gap-1 px-2 py-2 max-h-64 overflow-y-auto">
                  {availableWorkspaces.map((workspace) => (
                    <WorkspaceListItem
                      key={workspace.tenant_id}
                      workspace={workspace}
                      isActive={workspace.tenant_id === activeWorkspace?.tenant_id}
                      isSwitching={switchingId === workspace.tenant_id}
                      onSelect={handleSwitch}
                    />
                  ))}
                </div>
              </Popover>
            </div>

          </div>

          {/* Stop button (while loading) or Submit button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-10 h-10 flex items-center justify-center text-white hover:opacity-70 transition-opacity"
              title="Stop generating"
            >
              <svg viewBox="0 0 24 24" width={20} height={20} fill="white">
                <path d="M3 7.8C3 6.11984 3 5.27976 3.32698 4.63803C3.6146 4.07354 4.07354 3.6146 4.63803 3.32698C5.27976 3 6.11984 3 7.8 3H16.2C17.8802 3 18.7202 3 19.362 3.32698C19.9265 3.6146 20.3854 4.07354 20.673 4.63803C21 5.27976 21 6.11984 21 7.8V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V7.8Z"/>
                <path d="M8 9.6C8 9.03995 8 8.75992 8.10899 8.54601C8.20487 8.35785 8.35785 8.20487 8.54601 8.10899C8.75992 8 9.03995 8 9.6 8H14.4C14.9601 8 15.2401 8 15.454 8.10899C15.6422 8.20487 15.7951 8.35785 15.891 8.54601C16 8.75992 16 9.03995 16 9.6V14.4C16 14.9601 16 15.2401 15.891 15.454C15.7951 15.6422 15.6422 15.7951 15.454 15.891C15.2401 16 14.9601 16 14.4 16H9.6C9.03995 16 8.75992 16 8.54601 15.891C8.35785 15.7951 8.20487 15.6422 8.10899 15.454C8 15.2401 8 14.9601 8 14.4V9.6Z" fill="#1a1a2e"/>
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
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

    </div>
  )
}

export default ChatInput
