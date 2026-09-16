import type { ReactNode } from 'react'
import { ArrowLeft } from './icon/arrow-left'
import { Breadcrumbs, type Crumb } from './breadcrumbs'

interface TopBarProps {
  title: string
  /** Full breadcrumb trail. Defaults to `Home › {title}` when omitted. */
  breadcrumbs?: Crumb[]
  rightSlot?: ReactNode
  className?: string
  /** Where "back" goes. Renders an arrow beside the title when given. */
  onBack?: () => void
  backLabel?: string
}

/**
 * Page header: a breadcrumb trail, a back arrow, and the page title.
 *
 * The arrow was removed once on the grounds that breadcrumbs cover "up". They do not
 * cover it well enough: a trail is a location, an arrow is an exit, and a page reached
 * from somewhere with no nav entry of its own (Connections, from Workspace settings on
 * Basic) needs the exit to be obvious. It only renders when a caller passes onBack.
 */
export function TopBar({
  title,
  breadcrumbs,
  rightSlot,
  className = '',
  onBack,
  backLabel = 'Back',
}: TopBarProps) {
  const crumbs: Crumb[] = breadcrumbs ?? [{ label: 'Home', to: '/home' }, { label: title }]

  return (
    <div className={`px-5 pt-2.5 pb-3 bg-primary border-b border-tertiary shrink-0 ${className}`}>
      <Breadcrumbs items={crumbs} />
      <div className="flex items-center gap-2 mt-1.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            title={backLabel}
            className="-ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-quaternary hover:text-primary hover:bg-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-utility-info-500"
          >
            <ArrowLeft size={18} />
          </button>
        )}
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
