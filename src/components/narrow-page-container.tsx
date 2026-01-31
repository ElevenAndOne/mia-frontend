import type { ReactNode } from 'react'

interface NarrowPageContainerProps {
  children: ReactNode
  className?: string
  scroll?: boolean
  centered?: boolean
}

export const NarrowPageContainer = ({
  children,
  className = '',
  scroll = true,
  centered = false,
}: NarrowPageContainerProps) => {
  const scrollClass = scroll ? 'overflow-y-auto' : 'overflow-hidden'
  const centeredClass = centered ? 'flex items-center justify-center' : ''

  return (
    <div
      className={`w-full h-full bg-primary max-w-[393px] mx-auto ${scrollClass} ${centeredClass} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
