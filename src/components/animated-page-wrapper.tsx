import { type ReactNode, useImperativeHandle, forwardRef, useCallback, useState } from 'react'
import { motion, type Variants, type Transition, AnimatePresence } from 'framer-motion'

/** Animation preset configurations */
export type AnimationPreset = 'fadeIn' | 'slideUp' | 'slideLeft' | 'scaleIn' | 'none'

/** Custom animation configuration */
export interface AnimationConfig {
  initial?: Record<string, number | string>
  animate?: Record<string, number | string>
  exit?: Record<string, number | string>
  transition?: Transition
}

/** Built-in animation presets */
const ANIMATION_PRESETS: Record<AnimationPreset, AnimationConfig> = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
    transition: { duration: 0 },
  },
}

export interface AnimatedPageWrapperProps {
  children: ReactNode
  /** Use a built-in animation preset */
  preset?: AnimationPreset
  /** Provide custom animation config (overrides preset) */
  customAnimation?: AnimationConfig
  /** Additional CSS class for the wrapper */
  className?: string
  /** Whether to animate on mount */
  animateOnMount?: boolean
  /** Unique key for AnimatePresence (triggers re-animation on change) */
  animationKey?: string
}

export interface AnimatedPageWrapperRef {
  /** Replay the entrance animation */
  playAnimation: () => void
}

/**
 * Wrapper component that adds customizable entrance/exit animations to pages.
 *
 * Usage:
 * - Use preset prop for quick configuration: preset="slideUp"
 * - Use customAnimation for full control over animation parameters
 * - Use ref.playAnimation() to replay the animation programmatically
 */
export const AnimatedPageWrapper = forwardRef<AnimatedPageWrapperRef, AnimatedPageWrapperProps>(
  (
    {
      children,
      preset = 'fadeIn',
      customAnimation,
      className = '',
      animateOnMount = true,
      animationKey,
    },
    ref
  ) => {
    const [key, setKey] = useState(() => animationKey || Date.now().toString())

    const playAnimation = useCallback(() => {
      setKey(Date.now().toString())
    }, [])

    useImperativeHandle(ref, () => ({
      playAnimation,
    }), [playAnimation])

    const animation = customAnimation || ANIMATION_PRESETS[preset]
    const variants: Variants = {
      initial: animation.initial || {},
      animate: animation.animate || {},
      exit: animation.exit || {},
    }

    if (!animateOnMount && !animationKey) {
      return <div className={className}>{children}</div>
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={animation.transition}
          className={className}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    )
  }
)

AnimatedPageWrapper.displayName = 'AnimatedPageWrapper'

export default AnimatedPageWrapper
