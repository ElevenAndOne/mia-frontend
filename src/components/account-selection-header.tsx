import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BackButton } from './back-button'

interface AccountSelectionHeaderProps {
  title: string
  subtitle?: string
  leading?: ReactNode
  onBack?: () => void
}

export const AccountSelectionHeader = ({
  title,
  subtitle,
  leading,
  onBack,
}: AccountSelectionHeaderProps) => {
  return (
    <div className="px-6 pt-4 pb-4 text-center">
      {onBack && (
        <div className="flex justify-start mb-2">
          <BackButton onClick={onBack} size="sm" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {leading && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mb-2"
          >
            {leading}
          </motion.div>
        )}

        <h1 className="title-h6 text-primary mb-1">{title}</h1>
        {subtitle && (
          <p className="paragraph-sm text-tertiary">{subtitle}</p>
        )}
      </motion.div>
    </div>
  )
}
