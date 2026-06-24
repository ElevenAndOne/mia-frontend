import { Icon } from '../../../components/icon'
import { useOptionalCommandPalette } from '../context/command-palette-context'

interface CommandPaletteTriggerProps {
  /** 'pill' = search field with label + ⌘K (default); 'icon' = compact icon-only button. */
  variant?: 'pill' | 'icon'
  /** Stretch the pill to fill its container (used in the sidebar). */
  fullWidth?: boolean
  className?: string
}

/**
 * Opens the ⌘K command palette. Lives in the sidebar (and can be dropped anywhere).
 * Renders nothing if no CommandPaletteProvider is present (e.g. print routes).
 */
export const CommandPaletteTrigger = ({
  variant = 'pill',
  fullWidth = false,
  className = '',
}: CommandPaletteTriggerProps) => {
  const palette = useOptionalCommandPalette()
  if (!palette) return null

  if (variant === 'icon') {
    return (
      <button
        onClick={palette.open}
        aria-label="Open command palette"
        className={`flex w-9 h-9 items-center justify-center rounded-lg bg-secondary border border-secondary hover:border-primary text-quaternary hover:text-secondary transition-colors ${className}`}
      >
        <Icon.search_md size={16} />
      </button>
    )
  }

  return (
    <button
      onClick={palette.open}
      aria-label="Open command palette"
      className={`flex items-center gap-2.5 ${fullWidth ? 'w-full' : 'w-[200px]'} px-3 py-1.5 rounded-lg bg-secondary border border-secondary hover:border-primary text-quaternary transition-colors ${className}`}
    >
      <Icon.search_md size={15} className="shrink-0" />
      <span className="flex-1 text-left paragraph-sm truncate">Search or jump to…</span>
      <kbd className="paragraph-xs border border-tertiary rounded px-1.5 py-0.5">⌘K</kbd>
    </button>
  )
}
