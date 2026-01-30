import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ModalShellProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  overlayClassName?: string
  panelClassName?: string
  closeOnOverlayClick?: boolean
}

const OVERLAY_BASE = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
const PANEL_BASE = 'bg-white rounded-2xl shadow-2xl w-full'

export const ModalShell = ({
  isOpen,
  onClose,
  children,
  overlayClassName = '',
  panelClassName = '',
  closeOnOverlayClick = true
}: ModalShellProps) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`${OVERLAY_BASE} ${overlayClassName}`.trim()}
        onClick={closeOnOverlayClick ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`${PANEL_BASE} ${panelClassName}`.trim()}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)
