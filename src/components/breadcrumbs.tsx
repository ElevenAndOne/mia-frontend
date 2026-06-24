import { useNavigate } from 'react-router-dom'

export interface Crumb {
  label: string
  /** When set (and not the last crumb), the crumb is a clickable link. */
  to?: string
}

/**
 * Small, clickable breadcrumb trail. The last crumb is the current page (not a link).
 */
export const Breadcrumbs = ({ items }: { items: Crumb[] }) => {
  const navigate = useNavigate()

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap">
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
            {crumb.to && !isLast ? (
              <button
                onClick={() => navigate(crumb.to!)}
                className="paragraph-xs text-quaternary hover:text-secondary transition-colors"
              >
                {crumb.label}
              </button>
            ) : (
              <span
                className={`paragraph-xs ${isLast ? 'text-secondary font-medium' : 'text-quaternary'}`}
              >
                {crumb.label}
              </span>
            )}
            {!isLast && <span className="paragraph-xs text-quaternary/50">/</span>}
          </span>
        )
      })}
    </nav>
  )
}
