import { useEffect, useRef, useState } from 'react'
import { ChevronLeftDouble } from '../../../components/icon/chevron-left-double'
import { ChevronRightDouble } from '../../../components/icon/chevron-right-double'
import { ChevronUp } from '../../../components/icon/chevron-up'
import { LogOut01 } from '../../../components/icon/log-out-01'
import { Settings01 } from '../../../components/icon/settings-01'
import { UserAvatar } from '../../../components/user-avatar'

/**
 * The agency sidebar's foot (Josh, 20 Nov 2026): one row for who is signed in, with Settings and
 * Sign out in a small menu above it, and the collapse arrow beside it. It used to be three rows
 * (a red Sign Out, the account card, a Collapse bar).
 */
export const SidebarAccount = ({
  name,
  email,
  pictureUrl,
  collapsed,
  onToggleCollapsed,
  onSettings,
  onSignOut,
}: {
  name: string
  email: string
  pictureUrl?: string | null
  collapsed: boolean
  onToggleCollapsed: () => void
  onSettings: () => void
  onSignOut: () => void
}) => {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const item =
    'w-full flex items-center gap-3 px-3 py-2 rounded-lg paragraph-sm transition-colors text-left'

  return (
    <div ref={box} className="relative border-t border-tertiary">
      {open && (
        <div
          role="menu"
          className={`absolute bottom-full mb-2 z-30 rounded-xl border border-secondary bg-primary shadow-lg p-1.5 ${
            collapsed ? 'left-2 w-56' : 'left-3 right-3'
          }`}
        >
          <div className="px-3 py-2 border-b border-tertiary mb-1">
            <p className="label-md text-primary truncate">{name}</p>
            {email ? <p className="paragraph-xs text-quaternary truncate">{email}</p> : null}
          </div>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-secondary hover:bg-secondary hover:text-primary`}
            onClick={() => {
              setOpen(false)
              onSettings()
            }}
          >
            <Settings01 size={16} />
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-error hover:bg-error-primary`}
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
          >
            <LogOut01 size={16} />
            Sign out
          </button>
        </div>
      )}

      <div className={`flex items-center gap-1 py-2 ${collapsed ? 'flex-col px-2' : 'px-3'}`}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          title={collapsed ? name : undefined}
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-3 rounded-lg py-1.5 transition-colors hover:bg-secondary ${
            collapsed ? 'justify-center px-1' : 'flex-1 min-w-0 px-2'
          } ${open ? 'bg-secondary' : ''}`}
        >
          <UserAvatar name={name} imageUrl={pictureUrl ?? undefined} size="sm" />
          {!collapsed && (
            <>
              <span className="flex-1 min-w-0 text-left">
                <span className="block label-md text-primary truncate">{name}</span>
                {email ? <span className="block paragraph-xs text-quaternary truncate">{email}</span> : null}
              </span>
              <ChevronUp
                size={14}
                className={`shrink-0 text-quaternary transition-transform ${open ? '' : 'rotate-180'}`}
              />
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-secondary transition-colors"
        >
          {collapsed ? <ChevronRightDouble size={16} /> : <ChevronLeftDouble size={16} />}
        </button>
      </div>
    </div>
  )
}
