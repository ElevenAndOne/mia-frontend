interface SaveDraftButtonProps {
  onClick: () => void
  disabled?: boolean
}

// Replaces Mia's "Type yes to save as draft." line under a campaign summary.
export const SaveDraftButton = ({ onClick, disabled = false }: SaveDraftButtonProps) => (
  <div className="flex flex-wrap items-center gap-3 mt-3">
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-full bg-brand-solid text-primary-onbrand paragraph-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Save as draft
    </button>
    <span className="paragraph-xs text-quaternary">or reply with any changes</span>
  </div>
)

export default SaveDraftButton
