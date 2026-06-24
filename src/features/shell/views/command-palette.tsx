import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../components/icon'
import { useSession } from '../../../contexts/session-context'
import { usePlugins } from '../../plugins/hooks/use-plugins'
import { useCommandPalette } from '../context/command-palette-context'
import { useRecentConversations } from '../hooks/use-recent-conversations'

type PaletteItem = {
  id: string
  label: string
  sublabel?: string
  group: string
  icon: ReactNode
  run: () => void
}

/**
 * ⌘K command palette — navigation + actions only (no chat queries). Jump to any
 * page, run a quick action, or reopen a recent chat. Fully keyboard-driven.
 */
export const CommandPalette = () => {
  const { isOpen, close } = useCommandPalette()
  const navigate = useNavigate()
  const { sessionId } = useSession()
  const { isEnabled } = usePlugins()
  const { conversations, load } = useRecentConversations(sessionId)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      void load()
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen, load])

  const go = (path: string, state?: Record<string, unknown>) => {
    close()
    navigate(path, state ? { state } : undefined)
  }

  const items = useMemo<PaletteItem[]>(() => {
    const base: PaletteItem[] = [
      {
        id: 'new-chat',
        label: 'New chat',
        group: 'Quick actions',
        icon: <Icon.plus size={17} />,
        run: () => go('/home', { newChat: true }),
      },
      {
        id: 'new-campaign',
        label: 'New campaign',
        group: 'Quick actions',
        icon: <Icon.target_01 size={17} />,
        run: () => go('/campaigns/new'),
      },
      {
        id: 'connect-integration',
        label: 'Connect an integration',
        group: 'Quick actions',
        icon: <Icon.globe_01 size={17} />,
        run: () => go('/integrations'),
      },
      {
        id: 'jump-home',
        label: 'Home',
        group: 'Jump to',
        icon: <Icon.message_chat_circle size={17} />,
        run: () => go('/home'),
      },
      {
        id: 'jump-campaigns',
        label: 'Campaigns',
        group: 'Jump to',
        icon: <Icon.target_01 size={17} />,
        run: () => go('/campaigns'),
      },
      ...(isEnabled('mia-creative-studio')
        ? [
            {
              id: 'jump-mia-create',
              label: 'Mia Create',
              group: 'Jump to',
              icon: <Icon.stars_01 size={17} />,
              run: () => go('/creative-studio'),
            } as PaletteItem,
          ]
        : []),
      {
        id: 'jump-reports',
        label: 'Reports',
        group: 'Jump to',
        icon: <Icon.file_02 size={17} />,
        run: () => go('/reports'),
      },
      {
        id: 'jump-budget',
        label: 'Budget Tracker',
        group: 'Jump to',
        icon: <Icon.wallet_01 size={17} />,
        run: () => go('/budget-tracker'),
      },
      {
        id: 'jump-integrations',
        label: 'Integrations',
        group: 'Jump to',
        icon: <Icon.globe_01 size={17} />,
        run: () => go('/integrations'),
      },
      {
        id: 'jump-settings',
        label: 'Workspace Settings',
        group: 'Jump to',
        icon: <Icon.settings_01 size={17} />,
        run: () => go('/settings/workspace'),
      },
    ]

    const chatItems: PaletteItem[] = conversations.slice(0, 6).map((c) => ({
      id: `chat-${c.conversation_id}`,
      label: c.title || 'Chat',
      group: 'Recent chats',
      icon: <Icon.message_chat_square size={17} />,
      run: () => go('/home', { loadConversationId: c.conversation_id }),
    }))

    return [...base, ...chatItems]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, isEnabled])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q)
    )
  }, [items, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[activeIndex]?.run()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  // Render grouped, tracking the flat index so arrow keys + highlight line up.
  let flatIndex = -1
  let lastGroup = ''

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-overlay/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-full max-w-[560px] max-h-[74%] flex flex-col bg-secondary border border-primary rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-tertiary">
          <Icon.search_md size={18} className="text-quaternary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, campaigns, chats — or run a command"
            className="flex-1 bg-transparent outline-none paragraph-md text-primary placeholder:text-quaternary"
          />
          <button
            onClick={close}
            aria-label="Close"
            className="paragraph-xs text-quaternary border border-tertiary rounded px-1.5 py-0.5 hover:text-secondary hover:border-secondary transition-colors"
          >
            esc
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center paragraph-sm text-quaternary">No results</div>
          ) : (
            filtered.map((item) => {
              flatIndex += 1
              const idx = flatIndex
              const showGroup = item.group !== lastGroup
              lastGroup = item.group
              return (
                <div key={item.id}>
                  {showGroup && (
                    <div className="px-3 pt-3 pb-1.5 paragraph-xs uppercase tracking-wide text-quaternary">
                      {item.group}
                    </div>
                  )}
                  <button
                    onMouseMove={() => setActiveIndex(idx)}
                    onClick={() => item.run()}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      idx === activeIndex ? 'bg-tertiary' : 'hover:bg-tertiary/60'
                    }`}
                  >
                    <span className={idx === activeIndex ? 'text-brand-primary' : 'text-quaternary'}>
                      {item.icon}
                    </span>
                    <span className="flex-1 min-w-0 paragraph-sm text-secondary truncate">
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span className="paragraph-xs text-quaternary shrink-0">{item.sublabel}</span>
                    )}
                    {idx === activeIndex && (
                      <kbd className="paragraph-xs text-quaternary shrink-0">↵</kbd>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-tertiary paragraph-xs text-quaternary">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <span className="flex-1" />
          <span>
            Open anywhere with{' '}
            <kbd className="border border-tertiary rounded px-1.5 py-0.5">⌘K</kbd>
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
