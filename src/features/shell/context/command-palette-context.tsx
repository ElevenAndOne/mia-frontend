import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface CommandPaletteContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export const CommandPaletteProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  // Global ⌘K / Ctrl-K opens the palette from anywhere.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle])

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- useCommandPalette hook must be co-located with CommandPaletteProvider
export const useCommandPalette = () => {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  return ctx
}

// Safe variant for components (e.g. the header trigger) that may render outside a
// provider — returns null instead of throwing.
// eslint-disable-next-line react-refresh/only-export-components -- co-located with CommandPaletteProvider
export const useOptionalCommandPalette = () => useContext(CommandPaletteContext)
