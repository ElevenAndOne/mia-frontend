import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface ResourceCardProps {
  title: string
  description: string
  icon: ReactNode
  href?: string
  onClick?: () => void
}

export const ResourceCard = ({
  title,
  description,
  icon,
  href,
  onClick
}: ResourceCardProps) => {
  const content = (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
        <span className="text-tertiary">{icon}</span>
      </div>
      <div>
        <h3 className="subheading-md text-primary">{title}</h3>
        <p className="paragraph-xs text-quaternary">{description}</p>
      </div>
    </div>
  )

  const baseClasses = 'block w-full bg-secondary border border-secondary rounded-xl p-3 text-left hover:bg-tertiary transition-colors'

  if (href) {
    return (
      <Link to={href} className={baseClasses}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={baseClasses}>
      {content}
    </button>
  )
}

export default ResourceCard
