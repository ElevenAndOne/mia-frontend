import {
  createContext,
  useContext,
  ReactNode,
  forwardRef,
  useEffect,
  useCallback,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/utils'

// Context for Dialog state
interface DialogContextValue {
  isOpen: boolean
  onClose: () => void
  disabled?: boolean
}

const DialogContext = createContext<DialogContextValue | null>(null)

const useDialogContext = () => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog')
  }
  return context
}

// Size variants
type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const sizeStyles: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

// Root Dialog component
export interface DialogProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  disabled?: boolean
}

export const Dialog = ({ isOpen, onClose, children, disabled }: DialogProps) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disabled) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, disabled])

  return (
    <DialogContext.Provider value={{ isOpen, onClose, disabled }}>
      {children}
    </DialogContext.Provider>
  )
}

// Overlay/Backdrop component
export interface DialogOverlayProps {
  className?: string
  children: ReactNode
}

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, children }, ref) => {
    const { isOpen, onClose, disabled } = useDialogContext()

    const handleBackdropClick = useCallback(() => {
      if (!disabled) {
        onClose()
      }
    }, [disabled, onClose])

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
              className
            )}
            onClick={handleBackdropClick}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
)

DialogOverlay.displayName = 'DialogOverlay'

// Content container
export interface DialogContentProps {
  size?: DialogSize
  className?: string
  children: ReactNode
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ size = 'md', className, children }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-hidden flex flex-col',
          sizeStyles[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    )
  }
)

DialogContent.displayName = 'DialogContent'

// Header with optional icon
export interface DialogHeaderProps {
  className?: string
  children: ReactNode
  icon?: ReactNode
  iconClassName?: string
}

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, children, icon, iconClassName }, ref) => {
    const { onClose, disabled } = useDialogContext()

    return (
      <div
        ref={ref}
        className={cn(
          'sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl shrink-0',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconClassName)}>
                {icon}
              </div>
            )}
            <div className="flex-1">{children}</div>
          </div>
          <button
            onClick={onClose}
            disabled={disabled}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }
)

DialogHeader.displayName = 'DialogHeader'

// Title
export interface DialogTitleProps {
  className?: string
  children: ReactNode
}

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold text-gray-900', className)}
    >
      {children}
    </h2>
  )
)

DialogTitle.displayName = 'DialogTitle'

// Description/Subtitle
export interface DialogDescriptionProps {
  className?: string
  children: ReactNode
}

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, children }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-500', className)}
    >
      {children}
    </p>
  )
)

DialogDescription.displayName = 'DialogDescription'

// Body/Content area
export interface DialogBodyProps {
  className?: string
  children: ReactNode
}

export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ className, children }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 overflow-y-auto flex-1', className)}
    >
      {children}
    </div>
  )
)

DialogBody.displayName = 'DialogBody'

// Footer for actions
export interface DialogFooterProps {
  className?: string
  children: ReactNode
}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, children }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0',
        className
      )}
    >
      {children}
    </div>
  )
)

DialogFooter.displayName = 'DialogFooter'

// Close button helper
export interface DialogCloseProps {
  className?: string
  children: ReactNode
  asChild?: boolean
}

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, onClick, ...props }, ref) => {
    const { onClose, disabled } = useDialogContext()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      if (!disabled) {
        onClose()
      }
    }

    return (
      <button
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

DialogClose.displayName = 'DialogClose'

// Export all as namespace for cleaner imports
export {
  Dialog as Root,
  DialogOverlay as Overlay,
  DialogContent as Content,
  DialogHeader as Header,
  DialogTitle as Title,
  DialogDescription as Description,
  DialogBody as Body,
  DialogFooter as Footer,
  DialogClose as Close,
}
