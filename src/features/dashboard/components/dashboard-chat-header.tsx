import type { RefObject } from 'react'

interface DashboardChatHeaderProps {
  dateRangeLabel: string
  onBack: () => void
  onOpenDatePicker: () => void
  datePickerButtonRef: RefObject<HTMLButtonElement | null>
}

export const DashboardChatHeader = ({
  dateRangeLabel,
  onBack,
  onOpenDatePicker,
  datePickerButtonRef,
}: DashboardChatHeaderProps) => {
  return (
    <div className="flex items-center px-4 py-1 safe-top relative z-20 shrink-0 justify-between">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-full border border-tertiary text-primary subheading-md hover:bg-tertiary transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <h2 className="absolute left-1/2 transform -translate-x-1/2 label-bg text-primary">Mia</h2>

      <button
        ref={datePickerButtonRef}
        type="button"
        onClick={onOpenDatePicker}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary rounded-full border border-secondary subheading-md text-secondary hover:bg-secondary transition-colors whitespace-nowrap"
        title="Change date range"
      >
        <img src="/icons/calendar.svg" alt="Calendar" className="w-3.5 h-3.5" />
        <span>{dateRangeLabel}</span>
      </button>
    </div>
  )
}
