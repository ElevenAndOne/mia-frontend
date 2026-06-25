import type { ReactNode } from 'react'
import { Breadcrumbs, type Crumb } from './breadcrumbs'

interface TopBarProps {
  title: string
  /** Full breadcrumb trail. Defaults to `Home › {title}` when omitted. */
  breadcrumbs?: Crumb[]
  rightSlot?: ReactNode
  className?: string
  /** Accepted for backwards-compat; navigation now happens via breadcrumbs. */
  onBack?: () => void
  backLabel?: string
}

/**
 * Page header: a small clickable breadcrumb trail above the page title.
 * (The old back arrow + ⌘K trigger were removed — breadcrumbs handle "up"
 * navigation and the command palette now lives in the sidebar.)
 */
export function TopBar({ title, breadcrumbs, rightSlot, className = '' }: TopBarProps) {
  const crumbs: Crumb[] = breadcrumbs ?? [{ label: 'Home', to: '/home' }, { label: title }]

  return (
    <div className={`px-5 pt-2.5 pb-3 bg-[var(--ui-topbar)] border-b border-tertiary shrink-0 ${className}`}>
      <Breadcrumbs items={crumbs} />
      <div className="flex items-center gap-2 mt-1.5">
        <h1
          className="text-primary font-semibold"
          style={{ fontFamily: 'Geologica, sans-serif', fontSize: '18px', lineHeight: '120%' }}
        >
          {title}
        </h1>
        <div className="flex-1" />
        {rightSlot}
      </div>
    </div>
  )
}
